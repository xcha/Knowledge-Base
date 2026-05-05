import type { Response } from 'express';
import { AgentService } from './agent.service';
import { AuthRequest } from '../common/types';
export declare class AgentController {
    private agentService;
    constructor(agentService: AgentService);
    agentChat(kbId: string, req: AuthRequest, body: {
        question: string;
        sessionId?: string;
    }, res: Response): Promise<void>;
}
