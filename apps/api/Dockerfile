# Multi-stage build for PMS Backend API

# Stage 1: Base with system deps
FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++ \
    wget

# Copy root package files for workspace resolution
COPY package*.json ./
COPY turbo.json ./

# Copy ALL workspace package.json files so npm ci resolves correctly
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/ 2>/dev/null || true
COPY apps/admin/package*.json ./apps/admin/ 2>/dev/null || true
COPY packages/database/package*.json ./packages/database/
COPY packages/core/package*.json ./packages/core/
COPY packages/ui/package*.json ./packages/ui/ 2>/dev/null || true

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app
RUN npm ci --include=dev

# Stage 3: Build
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps (hoisted at root for workspaces)
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code needed for build
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/core ./packages/core

# Generate Prisma client from correct location
WORKDIR /app/packages/database
RUN npx prisma generate

# Build the database package first (API depends on it)
RUN npm run build || true

# Build core package
WORKDIR /app/packages/core
RUN npm run build || true

# Build the API
WORKDIR /app/apps/api
RUN npm run build

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat wget

# Copy root package files for workspace resolution
COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/ 2>/dev/null || true
COPY apps/admin/package*.json ./apps/admin/ 2>/dev/null || true
COPY packages/database/package*.json ./packages/database/
COPY packages/core/package*.json ./packages/core/
COPY packages/ui/package*.json ./packages/ui/ 2>/dev/null || true

# Install production dependencies only
RUN npm ci --omit=dev || npm ci

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy Prisma schema + migrations (needed for migrate deploy)
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy built packages
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/core/dist ./packages/core/dist 2>/dev/null || true
COPY --from=builder /app/packages/core/package.json ./packages/core/ 2>/dev/null || true

# Copy seed script (used by startup)
COPY scripts/seed-if-empty.js ./scripts/

# Re-generate Prisma client for production (platform-specific binary)
WORKDIR /app/packages/database
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app/apps/api

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --spider -q http://localhost:3001/health || exit 1

# Run migrations, seed if empty, then start
CMD ["sh", "-c", "cd /app/packages/database && npx prisma migrate deploy && cd /app && node scripts/seed-if-empty.js && cd /app/apps/api && node dist/index.js"]
