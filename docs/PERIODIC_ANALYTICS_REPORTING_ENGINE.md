# Periodic Analytics & Reporting Engine

## Overview

The Periodic Analytics & Reporting Engine provides comprehensive automated reporting capabilities for the PMS platform, delivering actionable insights through 5 specialized report types with intelligent trend analysis, pattern detection, and forecasting.

## Features

### 1. Weekly Performance Summary with Trend Analysis (Feature 9)

Automated weekly report generation aggregating hourly data with trend visualizations.

**Key Capabilities:**
- Aggregates hourly performance data into weekly summaries
- Week-over-week comparisons
- 12-week trend analysis with moving averages
- Goal completion tracking (total, completed, at-risk, overdue)
- Performance metrics (productivity, quality, collaboration)
- Wellbeing and workload monitoring
- AI-generated insights and recommendations

**API Endpoint:**
```http
POST /api/v1/reports/generate
{
  "reportType": "WEEKLY_SUMMARY",
  "aggregationType": "user|team|department|business_unit|tenant",
  "entityId": "uuid",
  "exportFormats": ["pdf", "excel", "csv"],
  "async": true
}
```

### 2. Monthly Performance Card Generation (Feature 10)

AI-generated performance cards with KPIs, achievements, and recommendations.

**Key Capabilities:**
- Comprehensive monthly performance index calculation
- KPI scoring across goals, performance, and wellbeing
- Month-over-month comparison analytics
- Achievement tracking and highlights
- Development areas identification
- AI-generated recommendations
- Customizable performance cards

**Performance Index Calculation:**
```typescript
Performance Index = weighted average of:
- Goal Completion Rate (25%)
- Average Productivity (20%)
- Average Quality (20%)
- Average Collaboration (15%)
- Average Review Rating (10%)
- Wellbeing Score (10%)
```

**API Endpoint:**
```http
POST /api/v1/reports/generate
{
  "reportType": "MONTHLY_CARD",
  "aggregationType": "user",
  "entityId": "user-uuid",
  "exportFormats": ["pdf"]
}
```

### 3. Quarterly Business Review Engine (Feature 11)

Comprehensive quarterly reports with comparative analytics and forecasts.

**Key Capabilities:**
- Quarter-over-quarter (QoQ) comparisons
- Year-over-year (YoY) comparisons
- Monthly breakdown within quarter
- Strategic metric analysis (8 quarters history)
- Forecasting for next quarter with confidence intervals
- Pattern detection (seasonality, cycles, anomalies)
- Executive summary with actionable insights

**Metrics Analyzed:**
- Goal completion rate
- Review ratings
- Performance scores (productivity, quality, collaboration)
- Wellbeing metrics
- Engagement indicators

**API Endpoint:**
```http
POST /api/v1/reports/generate
{
  "reportType": "QUARTERLY_REVIEW",
  "aggregationType": "department",
  "entityId": "dept-uuid",
  "exportFormats": ["pdf", "excel"]
}
```

### 4. Yearly Performance Index Report (Feature 12)

Annual scorecard generation with progression tracking and succession planning.

**Key Capabilities:**
- Annual performance index calculation
- Year-over-year progression tracking
- Quarterly and monthly breakdowns
- Comprehensive 3-year trend analysis
- Achievement documentation
- Development area identification
- Succession planning insights
- Skill gap analysis

**Succession Planning Indicators:**
- Performance index >= 85
- Collaboration score >= 8
- Quality score >= 8
- High output with consistent delivery

**API Endpoint:**
```http
POST /api/v1/reports/generate
{
  "reportType": "YEARLY_INDEX",
  "aggregationType": "user",
  "entityId": "user-uuid",
  "exportFormats": ["pdf", "excel"]
}
```

### 5. Comparative Period-over-Period Analytics (Feature 13)

Automated period comparison engine with pattern detection.

**Comparison Types:**
- Week-over-Week (WoW)
- Month-over-Month (MoM)
- Quarter-over-Quarter (QoQ)
- Year-over-Year (YoY)

