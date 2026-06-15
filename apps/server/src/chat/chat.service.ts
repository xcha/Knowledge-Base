import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { createLlm, setupSseHeaders, sendSse } from '../common/llm.provider';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private vector: VectorService,
    private knowledge: KnowledgeService,
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
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId },
      include: { knowledgeBase: true },
    });
    if (!session) throw new NotFoundException('会话不存在');
    // 验证用户对 KB 的访问权（团队共享兼容）
    await this.knowledge.checkKbAccess(session.knowledgeBaseId, userId);

    // 1. 从数据库加载历史消息，构建 Memory 上下文
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      // 只取最近 10 条，避免 context 过长
      take: 10,
    });

    // 2. 将用户问题向量化，在 Chroma 中检索相关文档块
    const queryVec = await this.knowledge.getEmbedding(question);
    const retrieved = await this.vector.query(
      `kb_${session.knowledgeBaseId}`,
      queryVec,
      5,
    );

    // 3. 将检索到的文档块拼接为上下文
    const context = retrieved.documents
      .filter(Boolean)
      .join('\n\n---\n\n');

    // 4. 构建消息列表：系统提示 + 历史对话 + 当前问题
    const messages = [
      new SystemMessage(
        `你是一个专业的知识库问答助手。请根据以下参考资料回答用户问题。
如果参考资料中没有相关信息，请如实告知，不要编造答案。

参考资料：
${context}`,
      ),
      // 将数据库中的历史消息转换为 LangChain 消息格式
      ...history.map((m) =>
        m.role === 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      ),
      new HumanMessage(question),
    ];

    // 5. 保存用户消息到数据库
    await this.prisma.chatMessage.create({
      data: { role: 'user', content: question, sessionId },
    });

    // 6. 设置 SSE 响应头
    setupSseHeaders(res);

    // 7. 流式调用 LLM，逐 token 推送给前端
    const llm = createLlm(model);
    let fullContent = '';
    try {
      const stream = await llm.stream(messages);
      for await (const chunk of stream) {
        const text = chunk.content as string;
        if (text) {
          fullContent += text;
          sendSse(res, { text });
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

      sendSse(res, { done: true });
    } catch (err) {
      this.logger.error('RAG chat error', String(err));
      sendSse(res, { error: '生成失败，请重试' });
    } finally {
      res.end();
    }
  }
}
