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
RUN pnpm --filter server build
RUN pnpm --filter server exec prisma generate

# ---- runner ----
FROM node:22-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --filter server --prod

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma
COPY apps/server/prisma ./apps/server/prisma

WORKDIR /app/apps/server
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/src/main.js"]
