import { z } from 'zod';
import type { KnowledgeService } from '../knowledge/knowledge.service';
import type { VectorService } from '../vector/vector.service';
import type { PrismaService } from '../prisma/prisma.service';
export declare function buildAgentTools(knowledgeBaseId: string, knowledgeService: KnowledgeService, vectorService: VectorService, prisma: PrismaService): (import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    query: z.ZodString;
    topK: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, {
    query: string;
    topK?: number | undefined;
}, {
    query: string;
    topK?: number | undefined;
}, string, unknown, "search_knowledge"> | import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{}, z.core.$strip>, Record<string, never>, Record<string, never>, string, unknown, "get_document_list">)[];
