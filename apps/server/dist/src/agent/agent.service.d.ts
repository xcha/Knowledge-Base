import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
export declare class AgentService {
    private prisma;
    private vector;
    private knowledge;
    private readonly logger;
    private readonly llm;
    constructor(prisma: PrismaService, vector: VectorService, knowledge: KnowledgeService);
    agentStream(knowledgeBaseId: string, userId: string, question: string, sessionId: string | undefined, res: Response): Promise<void>;
}
