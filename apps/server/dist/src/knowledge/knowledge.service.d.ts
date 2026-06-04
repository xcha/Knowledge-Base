import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
export declare class KnowledgeService {
    private prisma;
    private vector;
    constructor(prisma: PrismaService, vector: VectorService);
    private splitter;
    private embedder;
    private checkKbAccess;
    createKnowledgeBase(userId: string, name: string, description?: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        userId: string;
        teamId: string | null;
    }>;
    listKnowledgeBases(userId: string): Promise<({
        team: {
            id: string;
            name: string;
        } | null;
        _count: {
            documents: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        userId: string;
        teamId: string | null;
    })[]>;
    renameKnowledgeBase(id: string, userId: string, name: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        userId: string;
        teamId: string | null;
    }>;
    updateKnowledgeBase(id: string, userId: string, data: {
        name?: string;
        description?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        userId: string;
        teamId: string | null;
    }>;
    deleteKnowledgeBase(id: string, userId: string): Promise<void>;
    uploadDocument(knowledgeBaseId: string, userId: string, file: Express.Multer.File, content: string, tags?: string): Promise<{
        documentId: string;
        chunkCount: number;
        version: number;
    }>;
    private embedAndStore;
    getEmbedding(text: string): Promise<number[]>;
    listDocuments(knowledgeBaseId: string, userId: string, tag?: string): Promise<({
        _count: {
            chunks: number;
        };
    } & {
        size: number;
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
        tags: string;
        version: number;
        parentDocumentId: string | null;
        knowledgeBaseId: string;
    })[]>;
    getAllTags(knowledgeBaseId: string, userId: string): Promise<string[]>;
    updateDocumentTags(documentId: string, userId: string, tags: string): Promise<{
        size: number;
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
        tags: string;
        version: number;
        parentDocumentId: string | null;
        knowledgeBaseId: string;
    }>;
    hybridSearch(knowledgeBaseId: string, userId: string, query: string, topK?: number): Promise<{
        query: string;
        mode: string;
        chunks: {
            content: string;
            documentName: string;
            score: number;
        }[];
    }>;
    searchDocuments(knowledgeBaseId: string, userId: string, query: string, topK?: number): Promise<{
        query: string;
        mode: string;
        chunks: {
            content: string;
            documentName: string;
            score: number;
        }[];
    }>;
    getDocumentContent(documentId: string, userId: string): Promise<{
        id: string;
        originalName: string;
        tags: string;
        content: string;
        chunkCount: number;
    }>;
    getDocumentVersions(documentId: string, userId: string): Promise<{
        size: number;
        id: string;
        createdAt: Date;
        _count: {
            chunks: number;
        };
        originalName: string;
        version: number;
    }[]>;
    getKnowledgeGraph(knowledgeBaseId: string, userId: string): Promise<{
        nodes: {
            id: string;
            name: string;
            symbolSize: number;
            tags: string;
        }[];
        links: {
            source: string;
            target: string;
            value: number;
        }[];
    }>;
    renameDocument(documentId: string, userId: string, newName: string): Promise<{
        size: number;
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
        tags: string;
        version: number;
        parentDocumentId: string | null;
        knowledgeBaseId: string;
    }>;
    updateDocumentContent(documentId: string, userId: string, content: string): Promise<{
        chunkCount: number;
    }>;
    deleteDocument(documentId: string, userId: string): Promise<void>;
}
