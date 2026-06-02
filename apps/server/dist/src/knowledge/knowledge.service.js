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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const vector_service_1 = require("../vector/vector.service");
const textsplitters_1 = require("@langchain/textsplitters");
const voyage_1 = require("@langchain/community/embeddings/voyage");
let KnowledgeService = class KnowledgeService {
    prisma;
    vector;
    constructor(prisma, vector) {
        this.prisma = prisma;
        this.vector = vector;
    }
    splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
        separators: ['\n\n', '\n', '。', '！', '？', '；', ' ', ''],
    });
    embedder = new voyage_1.VoyageEmbeddings({
        apiKey: process.env.VOYAGE_API_KEY,
        modelName: 'voyage-3-lite',
    });
    async createKnowledgeBase(userId, name, description) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const count = await this.prisma.knowledgeBase.count({ where: { userId } });
            if (count >= user.maxKnowledgeBases) {
                throw new common_1.BadRequestException(`知识库数量已达上限（${user.maxKnowledgeBases}个），请升级会员或删除旧知识库`);
            }
        }
        return this.prisma.knowledgeBase.create({
            data: { name, description, userId },
        });
    }
    async listKnowledgeBases(userId) {
        return this.prisma.knowledgeBase.findMany({
            where: { userId },
            include: { _count: { select: { documents: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteKnowledgeBase(id, userId) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        await this.vector.deleteCollection(`kb_${id}`).catch(() => null);
        await this.prisma.knowledgeBase.delete({ where: { id } });
    }
    async uploadDocument(knowledgeBaseId, userId, file, content) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const docCount = await this.prisma.document.count({ where: { knowledgeBase: { userId } } });
            if (docCount >= user.maxDocuments) {
                throw new common_1.BadRequestException(`文档总数已达上限（${user.maxDocuments}个），请升级会员`);
            }
        }
        const doc = await this.prisma.document.create({
            data: {
                filename: file.filename ?? file.originalname,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                knowledgeBaseId,
            },
        });
        const chunks = await this.splitter.splitText(content);
        await this.embedAndStore(doc.id, knowledgeBaseId, chunks);
        return { documentId: doc.id, chunkCount: chunks.length };
    }
    async embedAndStore(documentId, knowledgeBaseId, chunks) {
        const collectionName = `kb_${knowledgeBaseId}`;
        const embeddings = await this.embedder.embedDocuments(chunks);
        const ids = chunks.map((_, i) => `${documentId}_chunk_${i}`);
        const metadatas = chunks.map((_, i) => ({
            documentId,
            knowledgeBaseId,
            chunkIndex: String(i),
        }));
        await this.vector.addDocuments(collectionName, ids, embeddings, chunks, metadatas);
        await this.prisma.documentChunk.createMany({
            data: chunks.map((content, i) => ({
                content,
                vectorId: ids[i],
                chunkIndex: i,
                documentId,
            })),
        });
    }
    async getEmbedding(text) {
        return this.embedder.embedQuery(text);
    }
    async listDocuments(knowledgeBaseId, userId) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        return this.prisma.document.findMany({
            where: { knowledgeBaseId },
            include: { _count: { select: { chunks: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async searchDocuments(knowledgeBaseId, userId, query, topK = 5) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        const embedding = await this.getEmbedding(query);
        const result = await this.vector.query(`kb_${knowledgeBaseId}`, embedding, topK);
        const documentIds = [
            ...new Set(result.metadatas
                .map((m) => m?.documentId)
                .filter(Boolean)),
        ];
        const docMap = new Map();
        if (documentIds.length) {
            const docs = await this.prisma.document.findMany({
                where: { id: { in: documentIds } },
                select: { id: true, originalName: true },
            });
            docs.forEach((d) => docMap.set(d.id, d.originalName));
        }
        return {
            chunks: result.documents.map((content, i) => ({
                content,
                documentName: docMap.get(result.metadatas[i]?.documentId ?? '') ?? '未知文档',
                score: result.distances ? 1 - (result.distances[i] ?? 0) : 0,
            })),
        };
    }
    async deleteDocument(documentId, userId) {
        const doc = await this.prisma.document.findFirst({
            where: { id: documentId, knowledgeBase: { userId } },
            include: { chunks: true, knowledgeBase: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        const vectorIds = doc.chunks.map((c) => c.vectorId);
        if (vectorIds.length > 0) {
            await this.vector.deleteByIds(`kb_${doc.knowledgeBaseId}`, vectorIds);
        }
        await this.prisma.document.delete({ where: { id: documentId } });
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vector_service_1.VectorService])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map