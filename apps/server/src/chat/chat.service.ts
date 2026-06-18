import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TokenUsageService } from '../common/token-usage.service';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { createLlm, setupSseHeaders, sendSse } from '../common/llm.provider';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private vector: VectorService,
    private knowledge: KnowledgeService,
    private tokenUsage: TokenUsageService,
  ) {}

  async createSession(knowledgeBaseId: string, userId: string, title?: string) {
    await this.knowledge.checkKbAccess(knowledgeBaseId, userId);

    return this.prisma.chatSession.create({
      data: { knowledgeBaseId, title: title ?? '新对话' },
    });
  }

  async listSessions(knowledgeBaseId: string, userId: string) {
    await this.knowledge.checkKbAccess(knowledgeBaseId, userId);

    return this.prisma.chatSession.findMany({
      where: { knowledgeBaseId },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSessionMessages(sessionId: string, userId: string, kbId: string) {
    await this.knowledge.checkKbAccess(kbId, userId);
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async renameSession(sessionId: string, userId: string, kbId: string, title: string) {
    await this.knowledge.checkKbAccess(kbId, userId);
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
    });
  }

  async deleteSession(sessionId: string, userId: string, kbId: string) {
    await this.knowledge.checkKbAccess(kbId, userId);
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
  }

  // ---- 消息反馈 ----
  async feedbackMessage(
    messageId: string,
    userId: string,
    type: 'like' | 'dislike',
    comment?: string,
  ) {
    // 同用户同消息只保留一条反馈（upsert 逻辑）
    const existing = await this.prisma.messageFeedback.findFirst({
      where: { messageId, userId },
    });
    if (existing) {
      return this.prisma.messageFeedback.update({
        where: { id: existing.id },
        data: { type, comment },
      });
    }
    return this.prisma.messageFeedback.create({
      data: { messageId, userId, type, comment },
    });
  }

  async getMessageFeedback(messageId: string) {
    const list = await this.prisma.messageFeedback.findMany({
      where: { messageId },
    });
    const likes = list.filter((f) => f.type === 'like').length;
    const dislikes = list.filter((f) => f.type === 'dislike').length;
    return { likes, dislikes, total: list.length, list };
  }

  // RAG 问答核心流程，通过 SSE 流式返回结果
  async chatStream(
    sessionId: string,
    userId: string,
    question: string,
    res: Response,
    model?: string,
  ) {
    // 检查 token 用量是否超限
    const tokenCheck = await this.tokenUsage.checkTokenLimit(userId);
    if (!tokenCheck.allowed) {
      setupSseHeaders(res);
      sendSse(res, { error: `本月 Token 用量已达到上限（${tokenCheck.used.toLocaleString()} / ${tokenCheck.limit.toLocaleString()}），请升级会员或下月再试` });
      res.end();
      return;
    }

    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId },
      include: { knowledgeBase: true },
    });
    if (!session) throw new NotFoundException('会话不存在');
    // 验证用户对 KB 的访问权（团队共享兼容）
    await this.knowledge.checkKbAccess(session.knowledgeBaseId, userId);

    // 解析标记：联网搜索
    let enableWebSearch = false;
    let actualQuestion = question;
    if (question.startsWith('[联网搜索]')) {
      enableWebSearch = true;
      actualQuestion = question.replace('[联网搜索]', '').trim();
    }

    // 1. 从数据库加载历史消息，构建 Memory 上下文
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      // 只取最近 10 条，避免 context 过长
      take: 10,
    });

    // 2. 将用户问题向量化，在 Chroma 中检索相关文档块
    const queryVec = await this.knowledge.getEmbedding(actualQuestion);
    const retrieved = await this.vector.query(
      `kb_${session.knowledgeBaseId}`,
      queryVec,
      5,
    );

    // 3. 将检索到的文档块拼接为上下文
    const kbContext = retrieved.documents
      .filter(Boolean)
      .join('\n\n---\n\n');

    // 4. 如果开启了联网搜索，同时搜索互联网
    let webContext = '';
    if (enableWebSearch) {
      try {
        const { webSearch } = await import('../common/web-search.js');
        const results = await webSearch(actualQuestion, 5);
        if (results.length > 0) {
          webContext = results
            .map((r, i) => `[网页${i + 1}] ${r.title}\n${r.description}`)
            .join('\n\n');
        }
      } catch {
        // 联网搜索失败不阻断流程
      }
    }

    // 5. 构建消息列表：系统提示 + 历史对话 + 当前问题
    const systemPrompt = `你是一个专业的知识库问答助手。请根据以下参考资料回答用户问题。
如果参考资料中没有相关信息，请如实告知，不要编造答案。
${webContext ? '\n\n以下是互联网搜索结果，可作为补充参考：\n' + webContext : ''}

参考资料：
${kbContext}`;

    const messages = [
      new SystemMessage(systemPrompt),
      // 将数据库中的历史消息转换为 LangChain 消息格式
      ...history.map((m) =>
        m.role === 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      ),
      new HumanMessage(actualQuestion),
    ];

    // 5. 保存用户消息到数据库（保存实际问题，不带标记）
    await this.prisma.chatMessage.create({
      data: { role: 'user', content: actualQuestion, sessionId },
    });

    // 6. 设置 SSE 响应头
    setupSseHeaders(res);

    // 7. 流式调用 LLM，逐 token 推送给前端
    const llm = createLlm(model);
    const modelName = model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const stream = await llm.stream(messages);
      for await (const chunk of stream) {
        const text = chunk.content as string;
        if (text) {
          fullContent += text;
          sendSse(res, { text });
        }
        // 累计 token 用量
        if (chunk.usage_metadata) {
          inputTokens = chunk.usage_metadata.input_tokens ?? inputTokens;
          outputTokens += chunk.usage_metadata.output_tokens ?? 0;
        }
      }

      // 8. 流结束后保存完整的 AI 回复到数据库
      await this.prisma.chatMessage.create({
        data: { role: 'assistant', content: fullContent, sessionId },
      });

      // 更新会话的 updatedAt
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      // 记录 token 用量（估算：问题 token 约为输入 token 的一部分）
      if (inputTokens > 0 || outputTokens > 0) {
        const estimatedInput = inputTokens || Math.ceil(fullContent.length / 3);
        const estimatedOutput = outputTokens || Math.ceil(fullContent.length / 3);
        this.tokenUsage.record(userId, modelName, estimatedInput, estimatedOutput).catch(() => null);
      }

      sendSse(res, { done: true });
    } catch (err) {
      this.logger.error('RAG chat error', String(err));
      sendSse(res, { error: '生成失败，请重试' });
    } finally {
      res.end();
    }
  }
}
