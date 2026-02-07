# Real-Time Performance Tracking Module

## Overview

The Real-Time Performance Tracking Module provides comprehensive, live monitoring and analysis of employee and team performance metrics. It includes 8 key features designed to provide instant insights and proactive alerts.

## Features

### Feature 1: Hourly Performance Tracker

Tracks performance metrics on an hourly basis for granular visibility.

**API Endpoints:**
- `GET /api/v1/realtime-performance/hourly` - Get hourly metrics
- `POST /api/v1/realtime-performance/hourly` - Record hourly metrics
- `GET /api/v1/realtime-performance/snapshot` - Get current performance snapshot

**Metrics Tracked:**
- Tasks completed/created
- Active/focus/meeting minutes
- Productivity score (0-100)
- Engagement score (0-100)
- Collaboration score (0-100)

### Feature 2: 24/7 Activity Monitor with AI Detection

Monitors activity events around the clock with AI-powered pattern detection.

**API Endpoints:**
- `POST /api/v1/realtime-performance/activity` - Record activity event
- `GET /api/v1/realtime-performance/activity` - Get activity stream
- `GET /api/v1/realtime-performance/activity/summary` - Get activity summary

**Event Types:**
- TASK_COMPLETED, TASK_CREATED, TASK_UPDATED
- GOAL_UPDATED, GOAL_COMPLETED
- REVIEW_SUBMITTED, FEEDBACK_GIVEN
- MESSAGE_SENT, MEETING_ATTENDED
- LOGIN, LOGOUT

### Feature 3: Real-Time Goal Progress Dashboard

Color-coded goal tracking with real-time progress updates.

**API Endpoints:**
- `GET /api/v1/realtime-performance/goals/dashboard` - Get goal progress dashboard

**Status Colors:**
- 🟢 Green: On track (progress >= expected)
- 🟡 Yellow: At risk (progress 10-20% behind)
- 🔴 Red: Off track (progress > 20% behind)

### Feature 4: Deadline Proximity Alert System

Proactive alerts for approaching deadlines with completion probability.

**API Endpoints:**
- `GET /api/v1/realtime-performance/deadlines/check` - Check and generate alerts
- `GET /api/v1/realtime-performance/deadlines/alerts` - Get active alerts

**Alert Severities:**
- Critical: < 24 hours, < 50% complete
- High: < 3 days, < 70% complete
- Medium: < 7 days, < 80% complete
- Low: < 14 days, < 90% complete

**Completion Probability Calculation:**
```
probability = (daysRemaining / estimatedDaysToComplete) * 100
estimatedDaysToComplete = remainingProgress / averageDailyVelocity
```

### Feature 5: Live Workload Distribution Analyzer

Analyzes individual and team workload with recommendations.

**API Endpoints:**
- `GET /api/v1/realtime-performance/workload` - Analyze individual workload
- `GET /api/v1/realtime-performance/workload/team` - Get team distribution

**Workload Status:**
- Underloaded: < 50% capacity
- Optimal: 50-85% capacity
- Heavy: 85-100% capacity
- Overloaded: > 100% capacity

**Team Distribution Metrics:**
- Gini coefficient for workload inequality (0 = equal, 1 = unequal)
- Redistribution recommendations

### Feature 6: Instant Performance Anomaly Detector

AI-powered detection of performance anomalies using statistical methods.

**API Endpoints:**
- `GET /api/v1/realtime-performance/anomalies/detect` - Detect anomalies

**Detection Algorithm:**
Uses Z-score analysis on 30-day baseline data.

```
Z-score = (currentValue - mean) / standardDeviation
```

**Severity Classification:**
| Z-Score (absolute) | Severity |
|-------------------|----------|
| < 2.0 | Low |
| 2.0 - 2.5 | Medium |
| 2.5 - 3.0 | High |
| >= 3.0 | Critical |

**Anomaly Types:**
- `sudden_drop` - Sudden decrease > 30%
- `sudden_spike` - Sudden increase > 30%
- `consistent_decline` - 3+ days declining trend
- `unusual_pattern` - Activity outside normal hours
- `extended_inactivity` - No activity for > 2 hours during work time

### Feature 7: Real-Time Communication Sentiment Gauge

Analyzes sentiment in communications for team morale monitoring.

**API Endpoints:**
- `GET /api/v1/realtime-performance/sentiment` - Analyze sentiment
- `GET /api/v1/realtime-performance/sentiment/team` - Get team morale

**Sentiment Metrics:**
- Overall score (-1 to +1)
- Positivity ratio (positive / total)
- Collaboration sentiment
- Stress indicators

**Morale Alert Thresholds:**
- Alert triggered when average sentiment < -0.3

### Feature 8: Live Project Milestone Tracker

Track project milestones with dependencies and auto-detection.

**API Endpoints:**
- `POST /api/v1/realtime-performance/milestones` - Create milestone
- `PATCH /api/v1/realtime-performance/milestones/:id` - Update milestone
- `GET /api/v1/realtime-performance/milestones` - Get milestones
- `GET /api/v1/realtime-performance/milestones/timeline` - Get timeline view
- `POST /api/v1/realtime-performance/milestones/detect` - Auto-detect milestones

