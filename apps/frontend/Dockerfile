FROM node:22-alpine AS base

# 1. Prune step: isolate frontend package and its workspace dependencies
FROM base AS pruner
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm
WORKDIR /app
COPY . .
RUN npx turbo@^2.3.3 prune @nos/frontend --docker

# 2. Builder step: install pruned dependencies and compile standalone output
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
ENV DOCKER_BUILD="true"
RUN pnpm turbo run build --filter=@nos/frontend

# 3. Runner step: lean production environment using Next standalone output
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
