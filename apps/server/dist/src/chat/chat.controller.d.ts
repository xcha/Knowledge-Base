import type { Response } from 'express';
import { ChatService } from './chat.service';
import { AuthRequest } from '../common/types';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    createSession(kbId: string, req: AuthRequest, body: {
        title?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
        title: string | null;
    }>;
    listSessions(kbId: string, req: AuthRequest): Promise<({
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
    deleteSession(sessionId: string): Promise<void>;
    getMessages(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        role: string;
        sessionId: string;
    }[]>;
    sendMessage(sessionId: string, req: AuthRequest, body: {
        question: string;
    }, res: Response): Promise<void>;
}
