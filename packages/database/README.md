# PMS Platform Database

Comprehensive database infrastructure for the Performance Management System (PMS) platform supporting all 50 features.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Database Schema](#database-schema)
- [Migrations](#migrations)
- [Seeding Data](#seeding-data)
- [Time-Series Data](#time-series-data)
- [Data Retention](#data-retention)
- [Caching Strategy](#caching-strategy)
- [Performance Optimization](#performance-optimization)
- [Backup & Recovery](#backup--recovery)
- [Monitoring](#monitoring)

## 🏗️ Architecture Overview

The PMS platform uses a **multi-tier database architecture** for optimal performance and scalability:

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   OLTP   │  │   Time   │  │  Cache   │
│PostgreSQL│  │ -Series  │  │  Redis   │
│          │  │TimescaleDB│  │          │
└─────┬────┘  └─────┬────┘  └──────────┘
      │             │
      │    ┌────────┘
      │    │
      ▼    ▼
┌─────────────┐      ┌──────────────┐
│    Data     │      │   Archive    │
│  Warehouse  │──────▶   Storage    │
│             │      │   (S3/Cold)  │
└─────────────┘      └──────────────┘
```

### Components

1. **PostgreSQL (OLTP)** - Primary database for transactional data
   - 100+ tables covering all PMS features
   - Row-Level Security (RLS) for multi-tenancy
   - ACID compliance

2. **TimescaleDB** - Time-series extension for PostgreSQL
   - Performance metrics tracking
   - Engagement metrics
   - Goal progress history
   - Automatic compression and retention

3. **Redis Cache** - Multi-layer caching
   - Session data (24h TTL)
   - User profiles (1h TTL)
   - Dashboard data (5min TTL)
   - ML predictions (24h TTL)

4. **Data Warehouse** - Analytics and reporting
   - Star schema design
   - Fact tables: performance_reviews, engagement, feedback
   - Dimension tables: users, time, departments
   - ETL: Daily sync from OLTP

5. **Archive Storage** - Long-term cold storage
   - Data older than retention policy
   - Compliance-required records
   - Compressed and indexed

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with TimescaleDB extension
- Redis 7+
- Docker (optional, for local development)

### Installation

```bash
# Install dependencies
npm install

# Setup PostgreSQL with TimescaleDB
# Using Docker
docker run -d \
  --name pms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg14

# Using native installation
# Install TimescaleDB: https://docs.timescale.com/install/latest/

# Setup Redis
docker run -d \
  --name pms-redis \
  -p 6379:6379 \
  redis:7-alpine

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Run TimescaleDB setup
psql -U postgres -d pms_platform -f migrations/001_setup_timescaledb.sql

# Create indexes
psql -U postgres -d pms_platform -f migrations/002_create_indexes.sql

# Setup audit logging
psql -U postgres -d pms_platform -f migrations/003_audit_logging.sql

# Configure data retention
psql -U postgres -d pms_platform -f migrations/004_data_retention_policies.sql

# Seed demo data
npm run prisma:seed
```

## 📊 Database Schema

### Schema Organization

The database schema is organized into logical groups:

#### Core Identity & Organization (10 models)
- `Tenant` - Multi-tenant isolation
- `User` - Employee records
- `Department` - Organizational hierarchy
- `BusinessUnit` - Business unit structure
- `CostCenter` - Financial tracking
- `Team` - Team management
- `TeamMember` - Team membership
- `ReportingLine` - Matrix reporting
- `Role` - RBAC roles
- `UserRole` - User-role assignments

#### Performance Management (15 models)
- `Goal` - OKRs and goals
- `KeyResult` - Goal key results
- `PerformanceReview` - Annual/periodic reviews
- `ReviewCycle` - Review periods
- `Competency` - Skills and competencies
- `CompetencyAssessment` - Skill assessments
- `Feedback` - 360° feedback
- `OneOnOne` - 1-on-1 meetings
- `CalibrationSession` - Review calibration
- And more...

#### Actionable Insights & Planning (16 models)
- `PromotionRecommendation` - AI-powered promotion recommendations
- `SuccessionPlan` - Succession planning
- `DevelopmentPlan` - Career development plans
- `TeamOptimization` - Team composition optimization
- `PerformanceImprovementPlan` - PIPs
- `OrganizationalHealthMetrics` - Org health tracking
- And more...

#### AI & ML (14 models)
- `MLModelPrediction` - Model predictions
- `EngagementSurvey` - Employee engagement
- `SurveyResponse` - Survey results
- And more...

### Entity Relationship Diagram

See [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md) for complete ERD diagrams and schema details.

### Key Relationships

```
Tenant (1) ──────── (N) User
  │                     │
  │                     ├── (N) Goal
  │                     ├── (N) PerformanceReview
  │                     ├── (N) Feedback
  │                     ├── (N) DevelopmentPlan
  │                     └── (N) PromotionRecommendation
  │
  ├── (N) Department
  ├── (N) Team
  ├── (N) ReviewCycle
  └── (N) AccessPolicy

User (1) ──────── (N) User (Manager)
  │
  ├── (N) Goal (Owner)
  ├── (N) PerformanceReview (Reviewee)
  ├── (N) PerformanceReview (Reviewer)
  ├── (N) TeamMember
  └── (N) ReportingLine
```

## 🔄 Migrations

### Migration Files

Located in `packages/database/migrations/`:

1. **001_setup_timescaledb.sql**
   - Enables TimescaleDB extension
   - Creates time-series hypertables
   - Configures continuous aggregates
   - Sets up compression policies

2. **002_create_indexes.sql**
   - Creates 300+ performance indexes
   - Composite indexes for complex queries
   - Full-text search indexes
   - JSONB GIN indexes
   - Partial indexes for filtered queries

3. **003_audit_logging.sql**
   - Audit trigger functions
   - Triggers on sensitive tables
   - Security event logging
   - Suspicious activity detection

4. **004_data_retention_policies.sql**
   - Retention configuration
   - Archival procedures
   - Storage tier management
   - Automated cleanup

### Running Migrations

```bash
# Prisma migrations
npm run prisma:migrate:dev
npm run prisma:migrate:deploy

# SQL migrations
psql -U postgres -d pms_platform -f migrations/001_setup_timescaledb.sql
psql -U postgres -d pms_platform -f migrations/002_create_indexes.sql
psql -U postgres -d pms_platform -f migrations/003_audit_logging.sql
psql -U postgres -d pms_platform -f migrations/004_data_retention_policies.sql
```

### Creating New Migrations

```bash
# Prisma migration
npx prisma migrate dev --name your_migration_name

# SQL migration
# Create new file: migrations/00X_migration_name.sql
# Run: psql -U postgres -d pms_platform -f migrations/00X_migration_name.sql
```

## 🌱 Seeding Data

The seed script (`prisma/seed.ts`) creates comprehensive demo data:

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@demo.pms-platform.local | demo123 | ADMIN, HR_ADMIN |
| manager@demo.pms-platform.local | demo123 | MANAGER |
| employee@demo.pms-platform.local | demo123 | EMPLOYEE |
| jane@demo.pms-platform.local | demo123 | EMPLOYEE |

### Sample Data Includes

- ✅ Organizational structure (departments, teams, business units)
- ✅ User hierarchy (CEO → Managers → Employees)
- ✅ Goals and KRs (individual and team)
- ✅ Performance reviews and feedback
- ✅ Competency assessments
- ✅ Promotion recommendations
- ✅ Succession plans
- ✅ Development plans
- ✅ PIPs (Performance Improvement Plans)
- ✅ Organizational health metrics
- ✅ ML predictions
- ✅ Engagement surveys and responses

### Running Seed

```bash
npm run prisma:seed
```

## ⏱️ Time-Series Data

TimescaleDB hypertables for real-time tracking:

### Hypertables

1. **performance_metrics_ts**
   - Performance KPIs over time
   - Chunk interval: 1 month
   - Retention: 2 years
   - Compression: 6 months

2. **engagement_metrics_ts**
   - Employee engagement scores
   - Chunk interval: 1 month
   - Retention: 3 years
   - Compression: 6 months

3. **goal_progress_ts**
   - Goal completion tracking
   - Chunk interval: 3 months
   - Retention: 5 years
   - Compression: 12 months

4. **feedback_activity_ts**
   - Feedback frequency and sentiment
   - Chunk interval: 3 months
   - Retention: 3 years
   - Compression: 6 months

### Continuous Aggregates

Pre-computed rollups for fast querying:

- `performance_metrics_daily` - Daily averages
- `performance_metrics_monthly` - Monthly averages
- `engagement_metrics_weekly` - Weekly engagement trends
- `feedback_trends_monthly` - Monthly feedback patterns

### Querying Time-Series Data

```sql
-- Get recent performance metrics
SELECT * FROM get_recent_performance_metrics(
  'tenant-uuid',
  'user-uuid',
  30  -- last 30 days
);

-- Calculate engagement trend
SELECT * FROM calculate_engagement_trend(
  'tenant-uuid',
  'user-uuid',
  'month'  -- monthly trend
);

-- Query daily aggregates
SELECT * FROM performance_metrics_daily
WHERE tenant_id = 'tenant-uuid'
  AND day >= NOW() - INTERVAL '90 days'
ORDER BY day DESC;
```

## 🗄️ Data Retention

### Retention Policies

| Entity Type | Hot | Warm | Cold | Archive | Compliance |
|-------------|-----|------|------|---------|------------|
| PerformanceReview | 1yr | 3yr | 5yr | 7yr | ✅ |
| Feedback | 6mo | 2yr | 4yr | 6yr | ❌ |
| Goal | 1yr | 3yr | 5yr | 7yr | ❌ |
| PIP | 2yr | 5yr | 7yr | 10yr | ✅ |
| AuditLog | 3mo | 1yr | 2yr | 3yr | ✅ |
| Notification | 1mo | 3mo | 6mo | DELETE | ❌ |

### Storage Tiers

- **HOT** - Fast SSD storage, frequently accessed
- **WARM** - Standard storage, occasionally accessed
- **COLD** - Compressed storage, rarely accessed
- **ARCHIVE** - S3/Glacier, compliance retention

### Automated Maintenance

Daily maintenance job runs:

```sql
-- Run all maintenance tasks
SELECT daily_data_maintenance();
```

This procedure:
1. Archives old records
2. Updates storage tiers
3. Deletes expired data
4. Cleans audit logs
5. Creates partition tables

### Manual Operations

```sql
-- Get storage statistics
SELECT * FROM get_storage_statistics();

-- Get archival candidates
SELECT * FROM get_archival_candidates();

-- Archive specific entity
SELECT archive_entity(
  'PerformanceReview',
  'review-uuid',
  'tenant-uuid',
  '{"data": "json"}'::JSONB,
  '2020-01-01'::TIMESTAMPTZ
);

-- Retrieve archived entity
SELECT retrieve_archived_entity(
  'PerformanceReview',
  'review-uuid'
);
```

## 💾 Caching Strategy

### Redis Cache Layers

See `apps/api/src/services/cache/redis-cache.service.ts` for implementation.

#### Cache Categories

| Category | TTL | Pattern | Use Case |
|----------|-----|---------|----------|
| Session | 24h | `session:{sessionId}` | User sessions |
| User Profile | 1h | `user:profile:{userId}` | User data |
| Review | 30min | `review:{reviewId}` | Performance reviews |
| Goal | 15min | `goal:{goalId}` | Goal details |
| Dashboard | 5min | `dashboard:{userId}` | Dashboard data |
| ML Prediction | 24h | `ml:prediction:{userId}:{type}` | AI predictions |
| Org Health | 1h | `org:health:{tenantId}` | Org metrics |

#### Cache Patterns

**Cache-Aside (Lazy Loading)**
```typescript
// Get or set pattern
const data = await cacheService.getOrSet(
  'key',
  3600,
  async () => await fetchFromDatabase()
);
```

**Write-Through**
```typescript
// Update database and cache
await db.update(data);
await cacheService.set('key', data, 3600);
```

**Cache Invalidation**
```typescript
// Invalidate user cache
await cacheService.invalidateUser(userId);

// Invalidate pattern
await cacheService.delPattern('dashboard:*');
```

### Cache Configuration

```typescript
// apps/api/src/config/redis.ts
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB) || 0,
  keyPrefix: 'pms:',
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};
```

## ⚡ Performance Optimization

### Indexing Strategy

300+ indexes for optimal query performance:

#### Composite Indexes
```sql
-- Goals by owner and period
CREATE INDEX idx_goals_owner_period
  ON goals(owner_id, start_date, end_date)
  INCLUDE (progress_percentage, status);
```

#### Partial Indexes
```sql
-- Active users only
CREATE INDEX idx_users_active_email
  ON users(email)
  WHERE is_active = true AND deleted_at IS NULL;
```

#### Full-Text Search
```sql
-- Goal search
CREATE INDEX idx_goals_fts
  ON goals USING gin(
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
  );
```

#### JSONB Indexes
```sql
-- Tags search
CREATE INDEX idx_goals_tags
  ON goals USING gin(tags);
```

### Query Optimization

#### Use EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE
SELECT * FROM goals
WHERE owner_id = 'user-uuid'
  AND status = 'ACTIVE';
```

#### Connection Pooling

```typescript
// Prisma connection pool
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_timeout = 20
  connection_limit = 20
}
```

#### PgBouncer Configuration

```ini
[databases]
pms_platform = host=localhost dbname=pms_platform

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
```

## 💾 Backup & Recovery

### Backup Strategy

#### Continuous Archiving (WAL)
```bash
# Configure in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

#### Daily Full Backups
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backup/daily"
DATE=$(date +%Y%m%d)

pg_dump -U postgres -Fc pms_platform > \
  $BACKUP_DIR/pms_platform_$DATE.dump
```

#### Weekly Compressed Backups
```bash
# Compress and upload to S3
tar -czf backup_$DATE.tar.gz /backup/daily/pms_platform_$DATE.dump
aws s3 cp backup_$DATE.tar.gz s3://pms-backups/weekly/
```

### Recovery

#### Point-in-Time Recovery (PITR)
```bash
# Restore from backup
pg_restore -U postgres -d pms_platform_restore \
  pms_platform_20240101.dump

# Apply WAL files up to specific time
recovery_target_time = '2024-01-01 14:00:00'
```

#### Backup Verification
```bash
# Test restore weekly
./scripts/test-restore.sh
```

## 📈 Monitoring

### Database Metrics

#### Performance Metrics
```sql
-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes'
ORDER BY duration DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup,
  n_dead_tup
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### TimescaleDB Metrics
```sql
-- Chunk statistics
SELECT * FROM timescaledb_information.chunks;

-- Compression stats
SELECT * FROM timescaledb_information.compression_settings;

-- Continuous aggregate stats
SELECT * FROM timescaledb_information.continuous_aggregates;
```

### Audit Queries

```sql
-- User activity
SELECT * FROM get_user_audit_history('user-uuid', 30, 100);

-- Entity changes
SELECT * FROM get_entity_audit_history('Goal', 'goal-uuid', 50);

-- Security events
SELECT * FROM get_tenant_security_events('tenant-uuid', 7, 100);

-- Suspicious activity
SELECT * FROM detect_suspicious_activity('tenant-uuid', 24);
```

### Alerts

Set up monitoring for:
- Query performance > 1s
- Connection pool exhaustion
- Disk space < 20%
- Replication lag > 1min
- Failed backup jobs
- Suspicious activity detected

## 📚 Additional Resources

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md) - Complete architecture documentation
- [Prisma Documentation](https://www.prisma.io/docs)
- [TimescaleDB Documentation](https://docs.timescale.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Redis Documentation](https://redis.io/documentation)

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for database schema changes and migration guidelines.

## 📄 License

See [LICENSE](../../LICENSE) for details.
