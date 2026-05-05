# AI 知识库平台

企业级 RAG 知识库平台，支持文档上传、语义检索、流式对话，以及 MCP Server 集成。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 (App Router) + Tailwind CSS |
| 后端 | NestJS + Prisma 7 + PostgreSQL |
| AI | Claude API (LangChain) + Voyage AI 向量嵌入 |
| 向量库 | Chroma Cloud |
| 协议 | MCP Server (Claude Desktop 集成) |

## 功能

- **知识库管理**：创建多个知识库，上传 txt/md 文档，自动切片向量化
- **RAG 问答**：语义检索 + 流式输出，带对话历史
- **Agent 问答**：ReAct Agent 自主决定是否检索，支持多轮工具调用
- **MCP 集成**：作为 MCP Server 接入 Claude Desktop，直接在 Claude 对话中检索知识库

## 快速启动

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example apps/server/.env
# 编辑 apps/server/.env，填入 API Key 和数据库连接

# 3. 初始化数据库
cd apps/server && npx prisma migrate dev

# 4. 启动服务
pnpm dev:server   # 后端 :3001
pnpm dev:web      # 前端 :3000
```

### Docker 部署

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，填入所有必要的值

# 2. 一键启动（自动构建镜像 + 数据库迁移）
docker compose up -d

# 3. 查看日志
docker compose logs -f server
```

访问 http://localhost:3000 注册账号开始使用。

### MCP Server（接入 Claude Desktop）

```bash
# 编译 MCP Server
cd apps/mcp && pnpm build
```

在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "ai-knowledge-base": {
      "command": "node",
      "args": ["/path/to/apps/mcp/dist/index.js"],
      "env": {
        "KB_API_BASE": "http://localhost:3001/api",
        "KB_API_TOKEN": "登录后从浏览器 localStorage 获取的 JWT token",
        "KB_ID": "浏览器地址栏 /dashboard/[这里] 的知识库 ID"
      }
    }
  }
}
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `ANTHROPIC_API_KEY` | Claude API Key |
| `ANTHROPIC_BASE_URL` | Claude API 地址（可用代理） |
| `VOYAGE_API_KEY` | Voyage AI 向量嵌入 Key |
| `JWT_SECRET` | JWT 签名密钥 |
| `NEXT_PUBLIC_API_URL` | 前端访问后端的地址 |

## 项目结构

```
apps/
  server/   # NestJS 后端
  web/      # Next.js 前端
  mcp/      # MCP Server
```
