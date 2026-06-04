"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const vector_service_1 = require("../vector/vector.service");
const knowledge_service_1 = require("../knowledge/knowledge.service");
const anthropic_1 = require("@langchain/anthropic");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const messages_1 = require("@langchain/core/messages");
const agent_tools_1 = require("./agent.tools");
let AgentService = AgentService_1 = class AgentService {
    prisma;
    vector;
    knowledge;
    logger = new common_1.Logger(AgentService_1.name);
    constructor(prisma, vector, knowledge) {
        this.prisma = prisma;
        this.vector = vector;
        this.knowledge = knowledge;
    }
    llm = new anthropic_1.ChatAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-6',
        clientOptions: {
            baseURL: process.env.ANTHROPIC_BASE_URL,
            defaultHeaders: {
                Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
            },
        },
    });
    async agentStream(knowledgeBaseId, userId, question, sessionId, res) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
        });
        if (!kb)
            throw new common_1.NotFoundException('知识库不存在');
        const tools = (0, agent_tools_1.buildAgentTools)(knowledgeBaseId, this.knowledge, this.vector, this.prisma);
        const agent = (0, prebuilt_1.createReactAgent)({
            llm: this.llm,
            tools,
            prompt: `你是一个专业的知识库问答助手。
        你有以下工具可以使用：
        - search_knowledge：在知识库中检索相关内容
        - get_document_list：查看知识库中有哪些文档

        回答策略：
        1. 如果问题需要查找具体信息，先调用 search_knowledge
        2. 如果用户询问有哪些文档，调用 get_document_list
        3. 如果问题是通用知识，可以直接回答
        4. 基于检索结果给出准确、有依据的回答`,
        });
        const history = sessionId
            ? await this.prisma.chatMessage.findMany({
                where: { sessionId },
                orderBy: { createdAt: 'asc' },
                take: 10,
            })
            : [];
        const messages = [
            ...history.map((m) => m.role === 'user'
                ? new messages_1.HumanMessage(m.content)
                : new messages_1.AIMessage(m.content)),
            new messages_1.HumanMessage(question),
        ];
        if (sessionId) {
            await this.prisma.chatMessage.create({
                data: { role: 'user', content: question, sessionId },
            });
        }
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        let fullContent = '';
        try {
            const eventStream = agent.streamEvents({ messages }, { version: 'v2' });
            for await (const event of eventStream) {
                if (event.event === 'on_chat_model_stream' &&
                    event.data?.chunk?.content) {
                    const raw = event.data.chunk.content;
                    let text = '';
                    if (typeof raw === 'string') {
                        text = raw;
                    }
                    else if (Array.isArray(raw)) {
                        text = raw
                            .filter((b) => b.type === 'text' && b.text)
                            .map((b) => b.text)
                            .join('');
                    }
                    if (text) {
                        fullContent += text;
                        res.write(`data: ${JSON.stringify({ text })}\n\n`);
                    }
                }
                if (event.event === 'on_tool_start') {
                    res.write(`data: ${JSON.stringify({
                        toolCall: { name: event.name, input: event.data?.input },
                    })}\n\n`);
                }
                if (event.event === 'on_tool_end') {
                    res.write(`data: ${JSON.stringify({ toolResult: { name: event.name } })}\n\n`);
                }
            }
            if (sessionId && fullContent) {
                await this.prisma.chatMessage.create({
                    data: { role: 'assistant', content: fullContent, sessionId },
                });
                await this.prisma.chatSession.update({
                    where: { id: sessionId },
                    data: { updatedAt: new Date() },
                });
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
        catch (err) {
            this.logger.error('Agent error', String(err));
            res.write(`data: ${JSON.stringify({ error: 'Agent 执行失败，请重试' })}\n\n`);
        }
        finally {
            res.end();
        }
    }
};
exports.AgentService = AgentService;
exports.AgentService = AgentService = AgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vector_service_1.VectorService,
        knowledge_service_1.KnowledgeService])
], AgentService);
//# sourceMappingURL=agent.service.js.map