import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
export declare class ChatService {
    private prisma;
    private vector;
    private knowledge;
    private readonly logger;
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
        role: string;
        content: string;
        sessionId: string;
    }[]>;
    renameSession(sessionId: string, title: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
        title: string | null;
    }>;
    deleteSession(sessionId: string): Promise<void>;
    feedbackMessage(messageId: string, userId: string, type: 'like' | 'dislike', comment?: string): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        userId: string;
        messageId: string;
        comment: string | null;
    }>;
    getMessageFeedback(messageId: string): Promise<{
        likes: number;
        dislikes: number;
        total: number;
        list: {
            id: string;
            type: string;
            createdAt: Date;
            userId: string;
            messageId: string;
            comment: string | null;
        }[];
    }>;
    chatStream(sessionId: string, userId: string, question: string, res: Response): Promise<void>;
}
