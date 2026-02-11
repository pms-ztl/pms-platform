# Multi-stage build for PMS Frontend

# Stage 1: Base with system deps
FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat wget

# Copy root package files for workspace resolution
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package.json files
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/ 2>/dev/null || true
COPY apps/admin/package*.json ./apps/admin/ 2>/dev/null || true
COPY packages/core/package*.json ./packages/core/ 2>/dev/null || true
COPY packages/database/package*.json ./packages/database/ 2>/dev/null || true
COPY packages/ui/package*.json ./packages/ui/ 2>/dev/null || true

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app
RUN npm ci --include=dev

# Stage 3: Build
FROM base AS builder
WORKDIR /app

# Use relative /api/v1 so nginx proxies API calls to backend
ARG VITE_API_URL=/api/v1

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY apps/web ./apps/web
COPY packages ./packages

# Build the application
WORKDIR /app/apps/web
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 4: Production with nginx
FROM nginx:alpine AS production

# Copy built static assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config (from infrastructure)
COPY infrastructure/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --spider -q http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
