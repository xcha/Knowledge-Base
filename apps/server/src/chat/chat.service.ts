import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

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

  async createSession(knowledgeBaseId: string, userId: string, title?: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');

    return this.prisma.chatSession.create({
      data: { knowledgeBaseId, title: title ?? '新对话' },
    });
  }

  async listSessions(knowledgeBaseId: string, userId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');

    return this.prisma.chatSession.findMany({
      where: { knowledgeBaseId },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSessionMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteSession(sessionId: string) {
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
  }

  // RAG 问答核心流程，通过 SSE 流式返回结果
  async chatStream(
    sessionId: string,
    userId: string,
    question: string,
    res: Response,
  ) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, knowledgeBase: { userId } },
      include: { knowledgeBase: true },
    });
    if (!session) throw new NotFoundException('会话不存在');

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
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 7. 流式调用 Claude，逐 token 推送给前端
    let fullContent = '';
    try {
      const stream = await this.llm.stream(messages);
      for await (const chunk of stream) {
        const text = chunk.content as string;
        if (text) {
          fullContent += text;
          // SSE 格式：data: <内容>\n\n
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
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

      // 发送结束信号
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      this.logger.error('RAG chat error', String(err));
      res.write(`data: ${JSON.stringify({ error: '生成失败，请重试' })}\n\n`);
    } finally {
      res.end();
    }
  }
}
