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
const token_usage_service_1 = require("../common/token-usage.service");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const messages_1 = require("@langchain/core/messages");
const agent_tools_1 = require("./agent.tools");
const llm_provider_1 = require("../common/llm.provider");
let AgentService = AgentService_1 = class AgentService {
    prisma;
    vector;
    knowledge;
    tokenUsage;
    logger = new common_1.Logger(AgentService_1.name);
    llm = (0, llm_provider_1.createClaudeLlm)();
    constructor(prisma, vector, knowledge, tokenUsage) {
        this.prisma = prisma;
        this.vector = vector;
        this.knowledge = knowledge;
        this.tokenUsage = tokenUsage;
    }
    async agentStream(knowledgeBaseId, userId, question, sessionId, res) {
        const tokenCheck = await this.tokenUsage.checkTokenLimit(userId);
        if (!tokenCheck.allowed) {
            (0, llm_provider_1.setupSseHeaders)(res);
            (0, llm_provider_1.sendSse)(res, { error: `本月 Token 用量已达到上限（${tokenCheck.used.toLocaleString()} / ${tokenCheck.limit.toLocaleString()}），请升级会员或下月再试` });
            res.end();
            return;
        }
        await this.knowledge.checkKbAccess(knowledgeBaseId, userId);
        const tools = (0, agent_tools_1.buildAgentTools)(knowledgeBaseId, this.knowledge, this.vector, this.prisma, userId);
        const agent = (0, prebuilt_1.createReactAgent)({
            llm: this.llm,
            tools,
            prompt: `你是一个专业的知识库问答助手。
        你有以下工具可以使用：
        - search_knowledge：在知识库中检索相关内容
        - get_document_list：查看知识库中有哪些文档（含ID和标签）
        - get_document_content：获取指定文档的完整文本内容
        - web_search：联网搜索互联网获取最新信息
        - generate_mind_map：根据知识库内容生成思维导图

        回答策略：
        1. 如果问题需要查找具体信息，先调用 search_knowledge
        2. 如果用户询问有哪些文档，调用 get_document_list
        3. 如果用户要求总结/概括/摘要某文档，先 get_document_list 拿到文档ID，再调 get_document_content 获取全文，最后生成摘要
        4. 如果知识库中找不到答案，或问题涉及时事/最新资讯，调用 web_search 联网搜索
        5. 如果用户要求画思维导图/脑图/整理知识结构，调用 generate_mind_map
        6. 如果问题是通用知识，可以直接回答
        7. 基于检索结果给出准确、有依据的回答`,
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
        (0, llm_provider_1.setupSseHeaders)(res);
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
                        (0, llm_provider_1.sendSse)(res, { text });
                    }
                }
                if (event.event === 'on_tool_start') {
                    (0, llm_provider_1.sendSse)(res, { toolCall: { name: event.name, input: event.data?.input } });
                }
                if (event.event === 'on_tool_end') {
                    (0, llm_provider_1.sendSse)(res, { toolResult: { name: event.name } });
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
            if (fullContent) {
                const estimatedInput = Math.ceil(question.length / 3) + 200;
                const estimatedOutput = Math.ceil(fullContent.length / 3);
                this.tokenUsage.record(userId, 'claude-sonnet-4-6', estimatedInput, estimatedOutput).catch(() => null);
            }
            (0, llm_provider_1.sendSse)(res, { done: true });
        }
        catch (err) {
            this.logger.error('Agent error', String(err));
            (0, llm_provider_1.sendSse)(res, { error: 'Agent 执行失败，请重试' });
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
        knowledge_service_1.KnowledgeService,
        token_usage_service_1.TokenUsageService])
], AgentService);
//# sourceMappingURL=agent.service.js.map