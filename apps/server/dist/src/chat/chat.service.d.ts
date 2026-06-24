import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TokenUsageService } from '../common/token-usage.service';
export declare class ChatService {
    private prisma;
    private vector;
    private knowledge;
    private tokenUsage;
    private readonly logger;
    constructor(prisma: PrismaService, vector: VectorService, knowledge: KnowledgeService, tokenUsage: TokenUsageService);
    createSession(knowledgeBaseId: string, userId: string, title?: string): Promise<{
        id: string;
        title: string | null;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
    }>;
    listSessions(knowledgeBaseId: string, userId: string): Promise<({
        _count: {
            messages: number;
        };
    } & {
        id: string;
        title: string | null;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
    })[]>;
    getSessionMessages(sessionId: string, userId: string, kbId: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        content: string;
        sessionId: string;
    }[]>;
    renameSession(sessionId: string, userId: string, kbId: string, title: string): Promise<{
        id: string;
        title: string | null;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
    }>;
    deleteSession(sessionId: string, userId: string, kbId: string): Promise<void>;
    feedbackMessage(messageId: string, userId: string, type: 'like' | 'dislike', comment?: string): Promise<{
        id: string;
        type: string;
        userId: string;
        createdAt: Date;
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
            userId: string;
            createdAt: Date;
            messageId: string;
            comment: string | null;
        }[];
    }>;
    chatStream(sessionId: string, userId: string, question: string, res: Response, model?: string): Promise<void>;
}
