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
const messages_1 = require("@langchain/core/messages");
const llm_provider_1 = require("../common/llm.provider");
let ChatService = ChatService_1 = class ChatService {
    prisma;
    vector;
    knowledge;
    logger = new common_1.Logger(ChatService_1.name);
    llm = (0, llm_provider_1.createClaudeLlm)();
    constructor(prisma, vector, knowledge) {
        this.prisma = prisma;
        this.vector = vector;
        this.knowledge = knowledge;
    }
    async createSession(knowledgeBaseId, userId, title) {
        await this.knowledge.checkKbAccess(knowledgeBaseId, userId);
        return this.prisma.chatSession.create({
            data: { knowledgeBaseId, title: title ?? '新对话' },
        });
    }
    async listSessions(knowledgeBaseId, userId) {
        await this.knowledge.checkKbAccess(knowledgeBaseId, userId);
        return this.prisma.chatSession.findMany({
            where: { knowledgeBaseId },
            include: { _count: { select: { messages: true } } },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async getSessionMessages(sessionId, userId, kbId) {
        await this.knowledge.checkKbAccess(kbId, userId);
        return this.prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async renameSession(sessionId, userId, kbId, title) {
        await this.knowledge.checkKbAccess(kbId, userId);
        return this.prisma.chatSession.update({
            where: { id: sessionId },
            data: { title },
        });
    }
    async deleteSession(sessionId, userId, kbId) {
        await this.knowledge.checkKbAccess(kbId, userId);
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
            where: { id: sessionId },
            include: { knowledgeBase: true },
        });
        if (!session)
            throw new common_1.NotFoundException('会话不存在');
        await this.knowledge.checkKbAccess(session.knowledgeBaseId, userId);
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
        (0, llm_provider_1.setupSseHeaders)(res);
        let fullContent = '';
        try {
            const stream = await this.llm.stream(messages);
            for await (const chunk of stream) {
                const text = chunk.content;
                if (text) {
                    fullContent += text;
                    (0, llm_provider_1.sendSse)(res, { text });
                }
            }
            await this.prisma.chatMessage.create({
                data: { role: 'assistant', content: fullContent, sessionId },
            });
            await this.prisma.chatSession.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() },
            });
            (0, llm_provider_1.sendSse)(res, { done: true });
        }
        catch (err) {
            this.logger.error('RAG chat error', String(err));
            (0, llm_provider_1.sendSse)(res, { error: '生成失败，请重试' });
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