import { KnowledgeService } from './knowledge.service';
import type { AuthRequest } from '../common/types';
import { CreateKbDto } from './dto/create-kb.dto';
export declare class KnowledgeController {
    private knowledge;
    constructor(knowledge: KnowledgeService);
    create(req: AuthRequest, dto: CreateKbDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        userId: string;
        description: string | null;
    }>;
    list(req: AuthRequest): Promise<({
        _count: {
            documents: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        userId: string;
        description: string | null;
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
        size: number;
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
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
