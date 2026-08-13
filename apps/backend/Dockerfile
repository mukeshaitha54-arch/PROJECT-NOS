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
RUN pnpm --filter shared-types build
RUN pnpm --filter backend build

# ─── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace config + backend package.json
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Copy shared-types (including its built dist) so pnpm can symlink it
COPY --from=builder /app/packages/shared-types ./packages/shared-types

# Install production dependencies fresh
RUN pnpm install --frozen-lockfile --prod

# Copy build artifacts and prisma schema
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Prisma client generation (runtime needs it; pin version to match project)
RUN npx prisma@6.19.3 generate --schema=./apps/backend/prisma/schema.prisma

ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_PATH=/app/node_modules

EXPOSE 3001

CMD ["node", "apps/backend/dist/main.js"]