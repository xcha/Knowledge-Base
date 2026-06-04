"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const vector_service_1 = require("../vector/vector.service");
const knowledge_service_1 = require("../knowledge/knowledge.service");
const anthropic_1 = require("@langchain/anthropic");
const messages_1 = require("@langchain/core/messages");
let ChatService = ChatService_1 = class ChatService {
    prisma;
    vector;
    knowledge;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(prisma, vector, knowledge) {
        this.prisma = prisma;
        this.vector = vector;
        this.knowledge = knowledge;
    }
    llm = new anthropic_1.ChatAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-6',
        clientOptions: {
            baseURL: process.env.ANTHROPIC_BASE_URL,
            defaultHeaders: {
                Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
            },
        },
    });
    async createSession(knowledgeBaseId, userId, title) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        return this.prisma.chatSession.create({
            data: { knowledgeBaseId, title: title ?? '新对话' },
        });
    }
    async listSessions(knowledgeBaseId, userId) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        return this.prisma.chatSession.findMany({
            where: { knowledgeBaseId },
            include: { _count: { select: { messages: true } } },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async getSessionMessages(sessionId) {
        return this.prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async renameSession(sessionId, title) {
        return this.prisma.chatSession.update({
            where: { id: sessionId },
            data: { title },
        });
    }
    async deleteSession(sessionId) {
        await this.prisma.chatSession.delete({ where: { id: sessionId } });
    }
    async feedbackMessage(messageId, userId, type, comment) {
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
    async getMessageFeedback(messageId) {
        const list = await this.prisma.messageFeedback.findMany({
            where: { messageId },
        });
        const likes = list.filter((f) => f.type === 'like').length;
        const dislikes = list.filter((f) => f.type === 'dislike').length;
        return { likes, dislikes, total: list.length, list };
    }
    async chatStream(sessionId, userId, question, res) {
        const session = await this.prisma.chatSession.findFirst({
            where: { id: sessionId, knowledgeBase: { userId } },
            include: { knowledgeBase: true },
        });
        if (!session)
            throw new common_1.NotFoundException('会话不存在');
        const history = await this.prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            take: 10,
        });
        const queryVec = await this.knowledge.getEmbedding(question);
        const retrieved = await this.vector.query(`kb_${session.knowledgeBaseId}`, queryVec, 5);
        const context = retrieved.documents
            .filter(Boolean)
            .join('\n\n---\n\n');
        const messages = [
            new messages_1.SystemMessage(`你是一个专业的知识库问答助手。请根据以下参考资料回答用户问题。
如果参考资料中没有相关信息，请如实告知，不要编造答案。

参考资料：
${context}`),
            ...history.map((m) => m.role === 'user'
                ? new messages_1.HumanMessage(m.content)
                : new messages_1.AIMessage(m.content)),
            new messages_1.HumanMessage(question),
        ];
        await this.prisma.chatMessage.create({
            data: { role: 'user', content: question, sessionId },
        });
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        let fullContent = '';
        try {
            const stream = await this.llm.stream(messages);
            for await (const chunk of stream) {
                const text = chunk.content;
                if (text) {
                    fullContent += text;
                    res.write(`data: ${JSON.stringify({ text })}\n\n`);
                }
            }
            await this.prisma.chatMessage.create({
                data: { role: 'assistant', content: fullContent, sessionId },
            });
            await this.prisma.chatSession.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() },
            });
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
        catch (err) {
            this.logger.error('RAG chat error', String(err));
            res.write(`data: ${JSON.stringify({ error: '生成失败，请重试' })}\n\n`);
        }
        finally {
            res.end();
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vector_service_1.VectorService,
        knowledge_service_1.KnowledgeService])
], ChatService);
//# sourceMappingURL=chat.service.js.map