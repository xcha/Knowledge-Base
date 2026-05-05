import { Injectable, NotFoundException } from '@nestjs/common';
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

  // 文本分块器：按字符递归分割，保留语义完整性
  // chunkSize=500 适合中文文档，overlap=50 避免关键信息被截断
  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: ['\n\n', '\n', '。', '！', '？', '；', ' ', ''],
  });

  // Voyage AI embedding，voyage-3-lite 维度 512，适合中英文语义检索
  // Anthropic 官方推荐的 embedding 合作方，与 Claude 语义空间对齐
  private embedder = new VoyageEmbeddings({
    apiKey: process.env.VOYAGE_API_KEY,
    modelName: 'voyage-3-lite',
  });

  async createKnowledgeBase(userId: string, name: string, description?: string) {
    return this.prisma.knowledgeBase.create({
      data: { name, description, userId },
    });
  }

  async listKnowledgeBases(userId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { userId },
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteKnowledgeBase(id: string, userId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');

    // 删除 Chroma 中对应的 collection
    await this.vector.deleteCollection(`kb_${id}`).catch(() => null);
    await this.prisma.knowledgeBase.delete({ where: { id } });
  }

  async uploadDocument(
    knowledgeBaseId: string,
    userId: string,
    file: Express.Multer.File,
    content: string,
  ) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');

    // 1. 保存文档元信息到 PostgreSQL
    const doc = await this.prisma.document.create({
      data: {
        filename: file.filename ?? file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        knowledgeBaseId,
      },
    });

    // 2. 将文档内容分块
    const chunks = await this.splitter.splitText(content);

    // 3. 批量获取向量并存储
    await this.embedAndStore(doc.id, knowledgeBaseId, chunks);

    return { documentId: doc.id, chunkCount: chunks.length };
  }

  // 批量 embed：Voyage 支持批量请求，比逐条调用效率高
  private async embedAndStore(
    documentId: string,
    knowledgeBaseId: string,
    chunks: string[],
  ) {
    const collectionName = `kb_${knowledgeBaseId}`;

    // 批量获取所有 chunk 的向量，减少 API 调用次数
    const embeddings = await this.embedder.embedDocuments(chunks);

    const ids = chunks.map((_, i) => `${documentId}_chunk_${i}`);
    const metadatas = chunks.map((_, i) => ({
      documentId,
      knowledgeBaseId,
      chunkIndex: String(i),
    }));

    // 写入 Chroma
    await this.vector.addDocuments(collectionName, ids, embeddings, chunks, metadatas);

    // 记录分块信息到 PostgreSQL（用于文档删除时清理向量）
    await this.prisma.documentChunk.createMany({
      data: chunks.map((content, i) => ({
        content,
        vectorId: ids[i],
        chunkIndex: i,
        documentId,
      })),
    });
  }

  // 查询时也用同一个 embedder，保证向量空间一致
  async getEmbedding(text: string): Promise<number[]> {
    return this.embedder.embedQuery(text);
  }

  async listDocuments(knowledgeBaseId: string, userId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');

    return this.prisma.document.findMany({
      where: { knowledgeBaseId },
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(documentId: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, knowledgeBase: { userId } },
      include: { chunks: true, knowledgeBase: true },
    });
    if (!doc) throw new NotFoundException('文档不存在');

    // 从 Chroma 删除该文档的所有向量
    const vectorIds = doc.chunks.map((c) => c.vectorId);
    if (vectorIds.length > 0) {
      await this.vector.deleteByIds(`kb_${doc.knowledgeBaseId}`, vectorIds);
    }

    await this.prisma.document.delete({ where: { id: documentId } });
  }
}