**Milestone Types:**
- `checkpoint` - Progress checkpoint
- `phase_completion` - Phase completed
- `key_result` - Key result achieved
- `review_point` - Review/approval point
- `deliverable` - Deliverable completed

**Milestone Statuses:**
- pending, in_progress, completed, delayed, at_risk

## WebSocket Integration

Real-time updates are delivered via WebSocket at `/ws/realtime-performance`.

**Subscription Events:**
```json
{
  "type": "subscribe",
  "channels": ["metrics", "anomalies", "deadlines", "milestones"]
}
```

**Broadcast Events:**
- `hourly_metrics_updated`
- `anomaly_detected`
- `deadline_alert`
- `milestone_updated`
- `workload_changed`
- `sentiment_alert`

## Database Schema

### Core Tables:
- `hourly_performance_metrics` - Hourly aggregated metrics
- `daily_performance_metrics` - Daily aggregated metrics
- `activity_events` - Activity event log
- `performance_anomalies` - Detected anomalies
- `deadline_alerts` - Deadline proximity alerts
- `workload_snapshots` - Workload snapshots
- `communication_sentiment` - Sentiment records
- `project_milestones` - Milestone definitions
- `milestone_progress_events` - Milestone progress history

## Configuration

### Environment Variables:
```env
# Anomaly Detection
ANOMALY_Z_SCORE_THRESHOLD=2.0
ANOMALY_BASELINE_DAYS=30

# Deadline Alerts
DEADLINE_ALERT_DAYS_CRITICAL=1
DEADLINE_ALERT_DAYS_HIGH=3
DEADLINE_ALERT_DAYS_MEDIUM=7
DEADLINE_ALERT_DAYS_LOW=14

# Workload
WORKLOAD_CAPACITY_HOURS_PER_WEEK=40
WORKLOAD_OPTIMAL_MIN=50
WORKLOAD_OPTIMAL_MAX=85
```

## Testing

Run unit tests:
```bash
npm run test -- --filter=realtime-performance
```

Run specific test suite:
```bash
npm run test -- realtime-performance.service.test.ts
```

## Usage Examples

### Recording Hourly Metrics
```typescript
POST /api/v1/realtime-performance/hourly
{
  "tasksCompleted": 5,
  "activeMinutes": 45,
  "focusMinutes": 30,
  "meetingMinutes": 15
}
```

### Detecting Anomalies
```typescript
GET /api/v1/realtime-performance/anomalies/detect

Response:
{
  "success": true,
  "data": [
    {
      "isAnomaly": true,
      "anomalyType": "sudden_drop",
      "severity": "high",
      "metricName": "productivity_score",
      "expectedValue": 82.5,
      "actualValue": 45.0,
      "deviationPercentage": -45.4,
      "zScore": -3.2
    }
  ]
}
```

### Creating Milestone
```typescript
POST /api/v1/realtime-performance/milestones
{
  "goalId": "goal-123",
  "title": "Phase 1 Complete",
  "milestoneType": "phase_completion",
  "plannedDate": "2024-03-31T00:00:00Z",
  "dependsOn": ["milestone-prev"]
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Hourly   │ │ Goals    │ │ Deadline │ │ Anomaly  │       │
│  │ Tracker  │ │ Dashboard│ │ Alerts   │ │ Detector │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│  ┌────┴────────────┴────────────┴────────────┴────┐        │
│  │              React Query + WebSocket            │        │
│  └─────────────────────┬──────────────────────────┘        │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express)                       │
│  ┌──────────────────────────────────────────────────┐      │
│  │          Real-Time Performance Controller         │      │
│  └────────────────────────┬─────────────────────────┘      │
│                           │                                 │
│  ┌────────────────────────▼─────────────────────────┐      │
│  │          Real-Time Performance Service           │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │      │
│  │  │ Anomaly │ │ Workload│ │Sentiment│            │      │
│  │  │ Engine  │ │ Analyzer│ │ Analyzer│            │      │
│  │  └─────────┘ └─────────┘ └─────────┘            │      │
│  └────────────────────────┬─────────────────────────┘      │
│                           │                                 │
│  ┌────────────────────────▼─────────────────────────┐      │
│  │              WebSocket Handler                    │      │
│  │         (Redis Pub/Sub for scaling)              │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database (PostgreSQL)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ hourly_      │ │ activity_    │ │ performance_ │        │
│  │ performance_ │ │ events       │ │ anomalies    │        │
│  │ metrics      │ │              │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

1. **Hourly Aggregation**: Raw events are aggregated hourly to reduce data volume
2. **Redis Caching**: Frequently accessed metrics are cached in Redis
3. **Batch Processing**: Anomaly detection runs on batched historical data
4. **Index Optimization**: Database indexes on tenant_id, user_id, and timestamps
5. **WebSocket Scaling**: Redis Pub/Sub enables horizontal scaling

## Security

- All endpoints require authentication
- Tenant isolation enforced at service level
- Manager-only access for team-level data
- Audit logging for sensitive operations
