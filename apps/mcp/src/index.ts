import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// 从环境变量读取配置，支持 Claude Desktop 通过 env 传参
const API_BASE = process.env.KB_API_BASE ?? 'http://localhost:3001/api';
const API_TOKEN = process.env.KB_API_TOKEN ?? '';
const KB_ID = process.env.KB_ID ?? '';

if (!KB_ID) {
  process.stderr.write('Error: KB_ID environment variable is required\n');
  process.exit(1);
}

const server = new McpServer({
  name: 'ai-knowledge-base',
  version: '1.0.0',
});

// 工具1：语义检索知识库
server.registerTool(
  'search_knowledge',
  {
    description:
      '在 AI 知识库中进行语义检索，返回与查询最相关的文档片段。适合查找具体知识点、事实或文档内容。',
    inputSchema: {
      query: z.string().describe('检索查询词，尽量具体描述要查找的内容'),
      topK: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('返回结果数量，默认 5'),
    },
  },
  async ({ query, topK = 5 }) => {
    const res = await fetch(
      `${API_BASE}/knowledge/${KB_ID}/search?q=${encodeURIComponent(query)}&topK=${topK}`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      },
    );

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `检索失败：HTTP ${res.status}` }],
        isError: true,
      };
    }

    const data = (await res.json()) as { chunks: Array<{ content: string; documentName: string; score: number }> };

    if (!data.chunks?.length) {
      return {
        content: [{ type: 'text', text: '知识库中未找到相关内容。' }],
      };
    }

    const text = data.chunks
      .map(
        (c, i) =>
          `[片段${i + 1}] 来源：${c.documentName}（相似度 ${(c.score * 100).toFixed(1)}%）\n${c.content}`,
      )
      .join('\n\n---\n\n');

    return { content: [{ type: 'text', text }] };
  },
);

// 工具2：列出知识库文档
server.registerTool(
  'list_documents',
  {
    description:
      '列出知识库中所有文档的名称和基本信息。适合了解知识库整体内容或确认某文档是否存在。',
    inputSchema: {},
  },
  async () => {
    const res = await fetch(`${API_BASE}/knowledge/${KB_ID}/documents`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `获取文档列表失败：HTTP ${res.status}` }],
        isError: true,
      };
    }

    const data = (await res.json()) as Array<{
      originalName: string;
      createdAt: string;
      _count: { chunks: number };
    }>;

    if (!data?.length) {
      return { content: [{ type: 'text', text: '知识库中暂无文档。' }] };
    }

    const text = data
      .map(
        (d) =>
          `- ${d.originalName}（${d._count.chunks} 个片段，上传于 ${new Date(d.createdAt).toLocaleDateString('zh-CN')}）`,
      )
      .join('\n');

    return { content: [{ type: 'text', text: `知识库共有 ${data.length} 个文档：\n\n${text}` }] };
  },
);

// 使用 stdio transport，兼容 Claude Desktop / Cursor 等 MCP 客户端
const transport = new StdioServerTransport();
await server.connect(transport);
