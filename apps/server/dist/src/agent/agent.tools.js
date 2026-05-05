"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentTools = buildAgentTools;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
function buildAgentTools(knowledgeBaseId, knowledgeService, vectorService, prisma) {
    const searchKnowledge = (0, tools_1.tool)(async ({ query, topK }) => {
        const embedding = await knowledgeService.getEmbedding(query);
        const result = await vectorService.query(`kb_${knowledgeBaseId}`, embedding, topK ?? 5);
        if (!result.documents.length) {
            return '知识库中未找到相关内容。';
        }
        return result.documents
            .map((doc, i) => `[片段${i + 1}] ${doc}`)
            .join('\n\n');
    }, {
        name: 'search_knowledge',
        description: '在知识库中进行语义检索，返回与查询最相关的文档片段。当需要查找具体知识、事实或文档内容时使用此工具。',
        schema: zod_1.z.object({
            query: zod_1.z.string().describe('检索查询词，应尽量具体'),
            topK: zod_1.z
                .number()
                .optional()
                .describe('返回结果数量，默认 5，最大 10'),
        }),
    });
    const getDocumentList = (0, tools_1.tool)(async () => {
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
        if (!docs.length)
            return '知识库中暂无文档。';
        return docs
            .map((d) => `- ${d.originalName}（${d._count.chunks} 个片段，上传于 ${d.createdAt.toLocaleDateString('zh-CN')}）`)
            .join('\n');
    }, {
        name: 'get_document_list',
        description: '列出知识库中所有文档的名称和基本信息。当用户询问"有哪些文档"或需要了解知识库整体内容时使用。',
        schema: zod_1.z.object({}),
    });
    return [searchKnowledge, getDocumentList];
}
//# sourceMappingURL=agent.tools.js.map