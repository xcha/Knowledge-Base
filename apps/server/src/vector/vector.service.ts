import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from 'chromadb';

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private client: ChromaClient;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.config.get<string>('CHROMA_API_KEY')!;

    // chromadb v3 新 API：用 host/port/ssl/headers 替代废弃的 path/auth
    // X-Chroma-Token 是 Chroma Cloud 的鉴权 header
    this.client = new ChromaClient({
      host: 'api.trychroma.com',
      port: 443,
      ssl: true,
      tenant: this.config.get<string>('CHROMA_TENANT')!,
      database: this.config.get<string>('CHROMA_DATABASE')!,
      headers: { 'X-Chroma-Token': apiKey },
    });

    // 非阻塞验证：连接失败只记录警告，不崩溃进程
    // 实际操作时如果 Chroma 不可用会在具体方法里抛出错误
    try {
      await this.client.listCollections();
      this.logger.log('Chroma Cloud connected and verified');
    } catch (error) {
      this.logger.warn(
        'Chroma Cloud connection check failed — will retry on first use',
      );
      this.logger.warn(String(error));
    }
  }

  // 获取或创建一个 collection（对应一个知识库）
  private async getCollection(collectionName: string): Promise<Collection> {
    return this.client.getOrCreateCollection({
      name: collectionName,
      // cosine 相似度适合文本语义检索，比欧氏距离更准确
      metadata: { 'hnsw:space': 'cosine' },
    });
  }

  // 批量写入向量：documents 是文本，embeddings 是对应的向量，ids 是唯一标识
  async addDocuments(
    collectionName: string,
    ids: string[],
    embeddings: number[][],
    documents: string[],
    metadatas?: Record<string, string>[],
  ): Promise<void> {
    const collection = await this.getCollection(collectionName);
    await collection.add({ ids, embeddings, documents, metadatas });
  }

  // 向量相似度查询：传入查询向量，返回最相似的 n 条文本
  async query(
    collectionName: string,
    queryEmbedding: number[],
    nResults = 5,
  ): Promise<{
    ids: string[];
    documents: string[];
    distances: number[];
    metadatas: Record<string, string>[];
  }> {
    const collection = await this.getCollection(collectionName);
    const result = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
    });

    return {
      ids: result.ids[0],
      documents: result.documents[0] as string[],
      distances: result.distances?.[0] as number[],
      metadatas: (result.metadatas?.[0] ?? []) as Record<string, string>[],
    };
  }

  // 按 ID 删除向量（文档删除时同步清理）
  async deleteByIds(collectionName: string, ids: string[]): Promise<void> {
    const collection = await this.getCollection(collectionName);
    await collection.delete({ ids });
  }

  // 清空整个 collection（知识库重置）
  async deleteCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection({ name: collectionName });
  }

  async getCollectionCount(collectionName: string): Promise<number> {
    const collection = await this.getCollection(collectionName);
    return collection.count();
  }
}