**Key Capabilities:**
- Multi-period data aggregation (configurable: 3-52 periods)
- Comprehensive metric comparison
- Trend strength calculation
- Pattern detection algorithms
- Best performing metrics identification
- Metrics needing attention alerts
- Automated recommendations

**Pattern Detection:**
- Seasonality detection
- Cyclical behavior analysis
- Anomaly identification (>2σ from mean)
- Sustained trend recognition

**API Endpoint:**
```http
POST /api/v1/reports/generate
{
  "reportType": "COMPARATIVE_ANALYSIS",
  "aggregationType": "team",
  "entityId": "team-uuid",
  "customConfig": {
    "periodType": "monthly",
    "numberOfPeriods": 12,
    "comparisonTypes": ["wow", "mom", "qoq", "yoy"]
  }
}
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  ┌────────────┐  ┌───────────┐  ┌──────────────┐           │
│  │ Reports    │  │ Schedules │  │ Jobs & Cache │           │
│  │ Controller │  │ Controller│  │ Controller   │           │
│  └────────────┘  └───────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Services Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Report Generation│  │ Data Aggregation │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Trend Analysis   │  │ Report Export    │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Job Queue        │  │ Report Scheduler │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐                                       │
│  │ Cache Service    │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐              │
│  │ PostgreSQL   │  │ Redis    │  │ BullMQ   │              │
│  │ (Prisma)     │  │ (Cache)  │  │ (Queue)  │              │
│  └──────────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

**Core Tables:**
- `ReportDefinition` - Report templates and configurations
- `GeneratedReport` - Stored report instances
- `PerformanceAggregation` - Pre-computed performance data
- `TrendAnalysis` - Trend analysis results
- `ReportSchedule` - Automated report schedules
- `BackgroundJob` - Job queue tracking

See `packages/database/prisma/schema.prisma` for full schema details.

## Data Aggregation Pipeline

### Aggregation Process

```typescript
// 1. Define time period
const { start, end, label } = getPeriodBoundaries('monthly', new Date());

// 2. Aggregate data from multiple sources
const metrics = await aggregateForPeriod({
  tenantId,
  aggregationType: 'user',
  entityId: userId,
  periodType: 'monthly',
  periodStart: start,
  periodEnd: end
});

// 3. Save to database for caching
await saveAggregation(params, metrics, label);

// 4. Cache in Redis for fast retrieval
await cacheAggregation(tenantId, aggregationType, entityId, periodType, label, metrics);
```

### Aggregated Metrics

**Goal Metrics:**
- Total, completed, in-progress, not-started
- On-track, at-risk, overdue counts
- Average goal progress
- Goal completion rate

**Review Metrics:**
- Total, completed, pending reviews
- Average review rating
- Review completion rate

**Feedback Metrics:**
- Total feedback count
- Positive vs constructive feedback
- Average sentiment score

**Performance Metrics:**
- Average productivity, quality, collaboration
- Overall performance score
- Workload hours, stress level, wellbeing score

**Activity Metrics:**
- Total activities
- Active users count

## Trend Analysis Algorithms

### Linear Regression

```typescript
// Calculate trend line using least squares method
const { slope, intercept, rSquared } = calculateLinearRegression(dataPoints);

// Determine trend direction
if (rSquared < 0.3) {
  trendDirection = 'volatile';
} else if (Math.abs(slope) < 0.01) {
  trendDirection = 'stable';
} else {
  trendDirection = slope > 0 ? 'increasing' : 'decreasing';
}
```

### Moving Averages

```typescript
// 7-period, 30-period, and 90-period moving averages
const ma7 = calculateMovingAverage(values, 7);
const ma30 = calculateMovingAverage(values, 30);
const ma90 = calculateMovingAverage(values, 90);
```

### Growth Rates

```typescript
// Week-over-Week
const wow = ((current - previous) / previous) * 100;

