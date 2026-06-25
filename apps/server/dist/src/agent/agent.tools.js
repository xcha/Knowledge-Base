"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentTools = buildAgentTools;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
function buildAgentTools(knowledgeBaseId, knowledgeService, vectorService, prisma, userId) {
    const searchKnowledge = (0, tools_1.tool)(async ({ query, topK }) => {
        const embedding = await knowledgeService.getEmbedding(query);
        const result = await vectorService.query(`kb_${knowledgeBaseId}`, embedding, topK ?? 5);
        if (!result.documents.length)
            return '知识库中未找到相关内容。';
        return result.documents
            .map((doc, i) => `[片段${i + 1}] ${doc}`)
            .join('\n\n');
    }, {
        name: 'search_knowledge',
        description: '在知识库中进行语义检索，返回与查询最相关的文档片段。当需要查找具体知识、事实或文档内容时使用此工具。',
        schema: zod_1.z.object({
            query: zod_1.z.string().describe('检索查询词，应尽量具体'),
            topK: zod_1.z.number().optional().describe('返回结果数量，默认 5，最大 10'),
        }),
    });
    const getDocumentList = (0, tools_1.tool)(async () => {
        const docs = await prisma.document.findMany({
            where: { knowledgeBaseId },
            select: {
                id: true,
                originalName: true,
                tags: true,
                createdAt: true,
                _count: { select: { chunks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!docs.length)
            return '知识库中暂无文档。';
        return docs
            .map((d) => `- [ID:${d.id}] ${d.originalName}（${d._count.chunks} 片段${d.tags ? `，标签：${d.tags}` : ''}，上传于 ${d.createdAt.toLocaleDateString('zh-CN')}）`)
            .join('\n');
    }, {
        name: 'get_document_list',
        description: '列出知识库中所有文档的名称、ID、标签和基本信息。',
        schema: zod_1.z.object({}),
    });
    const getDocumentContent = (0, tools_1.tool)(async ({ documentId }) => {
        const doc = await prisma.document.findFirst({
            where: { id: documentId, knowledgeBaseId },
            include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
        });
        if (!doc)
            return '文档不存在。';
        const fullText = doc.chunks.map((c) => c.content).join('\n');
        if (fullText.length > 5000) {
            return `文档《${doc.originalName}》共 ${doc.chunks.length} 个片段。以下是前 5000 字：\n\n${fullText.slice(0, 5000)}\n\n（内容已截断，可使用 search_knowledge 查询文档特定部分）`;
        }
        return `文档《${doc.originalName}》共 ${doc.chunks.length} 个片段，全文如下：\n\n${fullText}`;
    }, {
        name: 'get_document_content',
        description: '获取指定文档的完整文本内容。当用户要求"总结/概括/摘要某文档"或需要阅读文档全文时使用。先通过 get_document_list 获取文档 ID，再调用此工具。',
        schema: zod_1.z.object({
            documentId: zod_1.z
                .string()
                .describe('文档 ID，从 get_document_list 返回结果中获取'),
        }),
    });
    const webSearchTool = (0, tools_1.tool)(async ({ query, maxResults }) => {
        try {
            const { webSearch } = await import('../common/web-search.js');
            const results = await webSearch(query, maxResults ?? 5);
            if (!results.length)
                return '未找到相关网页结果。';
            return results
                .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
                .join('\n\n');
        }
        catch (err) {
            return `搜索失败：${String(err)}`;
        }
    }, {
        name: 'web_search',
        description: '联网搜索互联网获取最新信息。当知识库中找不到答案，或问题涉及时事、最新资讯、公开信息时使用此工具。',
        schema: zod_1.z.object({
            query: zod_1.z.string().describe('搜索关键词'),
            maxResults: zod_1.z.number().optional().describe('返回结果数量，默认 5'),
        }),
    });
    const generateMindMap = (0, tools_1.tool)(async ({ topic }) => {
        const embedding = await knowledgeService.getEmbedding(topic);
        const result = await vectorService.query(`kb_${knowledgeBaseId}`, embedding, 10);
        const context = result.documents.length
            ? `基于以下知识库内容生成思维导图：\n${result.documents.join('\n\n')}`
            : `请基于通用知识生成关于"${topic}"的思维导图。`;
        return JSON.stringify({
            type: 'mindmap',
            topic,
            context,
            instruction: '请根据以上内容，生成一个 JSON 格式的思维导图，结构为：{ "topic": "中心主题", "children": [{ "topic": "子主题", "children": [...] }] }，不要包含其他文字，只返回 JSON。',
        });
    }, {
        name: 'generate_mind_map',
        description: '根据知识库内容生成思维导图。当用户要求"画思维导图"、"生成脑图"、"整理知识结构"时使用。',
        schema: zod_1.z.object({
            topic: zod_1.z.string().describe('思维导图的中心主题'),
        }),
    });
    return [
        searchKnowledge,
        getDocumentList,
        getDocumentContent,
        webSearchTool,
        generateMindMap,
    ];
}
//# sourceMappingURL=agent.tools.js.map