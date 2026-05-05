FROM node:22-alpine AS base
RUN npm install -g pnpm

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --filter server

# ---- build ----
FROM deps AS builder
WORKDIR /app
COPY apps/server ./apps/server
RUN pnpm --filter server exec prisma generate
RUN pnpm --filter server build

# ---- runner ----
FROM node:22-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --filter server --prod

# 复制构建产物
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# 复制 prisma schema 文件，以便在 runner 中生成 client
COPY apps/server/prisma ./apps/server/prisma

# 在 runner 环境中重新生成 Prisma Client
# 这能解决 .prisma 路径找不到以及环境兼容性问题
RUN cd apps/server && npx prisma generate

WORKDIR /app/apps/server
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/src/main.js"]