// Month-over-Month
const mom = ((current - monthAgo) / monthAgo) * 100;

// Quarter-over-Quarter
const qoq = ((current - quarterAgo) / quarterAgo) * 100;

// Year-over-Year
const yoy = ((current - yearAgo) / yearAgo) * 100;
```

### Pattern Detection

**Seasonality Detection:**
- Identify repeating peaks in data
- Calculate interval consistency
- Low variance = regular seasonality

**Cyclical Behavior:**
- Track alternating up/down trends
- High cycle frequency = cyclical pattern

**Anomaly Detection:**
- Calculate mean and standard deviation
- Flag values > 2σ from mean
- Report anomaly count and locations

**Sustained Trends:**
- Track consecutive directional movements
- >= 70% consistency = sustained trend

### Forecasting

```typescript
// Linear regression forecast
const forecastedValue = slope * nextPeriodIndex + intercept;

// Confidence calculation
const distancePenalty = 1 - periodsAhead * 0.1;
const confidence = rSquared * distancePenalty * 100;
```

## Background Job Queue (BullMQ)

### Queue Architecture

**Queues:**
1. `report-generation` - Report generation jobs
2. `data-aggregation` - Data aggregation jobs
3. `report-export` - Export processing (PDF/Excel/CSV)
4. `report-notifications` - Email notifications

**Job Processing:**
- Concurrent workers (configurable)
- Exponential backoff retry strategy
- Progress tracking
- Job result storage
- Failed job handling

### Job Lifecycle

```typescript
// 1. Add job to queue
const job = await jobQueueService.addReportJob(jobData, {
  priority: 5,
  delay: 0,
  attempts: 3
});

// 2. Worker processes job
worker.process(async (job) => {
  // Update progress
  await job.updateProgress(20);

  // Generate report
  const report = await generateReport(job.data);

  await job.updateProgress(80);

  // Return result
  return { reportId: report.id };
});

// 3. Monitor job status
const status = await jobQueueService.getJobStatus(job.id, 'report-generation');
```

## Report Scheduling

### Cron-Based Automation

**Schedule Types:**
- Weekly: `0 0 * * 1` (Every Monday at midnight)
- Monthly: `0 0 1 * *` (First day of month)
- Quarterly: `0 0 1 */3 *` (First day of quarter)
- Yearly: `0 0 1 1 *` (January 1st)
- Custom: Any valid cron expression

**Scheduler Features:**
- Automatic execution based on cron schedule
- Next run time calculation
- Retry on failure (configurable)
- Execution statistics tracking
- Pause/resume functionality
- Timezone support

### Creating a Schedule

```typescript
const schedule = await reportSchedulerService.addSchedule({
  tenantId: 'tenant-uuid',
  reportDefinitionId: 'definition-uuid',
  cronExpression: '0 9 * * 1', // Every Monday at 9 AM
  timezone: 'America/New_York',
  startDate: new Date(),
  endDate: new Date('2025-12-31')
});
```

## Caching Strategy

### Multi-Layer Caching

**Layer 1: Redis Cache**
- Hot data: frequently accessed reports
- TTL: 1-2 hours
- Key pattern: `report:{tenantId}:{reportType}:{periodLabel}`

**Layer 2: Database Cache**
- PerformanceAggregation table
- Pre-computed metrics for all periods
- Permanent storage with indexes

**Cache Invalidation:**
- On data updates (goals, reviews, feedback)
- Manual cache clear
- TTL expiration
- Entity-specific invalidation

### Cache Keys

```typescript
// Reports
report:tenant-uuid:WEEKLY_SUMMARY:Week_5_2025

// Aggregations
aggregation:tenant-uuid:user:user-uuid:monthly:January_2025

