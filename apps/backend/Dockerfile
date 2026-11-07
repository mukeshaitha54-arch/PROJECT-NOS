# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy workspace root files first (for monorepo resolution)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies (frozen lockfile = deterministic)
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
# Ensure assets and local node_modules dirs exist to guarantee COPY never fails
RUN mkdir -p apps/backend/assets apps/backend/node_modules
RUN pnpm --filter shared-types build
RUN pnpm --filter backend build

# ─── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_PATH=/app/node_modules
ENV CHECKPOINT_DISABLE=1
ENV PRISMA_DISABLE_TELEMETRY=1

# Copy workspace config
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared-types ./packages/shared-types

# Copy all node_modules from builder (already contains all dependencies and generated Prisma Client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy backend package.json, build artifacts, prisma schema, and static assets
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/assets ./apps/backend/assets

EXPOSE 3001

CMD ["sh", "-c", "if [ -f apps/backend/dist/main.js ]; then node apps/backend/dist/main.js; elif [ -f apps/backend/dist/src/main.js ]; then node apps/backend/dist/src/main.js; else node apps/backend/dist/apps/backend/src/main.js; fi"]
