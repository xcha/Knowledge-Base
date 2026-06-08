import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private vector: VectorService,
  ) {}

  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: ['\n\n', '\n', '。', '！', '？', '；', ' ', ''],
  });

  private embedder = new VoyageEmbeddings({
    apiKey: process.env.VOYAGE_API_KEY,
    modelName: 'voyage-3-lite',
  });

  // 检查用户是否有权访问知识库（所有者或团队成员）
  async checkKbAccess(kbId: string, userId: string) {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: kbId },
      select: { userId: true, teamId: true },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    if (kb.userId === userId) return kb;
    // 检查是否是团队成员
    if (kb.teamId) {
      const member = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: kb.teamId, userId } },
      });
      if (member) return kb;
    }
    throw new NotFoundException('知识库不存在');
  }

  async createKnowledgeBase(userId: string, name: string, description?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const count = await this.prisma.knowledgeBase.count({ where: { userId } });
      if (count >= user.maxKnowledgeBases) {
        throw new BadRequestException(
          `知识库数量已达上限（${user.maxKnowledgeBases}个），请升级会员或删除旧知识库`,
        );
      }
    }
    return this.prisma.knowledgeBase.create({ data: { name, description, userId } });
  }

  async listKnowledgeBases(userId: string) {
    // 用户自己的 KB + 所属团队共享的 KB
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

  async renameKnowledgeBase(id: string, userId: string, name: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({ where: { id, userId } });
    if (!kb) throw new NotFoundException('知识库不存在');
    return this.prisma.knowledgeBase.update({ where: { id }, data: { name } });
  }

  async updateKnowledgeBase(
    id: string,
    userId: string,
    data: { name?: string; description?: string },
  ) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    return this.prisma.knowledgeBase.update({ where: { id }, data });
  }

  async deleteKnowledgeBase(id: string, userId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({ where: { id, userId } });
    if (!kb) throw new NotFoundException('知识库不存在');
    await this.vector.deleteCollection(`kb_${id}`).catch(() => null);
    await this.prisma.knowledgeBase.delete({ where: { id } });
  }

  async uploadDocument(
    knowledgeBaseId: string,
    userId: string,
    file: Express.Multer.File,
    content: string,
    tags?: string,
  ) {
    await this.checkKbAccess(knowledgeBaseId, userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const docCount = await this.prisma.document.count({
        where: { knowledgeBase: { userId } },
      });
      if (docCount >= user.maxDocuments) {
        throw new BadRequestException(`文档总数已达上限（${user.maxDocuments}个），请升级会员`);
      }
    }

    // 版本管理：如果已有同名文档，自动创建新版本
    const existing = await this.prisma.document.findFirst({
      where: { knowledgeBaseId, originalName: file.originalname },
      orderBy: { version: 'desc' },
    });

    const version = existing ? existing.version + 1 : 1;
    const parentId = existing ? (existing.parentDocumentId ?? existing.id) : undefined;

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

  private async embedAndStore(documentId: string, knowledgeBaseId: string, chunks: string[]) {
    const collectionName = `kb_${knowledgeBaseId}`;
    const embeddings = await this.embedder.embedDocuments(chunks);
    const ids = chunks.map((_, i) => `${documentId}_chunk_${i}`);
    const metadatas = chunks.map((_, i) => ({
      documentId, knowledgeBaseId, chunkIndex: String(i),
    }));
    await this.vector.addDocuments(collectionName, ids, embeddings, chunks, metadatas);
    await this.prisma.documentChunk.createMany({
      data: chunks.map((content, i) => ({
        content, vectorId: ids[i], chunkIndex: i, documentId,
      })),
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    return this.embedder.embedQuery(text);
  }

  // ---- 文档列表（支持标签筛选）----
  async listDocuments(knowledgeBaseId: string, userId: string, tag?: string) {
    await this.checkKbAccess(knowledgeBaseId, userId);

    const where: any = { knowledgeBaseId };
    // 标签筛选：tags 字段是逗号分隔的字符串，用 contains 模糊匹配
    if (tag) {
      where.tags = { contains: tag };
    }

    return this.prisma.document.findMany({
      where,
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- 获取知识库所有标签 ----
  async getAllTags(knowledgeBaseId: string, userId: string) {
    await this.checkKbAccess(knowledgeBaseId, userId);

    const docs = await this.prisma.document.findMany({
      where: { knowledgeBaseId },
      select: { tags: true },
    });

    // 从所有文档的 tags 字段中提取并去重
    const tagSet = new Set<string>();
    docs.forEach((d) => {
      d.tags.split(',').forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    });
    return Array.from(tagSet).sort();
  }

  // ---- 更新文档标签 ----
  async updateDocumentTags(documentId: string, userId: string, tags: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId },
      include: { knowledgeBase: true },
    });
    if (!doc) throw new NotFoundException('文档不存在');
    await this.checkKbAccess(doc.knowledgeBaseId, userId);
    return this.prisma.document.update({
      where: { id: documentId },
      data: { tags },
    });
  }

  // ========== 混合搜索：向量 + 全文，RRF 融合 ==========
  async hybridSearch(
    knowledgeBaseId: string,
    userId: string,
    query: string,
    topK = 5,
  ) {
    
    await this.checkKbAccess(knowledgeBaseId, userId);

    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');

    // 第1路：向量语义检索（Chroma）
    const embedding = await this.getEmbedding(query);
    const vecResult = await this.vector.query(`kb_${knowledgeBaseId}`, embedding, topK * 2);

    // 第2路：PostgreSQL 全文模糊检索（pg_trgm）
    const ftsResults = await this.prisma.documentChunk.findMany({
      where: {
        document: { knowledgeBaseId },
        content: { contains: query }, // pg_trgm 支撑的模糊匹配
      },
      take: topK * 2,
      orderBy: { createdAt: 'desc' },
      include: { document: { select: { originalName: true } } },
    });

    // RRF（Reciprocal Rank Fusion）：合并两路结果
    const merged = new Map<
      string,
      { content: string; documentName: string; score: number }
    >();

    // 向量结果：k=60 是 RRF 经典参数
    vecResult.documents.forEach((content, i) => {
      const docName = (vecResult.metadatas?.[i] as any)?.documentId ?? '';
      const key = content.slice(0, 80);
      merged.set(key, {
        content,
        documentName: docName,
        score: 1 / (60 + i + 1),
      });
    });

    // 全文结果叠加分数
    ftsResults.forEach((chunk, i) => {
      const key = chunk.content.slice(0, 80);
      const existing = merged.get(key);
      const rrfScore = 1 / (60 + i + 1);
      if (existing) {
        existing.score += rrfScore;
      } else {
        merged.set(key, {
          content: chunk.content,
          documentName: chunk.document.originalName,
          score: rrfScore,
        });
      }
    });

    // 按 RRF 分数降序排列，取 topK
    const ranked = Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // 补全文档名（从 documentId 查 originalName）
    const docIds = [
      ...new Set(
        ranked
          .map((r) => r.documentName)
          .filter((n) => !n.includes('.') && n.length > 10),
      ),
    ];
    const docMap = new Map<string, string>();
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

  // ---- 向量检索（保留原接口） ----
  async searchDocuments(knowledgeBaseId: string, userId: string, query: string, topK = 5) {
    return this.hybridSearch(knowledgeBaseId, userId, query, topK);
  }

  // ---- 获取文档完整内容（给摘要工具用） ----
  async getDocumentContent(documentId: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } }, knowledgeBase: true },
    });
    if (!doc) throw new NotFoundException('文档不存在');
    await this.checkKbAccess(doc.knowledgeBaseId, userId);

    return {
      id: doc.id,
      originalName: doc.originalName,
      tags: doc.tags,
      content: doc.chunks.map((c) => c.content).join('\n'),
      chunkCount: doc.chunks.length,
    };
  }

  // ---- 文档版本历史 ----
  async getDocumentVersions(documentId: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId },
      include: { knowledgeBase: true },
    });
    if (!doc) throw new NotFoundException('文档不存在');
    await this.checkKbAccess(doc.knowledgeBaseId, userId);

    // 沿着 parentDocumentId 链找到根文档，然后查所有版本
    const rootId = doc.parentDocumentId ?? doc.id;
    return this.prisma.document.findMany({
      where: {
        knowledgeBase: { userId },
        OR: [{ id: rootId }, { parentDocumentId: rootId }],
      },
      select: {
        id: true, originalName: true, version: true, size: true,
        _count: { select: { chunks: true } },
        createdAt: true,
      },
      orderBy: { version: 'asc' },
    });
  }

  // ---- 知识图谱（标签共现关系）----
  async getKnowledgeGraph(knowledgeBaseId: string, userId: string) {
    
    await this.checkKbAccess(knowledgeBaseId, userId);

    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, userId },
    });
    await this.checkKbAccess(knowledgeBaseId, userId);
    if (!kb) throw new NotFoundException('知识库不存在');

    const docs = await this.prisma.document.findMany({
      where: { knowledgeBaseId },
      select: { id: true, originalName: true, tags: true },
      orderBy: { createdAt: 'desc' },
    });

    // 构建节点
    const nodes = docs.slice(0, 20).map((d) => ({
      id: d.id,
      name: d.originalName.length > 20 ? d.originalName.slice(0, 20) + '...' : d.originalName,
      symbolSize: Math.min(40, 20 + (d.tags?.split(',').filter(Boolean).length ?? 0) * 8),
      tags: d.tags,
    }));

    // 构建边：标签重叠的文档之间建立连线
    const links: { source: string; target: string; value: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const tagsI = (nodes[i].tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
      for (let j = i + 1; j < nodes.length; j++) {
        const tagsJ = (nodes[j].tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
        const common = tagsI.filter((t: string) => tagsJ.includes(t));
        if (common.length > 0) {
          links.push({ source: nodes[i].id, target: nodes[j].id, value: common.length });
        }
      }
    }

    return { nodes, links };
  }

  async renameDocument(documentId: string, userId: string, newName: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, knowledgeBase: { userId } },
    });
    if (!doc) throw new NotFoundException('文档不存在');
    return this.prisma.document.update({
      where: { id: documentId },
      data: { originalName: newName },
    });
  }

  async updateDocumentContent(documentId: string, userId: string, content: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, knowledgeBase: { userId } },
      include: { chunks: true, knowledgeBase: true },
    });
    if (!doc) throw new NotFoundException('文档不存在');

    // 删除旧向量和 chunk 记录
    const collectionName = `kb_${doc.knowledgeBaseId}`;
    const oldIds = doc.chunks.map((c) => c.vectorId);
    if (oldIds.length) await this.vector.deleteByIds(collectionName, oldIds);
    await this.prisma.documentChunk.deleteMany({ where: { documentId } });

    // 重新分块 + 向量化
    const chunks = await this.splitter.splitText(content);
    await this.embedAndStore(documentId, doc.knowledgeBaseId, chunks);

    return { chunkCount: chunks.length };
  }

  async deleteDocument(documentId: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, knowledgeBase: { userId } },
      include: { chunks: true, knowledgeBase: true },
    });
    if (!doc) throw new NotFoundException('文档不存在');

    const vectorIds = doc.chunks.map((c) => c.vectorId);
    if (vectorIds.length > 0) {
      await this.vector.deleteByIds(`kb_${doc.knowledgeBaseId}`, vectorIds);
    }
    await this.prisma.document.delete({ where: { id: documentId } });
  }
}
