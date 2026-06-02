import { KnowledgeService } from './knowledge.service';
import { AuthRequest } from '../common/types';
export declare class KnowledgeController {
    private knowledge;
    constructor(knowledge: KnowledgeService);
    create(req: AuthRequest, body: {
        name: string;
        description?: string;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    list(req: AuthRequest): Promise<({
        _count: {
            documents: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    })[]>;
    deleteKb(id: string, req: AuthRequest): Promise<void>;
    uploadDocument(knowledgeBaseId: string, req: AuthRequest, file: Express.Multer.File): Promise<{
        documentId: string;
        chunkCount: number;
    }>;
    listDocuments(knowledgeBaseId: string, req: AuthRequest): Promise<({
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
    search(knowledgeBaseId: string, req: AuthRequest, query: string, topK?: string): Promise<{
        chunks: {
            content: string;
            documentName: string;
            score: number;
        }[];
    }>;
    deleteDocument(docId: string, req: AuthRequest): Promise<void>;
}
