import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { buildAgentTools } from './agent.tools';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private prisma: PrismaService,
    private vector: VectorService,
    private knowledge: KnowledgeService,
  ) {}

  private llm = new ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-6',
    clientOptions: {
      baseURL: process.env.ANTHROPIC_BASE_URL,
      defaultHeaders: {
        Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
      },
    },
  });

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
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');

    // 构建工具集，注入当前知识库 ID
    const tools = buildAgentTools(
      knowledgeBaseId,
      this.knowledge,
      this.vector,
      this.prisma,
    );

    // 每次请求创建新的 Agent 实例，工具绑定了具体的 knowledgeBaseId
    const agent = createReactAgent({
      llm: this.llm,
      tools,
      // 系统提示：告诉 Agent 它的角色和工具使用策略
      prompt: `你是一个专业的知识库问答助手。
        你有以下工具可以使用：
        - search_knowledge：在知识库中检索相关内容
        - get_document_list：查看知识库中有哪些文档

        回答策略：
        1. 如果问题需要查找具体信息，先调用 search_knowledge
        2. 如果用户询问有哪些文档，调用 get_document_list
        3. 如果问题是通用知识，可以直接回答
        4. 基于检索结果给出准确、有依据的回答`,
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
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullContent = '';

    try {
      // streamEvents 可以监听 Agent 内部每一步的事件：
      // - on_chat_model_stream：LLM 生成 token
      // - on_tool_start / on_tool_end：工具调用开始/结束
      const eventStream = agent.streamEvents({ messages }, { version: 'v2' });

      for await (const event of eventStream) {
        if (
          event.event === 'on_chat_model_stream' &&
          event.data?.chunk?.content
        ) {
          const raw = event.data.chunk.content;
          // Claude returns content as [{type:'text', text:'...'}] blocks, not a plain string
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
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        // 工具调用时通知前端，让用户看到 Agent 正在"思考"
        if (event.event === 'on_tool_start') {
          res.write(
            `data: ${JSON.stringify({
              toolCall: { name: event.name, input: event.data?.input },
            })}\n\n`,
          );
        }

        if (event.event === 'on_tool_end') {
          res.write(
            `data: ${JSON.stringify({ toolResult: { name: event.name } })}\n\n`,
          );
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

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      this.logger.error('Agent error', String(err));
      res.write(
        `data: ${JSON.stringify({ error: 'Agent 执行失败，请重试' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
