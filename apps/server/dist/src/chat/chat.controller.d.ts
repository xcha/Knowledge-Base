import type { Response } from 'express';
import { ChatService } from './chat.service';
import type { AuthRequest } from '../common/types';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    createSession(kbId: string, req: AuthRequest, dto: CreateSessionDto): Promise<{
        id: string;
        title: string | null;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
    }>;
    listSessions(kbId: string, req: AuthRequest): Promise<({
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
    renameSession(kbId: string, sessionId: string, req: AuthRequest, body: {
        title: string;
    }): Promise<{
        id: string;
        title: string | null;
        createdAt: Date;
        updatedAt: Date;
        knowledgeBaseId: string;
    }>;
    deleteSession(kbId: string, sessionId: string, req: AuthRequest): Promise<void>;
    getMessages(kbId: string, sessionId: string, req: AuthRequest): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        content: string;
        sessionId: string;
    }[]>;
    sendMessage(sessionId: string, req: AuthRequest, dto: SendMessageDto, res: Response): Promise<void>;
    feedback(msgId: string, req: AuthRequest, body: {
        type: 'like' | 'dislike';
        comment?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        messageId: string;
        userId: string;
        type: string;
        comment: string | null;
    }>;
    getFeedback(msgId: string): Promise<{
        likes: number;
        dislikes: number;
        total: number;
        list: {
            id: string;
            createdAt: Date;
            messageId: string;
            userId: string;
            type: string;
            comment: string | null;
        }[];
    }>;
}
