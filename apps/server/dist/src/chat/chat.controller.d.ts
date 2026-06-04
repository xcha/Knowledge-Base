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
    sendMessage(sessionId: string, req: AuthRequest, dto: SendMessageDto, res: Response): Promise<void>;
}
