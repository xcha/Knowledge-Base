import type { Response } from 'express';
import { AgentService } from './agent.service';
import type { AuthRequest } from '../common/types';
import { AgentChatDto } from './dto/agent-chat.dto';
export declare class AgentController {
    private agentService;
    constructor(agentService: AgentService);
    agentChat(kbId: string, req: AuthRequest, dto: AgentChatDto, res: Response): Promise<void>;
}