// Trends
trend:tenant-uuid:user-uuid:avgProductivity:monthly
```

## Export Formats

### PDF Export

**Features:**
- Professional formatting with PDFKit
- Company branding support
- Headers and footers
- Page numbering
- Metrics tables
- Comparison sections
- Insights and recommendations
- Color-coded changes

**Generated Files:**
- Location: `exports/reports/report_{reportId}_{timestamp}.pdf`
- Template: Customizable via report definition

### Excel Export

**Features:**
- Multi-sheet workbooks (Summary, Metrics, Trends, Comparisons)
- Formula support
- Formatting and styling
- Charts and visualizations
- Data validation
- Pivot table-ready data

**Sheets:**
1. Summary - Overview and key insights
2. Metrics - Detailed performance data
3. Trends - Trend analysis results
4. Comparisons - Period comparisons

### CSV Export

**Features:**
- Simple text format
- Easy import to spreadsheets
- Flat data structure
- Metrics and insights

## API Endpoints

### Report Generation

```http
POST /api/v1/reports/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "reportType": "WEEKLY_SUMMARY",
  "aggregationType": "user",
  "entityId": "user-uuid",
  "periodStart": "2025-01-01T00:00:00Z",
  "exportFormats": ["pdf", "excel"],
  "recipients": ["user@example.com"],
  "async": true
}

Response: 202 Accepted
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "status": "processing"
  }
}
```

### Get Report

```http
GET /api/v1/reports/{reportId}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "report-uuid",
    "title": "Weekly Performance Summary - Week 5 2025",
    "summary": "...",
    "periodLabel": "Week 5 2025",
    "data": { ... },
    "trends": { ... },
    "comparisons": { ... },
    "insights": [ ... ],
    "recommendations": [ ... ],
    "pdfUrl": "https://...",
    "excelUrl": "https://...",
    "createdAt": "2025-02-03T10:00:00Z"
  }
}
```

### List Reports

```http
GET /api/v1/reports?reportType=WEEKLY_SUMMARY&page=1&limit=20
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true
  }
}
```

### Schedule Report

```http
POST /api/v1/reports/schedules
Authorization: Bearer {token}
Content-Type: application/json

{
  "reportDefinitionId": "definition-uuid",
  "cronExpression": "0 9 * * 1",
  "timezone": "America/New_York",
  "startDate": "2025-02-03T00:00:00Z"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "scheduleType": "weekly",
    "cronExpression": "0 9 * * 1",
    "isActive": true,
    "nextRunAt": "2025-02-10T14:00:00Z"
  }
}
```

### Manage Schedules

```http
# Pause schedule
POST /api/v1/reports/schedules/{scheduleId}/pause

# Resume schedule
POST /api/v1/reports/schedules/{scheduleId}/resume

# Update schedule
PATCH /api/v1/reports/schedules/{scheduleId}
{
  "cronExpression": "0 10 * * 1",
  "isActive": true
}

# Delete schedule
DELETE /api/v1/reports/schedules/{scheduleId}

# Get schedule stats
GET /api/v1/reports/schedules/{scheduleId}/stats
```

### Job Status

```http
GET /api/v1/reports/jobs/{jobId}?queue=report-generation
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "job-uuid",
    "state": "completed",
    "progress": 100,
    "returnvalue": {
      "reportId": "report-uuid",
      "exportUrls": {
        "pdf": "https://...",
        "excel": "https://..."
      }
    }
  }
}
```

### Cache Management

```http
# Get cache stats (Admin only)
GET /api/v1/reports/cache/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "totalKeys": 1523,
    "reportKeys": 450,
    "aggregationKeys": 983,
    "trendKeys": 90,
    "memoryUsed": "45.2M"
  }
}

# Invalidate cache (Admin only)
POST /api/v1/reports/cache/invalidate
{
  "entityId": "user-uuid"  // Optional
  "reportType": "WEEKLY_SUMMARY"  // Optional
}
```

## Performance Optimization

### Database Indexing

```sql
-- Key indexes for performance
CREATE INDEX idx_perf_agg_tenant_entity_period
  ON performance_aggregations(tenant_id, entity_id, period_type, period_start);

