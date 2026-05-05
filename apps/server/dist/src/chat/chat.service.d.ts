import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
export declare class ChatService {
    private prisma;
    private vector;
    private knowledge;
    constructor(prisma: PrismaService, vector: VectorService, knowledge: KnowledgeService);
    private llm;
    createSession(knowledgeBaseId: string, userId: string, title?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
        title: string | null;
    }>;
    listSessions(knowledgeBaseId: string, userId: string): Promise<({
        _count: {
            messages: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
        title: string | null;
    })[]>;
    getSessionMessages(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        role: string;
        sessionId: string;
    }[]>;
    deleteSession(sessionId: string): Promise<void>;
    chatStream(sessionId: string, userId: string, question: string, res: Response): Promise<void>;
}
