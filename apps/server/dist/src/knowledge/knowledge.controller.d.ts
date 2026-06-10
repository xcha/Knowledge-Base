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
        userId: string;
        updatedAt: Date;
        description: string | null;
        teamId: string | null;
    }>;
    list(req: AuthRequest): Promise<({
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
        userId: string;
        updatedAt: Date;
        description: string | null;
        teamId: string | null;
    })[]>;
    updateKb(id: string, req: AuthRequest, body: {
        name?: string;
        description?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string;
        updatedAt: Date;
        description: string | null;
        teamId: string | null;
    }>;
    deleteKb(id: string, req: AuthRequest): Promise<void>;
    uploadDocument(knowledgeBaseId: string, req: AuthRequest, file: Express.Multer.File, tags?: string): Promise<{
        documentId: string;
        chunkCount: number;
        version: number;
    }>;
    listDocuments(knowledgeBaseId: string, req: AuthRequest, tag?: string, folder?: string): Promise<({
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
        folder: string;
        version: number;
        parentDocumentId: string | null;
        knowledgeBaseId: string;
    })[]>;
    getFolders(knowledgeBaseId: string, req: AuthRequest): Promise<import("./knowledge.service").FolderNode>;
    renameDocument(docId: string, req: AuthRequest, body: {
        originalName: string;
    }): Promise<{
        size: number;
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
        tags: string;
        folder: string;
        version: number;
        parentDocumentId: string | null;
        knowledgeBaseId: string;
    }>;
    updateFolder(docId: string, req: AuthRequest, body: {
        folder: string;
    }): Promise<{
        size: number;
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
        tags: string;
        folder: string;
        version: number;
        parentDocumentId: string | null;
        knowledgeBaseId: string;
    }>;
    updateContent(docId: string, req: AuthRequest, body: {
        content: string;
    }): Promise<{
        chunkCount: number;
    }>;
    getDocumentContent(docId: string, req: AuthRequest): Promise<{
        id: string;
        originalName: string;
        tags: string;
        content: string;
        chunkCount: number;
    }>;
    getTags(knowledgeBaseId: string, req: AuthRequest): Promise<string[]>;
    updateTags(docId: string, req: AuthRequest, body: {
        tags: string;
    }): Promise<{
        size: number;
        id: string;
        createdAt: Date;
        filename: string;
        originalName: string;
        mimeType: string;
        tags: string;
        folder: string;
        version: number;
        parentDocumentId: string | null;
        knowledgeBaseId: string;
    }>;
    hybridSearch(knowledgeBaseId: string, req: AuthRequest, query: string, topK?: string): Promise<{
        query: string;
        mode: string;
        chunks: {
            content: string;
            documentName: string;
            score: number;
        }[];
    }>;
    search(knowledgeBaseId: string, req: AuthRequest, query: string, topK?: string): Promise<{
        query: string;
        mode: string;
        chunks: {
            content: string;
            documentName: string;
            score: number;
        }[];
    }>;
    getVersions(docId: string, req: AuthRequest): Promise<{
        size: number;
        id: string;
        createdAt: Date;
        _count: {
            chunks: number;
        };
        originalName: string;
        version: number;
    }[]>;
    getGraph(knowledgeBaseId: string, req: AuthRequest): Promise<{
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
    deleteDocument(docId: string, req: AuthRequest): Promise<void>;
}