CREATE INDEX idx_generated_reports_tenant_type_period
  ON generated_reports(tenant_id, report_type, period_type, created_at);

CREATE INDEX idx_trend_analysis_tenant_entity_metric
  ON trend_analyses(tenant_id, entity_id, metric_name, period_type);
```

### Query Optimization

- Use Prisma select projections
- Batch aggregations in parallel
- Pre-compute common aggregations
- Cache frequently accessed data

### Concurrency

- Parallel data aggregation
- Concurrent job processing
- Async report generation
- Non-blocking exports

## Configuration

### Environment Variables

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Report Export
REPORTS_EXPORT_DIR=./exports/reports

# Worker Concurrency
REPORT_WORKER_CONCURRENCY=5
AGGREGATION_WORKER_CONCURRENCY=10
EXPORT_WORKER_CONCURRENCY=5
NOTIFICATION_WORKER_CONCURRENCY=10

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=reports@pms-platform.com
```

## Monitoring & Observability

### Logging

All services include comprehensive logging:
- Info: Normal operations
- Debug: Cache hits/misses
- Warn: Scheduler issues
- Error: Job failures, generation errors

### Metrics to Monitor

- Job queue depth
- Job success/failure rate
- Average execution time
- Cache hit ratio
- Report generation latency
- Export success rate

### Health Checks

```typescript
// Check scheduler status
const status = reportSchedulerService.getStatus();

// Check queue stats
const queueStats = await jobQueueService.getQueueStats('report-generation');

// Check cache stats
const cacheStats = await reportCacheService.getCacheStats();
```

## Testing

### Unit Tests

```bash
npm test apps/api/src/services/reporting/
```

### Integration Tests

```bash
npm test apps/api/src/modules/reports/
```

### Test Coverage Requirements

- Services: 80%+ coverage
- Controllers: 70%+ coverage
- Critical algorithms: 95%+ coverage

## Deployment

### Database Migration

```bash
cd packages/database
npx prisma migrate dev --name add_periodic_analytics_reporting_engine
npx prisma generate
```

### Starting Services

```typescript
// In apps/api/src/index.ts

import { reportSchedulerService } from './services/reporting/report-scheduler.service';
import { jobQueueService } from './services/reporting/job-queue.service';

// Start scheduler
await reportSchedulerService.start();

// Workers are automatically started by jobQueueService
```

### Graceful Shutdown

```typescript
// On SIGTERM/SIGINT
await reportSchedulerService.stop();
await jobQueueService.shutdown();
```

## Troubleshooting

### Common Issues

**Reports not generating:**
- Check job queue status
- Verify database connectivity
- Check worker logs
- Ensure Redis is running

**Cache not working:**
- Verify Redis connection
- Check cache key patterns
- Review TTL settings
- Monitor memory usage

**Scheduler not running:**
- Verify cron expressions
- Check scheduler status
- Review schedule database records
- Check timezone configuration

### Debug Mode

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Check specific report generation
const report = await reportGenerationService.generateReport({
  tenantId,
  reportType: 'WEEKLY_SUMMARY',
  aggregationType: 'user',
  entityId: userId
});
```

## Future Enhancements

1. **Advanced Visualizations**
   - Interactive charts
   - Drill-down capabilities
   - Custom dashboards

2. **Machine Learning**
   - Predictive analytics
   - Anomaly detection improvements
   - Automated insights generation

3. **Real-time Reports**
   - Live data streaming
   - WebSocket updates
   - Real-time collaboration

4. **Custom Report Builder**
   - Drag-and-drop interface
   - Custom metric selection
   - Template designer

5. **Advanced Distribution**
   - Slack integration
   - Teams integration
   - Mobile push notifications

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/your-org/pms-platform/issues
- Documentation: https://docs.pms-platform.com
- Email: support@pms-platform.com

---

**Last Updated:** February 3, 2025
**Version:** 1.0.0
**Author:** PMS Platform Team
