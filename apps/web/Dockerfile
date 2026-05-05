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
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter web build

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
