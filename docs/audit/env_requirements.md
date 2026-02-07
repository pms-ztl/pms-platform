# Environment Requirements

Generated: 2026-02-04

## Critical Blockers for Login/Authentication

### 1. PostgreSQL Database (REQUIRED)
**Status**: ❌ NOT RUNNING
**Error**: `Can't reach database server at localhost:5432`
**Required for**: All database operations, user authentication, data persistence

**Setup Steps**:
```bash
# Install PostgreSQL (if not installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# Or use Docker:
docker run --name pms-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15

# Create database
createdb pms_platform

# Run Prisma migrations
cd packages/database
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

**Environment Variables Required**:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pms_platform"
```

### 2. Redis Cache (OPTIONAL - Currently Gracefully Degraded)
**Status**: ⚠️ NOT RUNNING (app continues without cache)
**Error**: `ECONNREFUSED` on Redis connection
**Required for**: Caching, session storage, rate limiting (optional)

**Setup Steps**:
```bash
# Install Redis (if not installed)
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run --name pms-redis -p 6379:6379 -d redis:7-alpine

# Test connection
redis-cli ping
```

**Environment Variables**:
```env
REDIS_URL="redis://localhost:6379"
```

### 3. JWT Authentication Secrets (REQUIRED)
**Status**: ⚠️ UNKNOWN (needs verification)
**Required for**: JWT token signing, session management

**Environment Variables Required**:
```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

### 4. Application Configuration
**Environment Variables**:
```env
NODE_ENV="development"
PORT=3001
HOST="0.0.0.0"
CORS_ORIGINS="http://localhost:3002,http://localhost:3000"

# Tenant configuration
DEFAULT_TENANT_SLUG="demo"

# MFA/2FA (if enabled)
MFA_ENABLED="false"
```

## Complete .env Template

Create `.env` file in `apps/api/`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pms_platform"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Server
NODE_ENV="development"
PORT=3001
HOST="0.0.0.0"

# CORS
CORS_ORIGINS="http://localhost:3002,http://localhost:3000"

# JWT
JWT_SECRET="dev-secret-change-in-production-min-32-chars-recommended"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Session
SESSION_SECRET="dev-session-secret-change-in-production"

# Tenant
DEFAULT_TENANT_SLUG="demo"

# Features
MFA_ENABLED="false"
```

## Test User Setup

After database is running and migrated, create test users:

```sql
-- Connect to database
psql -d pms_platform

-- Insert test tenant
INSERT INTO "Tenant" (id, name, slug, status, "createdAt", "updatedAt") 
VALUES ('test-tenant-1', 'Demo Organization', 'demo', 'ACTIVE', NOW(), NOW());

-- Insert test users (password: demo123)
INSERT INTO "User" (id, email, "firstName", "lastName", "tenantId", role, status, "passwordHash", "createdAt", "updatedAt")
VALUES 
  ('admin-1', 'admin@demo.pms-platform.local', 'Admin', 'User', 'test-tenant-1', 'ADMIN', 'ACTIVE', '$2a$10$...', NOW(), NOW()),
  ('manager-1', 'manager@demo.pms-platform.local', 'Manager', 'User', 'test-tenant-1', 'MANAGER', 'ACTIVE', '$2a$10$...', NOW(), NOW()),
  ('employee-1', 'employee@demo.pms-platform.local', 'Employee', 'User', 'test-tenant-1', 'EMPLOYEE', 'ACTIVE', '$2a$10$...', NOW(), NOW());
```

Or use Prisma seed script if available:
```bash
cd packages/database
npm run seed
```

## Quick Start Checklist

- [ ] Install PostgreSQL (or start Docker container)
- [ ] Create `pms_platform` database
- [ ] Copy `.env.example` to `apps/api/.env` (or create from template above)
- [ ] Update `DATABASE_URL` in `.env`
- [ ] Run `npx prisma migrate deploy` from `packages/database`
- [ ] (Optional) Run `npx prisma db seed` to create test users
- [ ] (Optional) Install and start Redis
- [ ] Restart backend server: `cd apps/api && npm run dev`
- [ ] Test login at http://localhost:3002/login

## Current Status

✅ Backend compiles and runs (http://localhost:3001)
✅ Frontend compiles and runs (http://localhost:3002)
❌ Database connection missing (PostgreSQL at localhost:5432)
⚠️  Redis connection missing (gracefully degraded)
❌ Cannot test authentication flows until database is available

## Next Steps

1. Set up PostgreSQL database
2. Run Prisma migrations
3. Create test users
4. Test login flow
5. Verify all 7 smoke test scenarios
