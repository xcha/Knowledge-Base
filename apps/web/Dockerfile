FROM node:22-alpine AS base
RUN npm install -g pnpm

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter web

# ---- build ----
FROM deps AS builder
WORKDIR /app
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:5001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter web build

# ---- runner ----
FROM node:22-alpine AS runner
# standalone 在 monorepo 下输出到 .next/standalone/apps/web/server.js
WORKDIR /app/apps/web
ENV NODE_ENV=production

# standalone 包含完整的 node_modules，直接复制整个 standalone 目录
COPY --from=builder /app/apps/web/.next/standalone/. /app/
# 静态资源需要单独复制到正确位置
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
