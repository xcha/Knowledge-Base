import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
export declare class KnowledgeService {
    private prisma;
    private vector;
    constructor(prisma: PrismaService, vector: VectorService);
    private splitter;
    private embedder;
    createKnowledgeBase(userId: string, name: string, description?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        userId: string;
    }>;
    listKnowledgeBases(userId: string): Promise<({
        _count: {
            documents: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        userId: string;
    })[]>;
    deleteKnowledgeBase(id: string, userId: string): Promise<void>;
    uploadDocument(knowledgeBaseId: string, userId: string, file: Express.Multer.File, content: string): Promise<{
        documentId: string;
        chunkCount: number;
    }>;
    private embedAndStore;
    getEmbedding(text: string): Promise<number[]>;
    listDocuments(knowledgeBaseId: string, userId: string): Promise<({
        _count: {
            chunks: number;
        };
    } & {
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        knowledgeBaseId: string;
    })[]>;
    searchDocuments(knowledgeBaseId: string, userId: string, query: string, topK?: number): Promise<{
        chunks: {
            content: string;
            documentName: string;
            score: number;
        }[];
    }>;
    deleteDocument(documentId: string, userId: string): Promise<void>;
}
