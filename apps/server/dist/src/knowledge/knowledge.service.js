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
    async checkKbAccess(kbId, userId) {
        const kb = await this.prisma.knowledgeBase.findUnique({
            where: { id: kbId },
            select: { userId: true, teamId: true },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        if (kb.userId === userId)
            return kb;
        if (kb.teamId) {
            const member = await this.prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: kb.teamId, userId } },
            });
            if (member)
                return kb;
        }
        throw new common_1.NotFoundException('知识库不存在');
    }
    async createKnowledgeBase(userId, name, description) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const count = await this.prisma.knowledgeBase.count({
                where: { userId },
            });
            if (count >= user.maxKnowledgeBases) {
                throw new common_1.BadRequestException(`知识库数量已达上限（${user.maxKnowledgeBases}个），请升级会员或删除旧知识库`);
            }
        }
        return this.prisma.knowledgeBase.create({
            data: { name, description, userId },
        });
    }
    async listKnowledgeBases(userId) {
        const teamMemberOf = await this.prisma.teamMember.findMany({
            where: { userId },
            select: { teamId: true },
        });
        const teamIds = teamMemberOf.map((m) => m.teamId);
        return this.prisma.knowledgeBase.findMany({
            where: {
                OR: [
                    { userId },
                    ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
                ],
            },
            include: {
                _count: { select: { documents: true } },
                team: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async renameKnowledgeBase(id, userId, name) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        return this.prisma.knowledgeBase.update({ where: { id }, data: { name } });
    }
    async updateKnowledgeBase(id, userId, data) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        return this.prisma.knowledgeBase.update({ where: { id }, data });
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
    async uploadDocument(knowledgeBaseId, userId, file, content, tags) {
        await this.checkKbAccess(knowledgeBaseId, userId);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const docCount = await this.prisma.document.count({
                where: { knowledgeBase: { userId } },
            });
            if (docCount >= user.maxDocuments) {
                throw new common_1.BadRequestException(`文档总数已达上限（${user.maxDocuments}个），请升级会员`);
            }
        }
        const existing = await this.prisma.document.findFirst({
            where: { knowledgeBaseId, originalName: file.originalname },
            orderBy: { version: 'desc' },
        });
        const version = existing ? existing.version + 1 : 1;
        const parentId = existing
            ? (existing.parentDocumentId ?? existing.id)
            : undefined;
        const doc = await this.prisma.document.create({
            data: {
                filename: file.filename ?? file.originalname,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                tags: tags ?? existing?.tags ?? '',
                version,
                parentDocumentId: parentId,
                knowledgeBaseId,
            },
        });
        const chunks = await this.splitter.splitText(content);
        await this.embedAndStore(doc.id, knowledgeBaseId, chunks);
        return { documentId: doc.id, chunkCount: chunks.length, version };
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
    async listDocuments(knowledgeBaseId, userId, tag, folder) {
        await this.checkKbAccess(knowledgeBaseId, userId);
        const where = { knowledgeBaseId };
        if (tag) {
            where.tags = { contains: tag };
        }
        if (folder) {
            where.folder = folder;
        }
        return this.prisma.document.findMany({
            where,
            include: { _count: { select: { chunks: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllFolders(knowledgeBaseId, userId) {
        await this.checkKbAccess(knowledgeBaseId, userId);
        const docs = await this.prisma.document.findMany({
            where: { knowledgeBaseId },
            select: { folder: true },
        });
        const folderSet = new Set();
        docs.forEach((d) => {
            if (d.folder)
                folderSet.add(d.folder);
        });
        const root = { name: '/', path: '/', children: [] };
        const nodeMap = new Map();
        nodeMap.set('/', root);
        const sortedFolders = Array.from(folderSet).sort();
        for (const folder of sortedFolders) {
            const parts = folder.split('/').filter(Boolean);
            let currentPath = '/';
            let parentNode = root;
            for (const part of parts) {
                const parentPath = currentPath;
                currentPath =
                    currentPath === '/' ? `/${part}/` : `${currentPath}${part}/`;
                if (!nodeMap.has(currentPath)) {
                    const newNode = {
                        name: part,
                        path: currentPath,
                        children: [],
                    };
                    nodeMap.set(currentPath, newNode);
                    parentNode.children.push(newNode);
                }
                parentNode = nodeMap.get(currentPath);
            }
        }
        return root;
    }
    async updateDocumentFolder(documentId, userId, folder) {
        const doc = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: { knowledgeBase: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        await this.checkKbAccess(doc.knowledgeBaseId, userId);
        let normalizedFolder = folder.trim();
        if (!normalizedFolder.startsWith('/'))
            normalizedFolder = '/' + normalizedFolder;
        if (!normalizedFolder.endsWith('/'))
            normalizedFolder = normalizedFolder + '/';
        if (normalizedFolder === '//')
            normalizedFolder = '/';
        return this.prisma.document.update({
            where: { id: documentId },
            data: { folder: normalizedFolder },
        });
    }
    async getAllTags(knowledgeBaseId, userId) {
        await this.checkKbAccess(knowledgeBaseId, userId);
        const docs = await this.prisma.document.findMany({
            where: { knowledgeBaseId },
            select: { tags: true },
        });
        const tagSet = new Set();
        docs.forEach((d) => {
            d.tags.split(',').forEach((t) => {
                const trimmed = t.trim();
                if (trimmed)
                    tagSet.add(trimmed);
            });
        });
        return Array.from(tagSet).sort();
    }
    async updateDocumentTags(documentId, userId, tags) {
        const doc = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: { knowledgeBase: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        await this.checkKbAccess(doc.knowledgeBaseId, userId);
        return this.prisma.document.update({
            where: { id: documentId },
            data: { tags },
        });
    }
    async hybridSearch(knowledgeBaseId, userId, query, topK = 5) {
        await this.checkKbAccess(knowledgeBaseId, userId);
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        const embedding = await this.getEmbedding(query);
        const vecResult = await this.vector.query(`kb_${knowledgeBaseId}`, embedding, topK * 2);
        const ftsResults = await this.prisma.documentChunk.findMany({
            where: {
                document: { knowledgeBaseId },
                content: { contains: query },
            },
            take: topK * 2,
            orderBy: { createdAt: 'desc' },
            include: { document: { select: { originalName: true } } },
        });
        const merged = new Map();
        vecResult.documents.forEach((content, i) => {
            const docName = vecResult.metadatas?.[i]?.documentId ?? '';
            const key = content.slice(0, 80);
            merged.set(key, {
                content,
                documentName: docName,
                score: 1 / (60 + i + 1),
            });
        });
        ftsResults.forEach((chunk, i) => {
            const key = chunk.content.slice(0, 80);
            const existing = merged.get(key);
            const rrfScore = 1 / (60 + i + 1);
            if (existing) {
                existing.score += rrfScore;
            }
            else {
                merged.set(key, {
                    content: chunk.content,
                    documentName: chunk.document.originalName,
                    score: rrfScore,
                });
            }
        });
        const ranked = Array.from(merged.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        const docIds = [
            ...new Set(ranked
                .map((r) => r.documentName)
                .filter((n) => !n.includes('.') && n.length > 10)),
        ];
        const docMap = new Map();
        if (docIds.length) {
            const docs = await this.prisma.document.findMany({
                where: { id: { in: docIds } },
                select: { id: true, originalName: true },
            });
            docs.forEach((d) => docMap.set(d.id, d.originalName));
        }
        return {
            query,
            mode: 'hybrid',
            chunks: ranked.map((r) => ({
                content: r.content,
                documentName: docMap.get(r.documentName) ?? r.documentName,
                score: parseFloat(r.score.toFixed(4)),
            })),
        };
    }
    async searchDocuments(knowledgeBaseId, userId, query, topK = 5) {
        return this.hybridSearch(knowledgeBaseId, userId, query, topK);
    }
    async getDocumentContent(documentId, userId) {
        const doc = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: {
                chunks: { orderBy: { chunkIndex: 'asc' } },
                knowledgeBase: true,
            },
        });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        await this.checkKbAccess(doc.knowledgeBaseId, userId);
        return {
            id: doc.id,
            originalName: doc.originalName,
            tags: doc.tags,
            content: doc.chunks.map((c) => c.content).join('\n'),
            chunkCount: doc.chunks.length,
        };
    }
    async getDocumentVersions(documentId, userId) {
        const doc = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: { knowledgeBase: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        await this.checkKbAccess(doc.knowledgeBaseId, userId);
        const rootId = doc.parentDocumentId ?? doc.id;
        return this.prisma.document.findMany({
            where: {
                knowledgeBase: { userId },
                OR: [{ id: rootId }, { parentDocumentId: rootId }],
            },
            select: {
                id: true,
                originalName: true,
                version: true,
                size: true,
                _count: { select: { chunks: true } },
                createdAt: true,
            },
            orderBy: { version: 'asc' },
        });
    }
    async getKnowledgeGraph(knowledgeBaseId, userId) {
        await this.checkKbAccess(knowledgeBaseId, userId);
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        await this.checkKbAccess(knowledgeBaseId, userId);
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        const docs = await this.prisma.document.findMany({
            where: { knowledgeBaseId },
            select: { id: true, originalName: true, tags: true },
            orderBy: { createdAt: 'desc' },
        });
        const nodes = docs.slice(0, 20).map((d) => ({
            id: d.id,
            name: d.originalName.length > 20
                ? d.originalName.slice(0, 20) + '...'
                : d.originalName,
            symbolSize: Math.min(40, 20 + (d.tags?.split(',').filter(Boolean).length ?? 0) * 8),
            tags: d.tags,
        }));
        const links = [];
        for (let i = 0; i < nodes.length; i++) {
            const tagsI = (nodes[i].tags ?? '')
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            for (let j = i + 1; j < nodes.length; j++) {
                const tagsJ = (nodes[j].tags ?? '')
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                const common = tagsI.filter((t) => tagsJ.includes(t));
                if (common.length > 0) {
                    links.push({
                        source: nodes[i].id,
                        target: nodes[j].id,
                        value: common.length,
                    });
                }
            }
        }
        return { nodes, links };
    }
    async renameDocument(documentId, userId, newName) {
        const doc = await this.prisma.document.findFirst({
            where: { id: documentId, knowledgeBase: { userId } },
        });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        return this.prisma.document.update({
            where: { id: documentId },
            data: { originalName: newName },
        });
    }
    async updateDocumentContent(documentId, userId, content) {
        const doc = await this.prisma.document.findFirst({
            where: { id: documentId, knowledgeBase: { userId } },
            include: { chunks: true, knowledgeBase: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        const collectionName = `kb_${doc.knowledgeBaseId}`;
        const oldIds = doc.chunks.map((c) => c.vectorId);
        if (oldIds.length)
            await this.vector.deleteByIds(collectionName, oldIds);
        await this.prisma.documentChunk.deleteMany({ where: { documentId } });
        const chunks = await this.splitter.splitText(content);
        await this.embedAndStore(documentId, doc.knowledgeBaseId, chunks);
        return { chunkCount: chunks.length };
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
    async getSuggestedQuestions(knowledgeBaseId, userId) {
        await this.checkKbAccess(knowledgeBaseId, userId);
        const chunks = await this.prisma.documentChunk.findMany({
            where: { document: { knowledgeBaseId } },
            orderBy: { id: 'asc' },
            take: 200,
        });
        if (chunks.length === 0)
            return { questions: [] };
        const shuffled = chunks.sort(() => Math.random() - 0.5).slice(0, 5);
        const context = shuffled.map((c) => c.content).join('\n\n---\n\n');
        const { ChatOpenAI } = await import('@langchain/openai');
        const llm = new ChatOpenAI({
            model: 'gpt-4o-mini',
            temperature: 0.8,
            maxTokens: 500,
        });
        const { HumanMessage, SystemMessage } = await import('@langchain/core/messages');
        const res = await llm.invoke([
            new SystemMessage(`你是一个知识库助手。根据以下文档内容，生成 5 个用户可能会问的高质量问题。
要求：
1. 问题要具体、有价值，不要泛泛而谈
2. 问题要基于文档内容，不要编造
3. 每个问题一行，不要编号，不要多余的解释
4. 用中文提问`),
            new HumanMessage(`文档内容：\n${context}`),
        ]);
        const text = typeof res.content === 'string' ? res.content : '';
        const questions = text
            .split('\n')
            .map((line) => line.replace(/^\d+[.、)\]】]\s*/, '').trim())
            .filter((q) => q.length > 5 && q.length < 100)
            .slice(0, 5);
        return { questions };
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vector_service_1.VectorService])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map