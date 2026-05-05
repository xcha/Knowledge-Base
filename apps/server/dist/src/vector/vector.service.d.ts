import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class VectorService implements OnModuleInit {
    private config;
    private readonly logger;
    private client;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    private getCollection;
    addDocuments(collectionName: string, ids: string[], embeddings: number[][], documents: string[], metadatas?: Record<string, string>[]): Promise<void>;
    query(collectionName: string, queryEmbedding: number[], nResults?: number): Promise<{
        ids: string[];
        documents: string[];
        distances: number[];
    }>;
    deleteByIds(collectionName: string, ids: string[]): Promise<void>;
    deleteCollection(collectionName: string): Promise<void>;
    getCollectionCount(collectionName: string): Promise<number>;
}
