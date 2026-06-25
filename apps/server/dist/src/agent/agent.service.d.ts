import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TokenUsageService } from '../common/token-usage.service';
export declare class AgentService {
    private prisma;
    private vector;
    private knowledge;
    private tokenUsage;
    private readonly logger;
    private readonly llm;
    constructor(prisma: PrismaService, vector: VectorService, knowledge: KnowledgeService, tokenUsage: TokenUsageService);
    agentStream(knowledgeBaseId: string, userId: string, question: string, sessionId: string | undefined, res: Response): Promise<void>;
}
