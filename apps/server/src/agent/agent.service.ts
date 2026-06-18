import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TokenUsageService } from '../common/token-usage.service';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { buildAgentTools } from './agent.tools';
import { createClaudeLlm, setupSseHeaders, sendSse } from '../common/llm.provider';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly llm = createClaudeLlm();

  constructor(
    private prisma: PrismaService,
    private vector: VectorService,
    private knowledge: KnowledgeService,
    private tokenUsage: TokenUsageService,
  ) {}

  /**
   * Agent 流式问答核心流程：
   *
   * 与普通 RAG 的区别：
   *  - RAG：每次都强制检索向量库，把结果塞进 prompt
   *  - Agent：模型自己决定是否调用工具，可以多轮工具调用，
   *           适合需要推理、多步骤查询的复杂问题
   *
   * 流程：用户问题 → Agent 判断 → 调用工具（可选）→ 生成回答 → SSE 推送
   */
  async agentStream(
    knowledgeBaseId: string,
    userId: string,
    question: string,
    sessionId: string | undefined,
    res: Response,
  ) {
    // 检查 token 用量是否超限
    const tokenCheck = await this.tokenUsage.checkTokenLimit(userId);
    if (!tokenCheck.allowed) {
      setupSseHeaders(res);
      sendSse(res, { error: `本月 Token 用量已达到上限（${tokenCheck.used.toLocaleString()} / ${tokenCheck.limit.toLocaleString()}），请升级会员或下月再试` });
      res.end();
      return;
    }

    await this.knowledge.checkKbAccess(knowledgeBaseId, userId);

    // 构建工具集，注入当前知识库 ID
    const tools = buildAgentTools(
      knowledgeBaseId,
      this.knowledge,
      this.vector,
      this.prisma,
      userId,
    );

    // 每次请求创建新的 Agent 实例，工具绑定了具体的 knowledgeBaseId
    const agent = createReactAgent({
      llm: this.llm,
      tools,
      // 系统提示：告诉 Agent 它的角色和工具使用策略
      prompt: `你是一个专业的知识库问答助手。
        你有以下工具可以使用：
        - search_knowledge：在知识库中检索相关内容
        - get_document_list：查看知识库中有哪些文档（含ID和标签）
        - get_document_content：获取指定文档的完整文本内容
        - web_search：联网搜索互联网获取最新信息
        - generate_mind_map：根据知识库内容生成思维导图

        回答策略：
        1. 如果问题需要查找具体信息，先调用 search_knowledge
        2. 如果用户询问有哪些文档，调用 get_document_list
        3. 如果用户要求总结/概括/摘要某文档，先 get_document_list 拿到文档ID，再调 get_document_content 获取全文，最后生成摘要
        4. 如果知识库中找不到答案，或问题涉及时事/最新资讯，调用 web_search 联网搜索
        5. 如果用户要求画思维导图/脑图/整理知识结构，调用 generate_mind_map
        6. 如果问题是通用知识，可以直接回答
        7. 基于检索结果给出准确、有依据的回答`,
    });

    // 加载历史消息（如果有 sessionId）
    const history = sessionId
      ? await this.prisma.chatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 10,
        })
      : [];

    const messages = [
      ...history.map((m) =>
        m.role === 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      ),
      new HumanMessage(question),
    ];

    // 保存用户消息
    if (sessionId) {
      await this.prisma.chatMessage.create({
        data: { role: 'user', content: question, sessionId },
      });
    }

    // 设置 SSE 响应头
    setupSseHeaders(res);

    let fullContent = '';

    try {
      const eventStream = agent.streamEvents({ messages }, { version: 'v2' });

      for await (const event of eventStream) {
        if (
          event.event === 'on_chat_model_stream' &&
          event.data?.chunk?.content
        ) {
          const raw = event.data.chunk.content;
          let text = '';
          if (typeof raw === 'string') {
            text = raw;
          } else if (Array.isArray(raw)) {
            text = (raw as Array<{ type: string; text?: string }>)
              .filter((b) => b.type === 'text' && b.text)
              .map((b) => b.text!)
              .join('');
          }
          if (text) {
            fullContent += text;
            sendSse(res, { text });
          }
        }

        if (event.event === 'on_tool_start') {
          sendSse(res, { toolCall: { name: event.name, input: event.data?.input } });
        }

        if (event.event === 'on_tool_end') {
          sendSse(res, { toolResult: { name: event.name } });
        }
      }

      // 保存 AI 回复
      if (sessionId && fullContent) {
        await this.prisma.chatMessage.create({
          data: { role: 'assistant', content: fullContent, sessionId },
        });
        await this.prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        });
      }

      // 记录 token 用量（Agent 模式估算）
      if (fullContent) {
        const estimatedInput = Math.ceil(question.length / 3) + 200; // 加上系统提示的开销
        const estimatedOutput = Math.ceil(fullContent.length / 3);
        this.tokenUsage.record(userId, 'claude-sonnet-4-6', estimatedInput, estimatedOutput).catch(() => null);
      }

      sendSse(res, { done: true });
    } catch (err) {
      this.logger.error('Agent error', String(err));
      sendSse(res, { error: 'Agent 执行失败，请重试' });
    } finally {
      res.end();
    }
  }
}
