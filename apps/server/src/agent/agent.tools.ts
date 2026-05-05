import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { KnowledgeService } from '../knowledge/knowledge.service';
import type { VectorService } from '../vector/vector.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * 构建 Agent 可用的工具集。
 * 工具以闭包形式注入 service，避免在工具内部做依赖注入。
 *
 * 工具列表：
 *  - search_knowledge：向量相似度检索，返回最相关的文档片段
 *  - get_document_list：列出知识库中所有文档的元信息
 */
export function buildAgentTools(
  knowledgeBaseId: string,
  knowledgeService: KnowledgeService,
  vectorService: VectorService,
  prisma: PrismaService,
) {
  // 工具1：语义检索知识库
  // Agent 在需要查找具体信息时调用此工具
  const searchKnowledge = tool(
    async ({ query, topK }) => {
      const embedding = await knowledgeService.getEmbedding(query);
      const result = await vectorService.query(
        `kb_${knowledgeBaseId}`,
        embedding,
        topK ?? 5,
      );

      if (!result.documents.length) {
        return '知识库中未找到相关内容。';
      }

      // 将检索结果格式化为带编号的文本块，方便 Agent 引用
      return result.documents
        .map((doc, i) => `[片段${i + 1}] ${doc}`)
        .join('\n\n');
    },
    {
      name: 'search_knowledge',
      description:
        '在知识库中进行语义检索，返回与查询最相关的文档片段。当需要查找具体知识、事实或文档内容时使用此工具。',
      schema: z.object({
        query: z.string().describe('检索查询词，应尽量具体'),
        topK: z
          .number()
          .optional()
          .describe('返回结果数量，默认 5，最大 10'),
      }),
    },
  );

  // 工具2：列出知识库文档
  // Agent 在需要了解知识库整体内容时调用此工具
  const getDocumentList = tool(
    async () => {
      const docs = await prisma.document.findMany({
        where: { knowledgeBaseId },
        select: {
          id: true,
          originalName: true,
          createdAt: true,
          _count: { select: { chunks: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!docs.length) return '知识库中暂无文档。';

      return docs
        .map(
          (d) =>
            `- ${d.originalName}（${d._count.chunks} 个片段，上传于 ${d.createdAt.toLocaleDateString('zh-CN')}）`,
        )
        .join('\n');
    },
    {
      name: 'get_document_list',
      description:
        '列出知识库中所有文档的名称和基本信息。当用户询问"有哪些文档"或需要了解知识库整体内容时使用。',
      schema: z.object({}),
    },
  );

  return [searchKnowledge, getDocumentList];
}
