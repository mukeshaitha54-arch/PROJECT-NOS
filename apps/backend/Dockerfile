FROM node:22-alpine AS base

# 1. Prune step: isolate backend package and its workspace dependencies
FROM base AS pruner
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable pnpm
WORKDIR /app
COPY . .
RUN npx turbo@^2.3.3 prune @nos/backend --docker

# 2. Builder step: install pruned dependencies, generate prisma client, and compile
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable pnpm
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm --filter @nos/backend prisma:generate
RUN pnpm turbo run build --filter=@nos/backend

# 3. Runner step: lean production fastify container
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./apps/backend/
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules

USER nestjs
EXPOSE 4000
CMD ["node", "apps/backend/dist/main"]
