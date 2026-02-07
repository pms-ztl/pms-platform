# AI-Driven Insights & Intelligence Engine

## Overview

The AI-Driven Insights & Intelligence Engine provides advanced machine learning and artificial intelligence capabilities for the Performance Management System (PMS). This comprehensive suite of features enables data-driven decision making, predictive analytics, and intelligent automation for performance management.

### Features Included

- **Feature 41**: Sentiment Analysis of Work Communications
- **Feature 42**: Productivity Prediction Engine
- **Feature 43**: Engagement Scoring Algorithm
- **Feature 44**: Anomaly Detection & Risk Flagging
- **Feature 45**: AI-Powered Performance Benchmarking

## Architecture

### System Design

The AI engine follows a microservices architecture with two main components:

```
┌─────────────────────────────────────────────────────────────┐
│                    PMS Application                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │  TypeScript  │  │  PostgreSQL  │     │
│  │  (Next.js)   │←→│  API Service │←→│   Database   │     │
│  └──────────────┘  └──────┬───────┘  └──────────────┘     │
└────────────────────────────┼──────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               ML Service (Python/FastAPI)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Sentiment   │  │ Productivity │  │  Engagement  │     │
│  │   Analyzer   │  │  Predictor   │  │    Scorer    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Anomaly    │  │  Performance │                        │
│  │   Detector   │  │ Benchmarker  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**ML Service (Python)**:
- FastAPI - High-performance async web framework
- scikit-learn - Machine learning algorithms
- TensorFlow/PyTorch - Deep learning models
- Transformers (Hugging Face) - NLP models
- NLTK/spaCy - Natural language processing
- pandas/numpy - Data processing
- PyOD - Anomaly detection

**API Service (TypeScript)**:
- Express.js - Web framework
- Axios - HTTP client
- Prisma ORM - Database access
- PostgreSQL - Data persistence

---

## Feature 41: Sentiment Analysis of Work Communications

### Description

NLP-based sentiment analysis system that analyzes text from emails, chat messages, feedback, and reports to understand employee sentiment, emotions, and communication patterns.

### ML Models Used

1. **VADER (Valence Aware Dictionary and sEntiment Reasoner)**
   - Lexicon-based sentiment analysis
   - Specialized for social media text
   - Compound score range: -1 (negative) to +1 (positive)

2. **DistilBERT Transformer**
   - Model: `distilbert-base-uncased-finetuned-sst-2-english`
   - Fine-tuned for sentiment classification
   - Provides probability scores for positive/negative

3. **Ensemble Approach**
   - Combines VADER (30%) + DistilBERT (70%)
   - Weighted average for final sentiment score

### Capabilities

- **Sentiment Scoring**: -1.0 (very negative) to +1.0 (very positive)
- **Emotion Detection**: Joy, sadness, anger, fear, surprise, neutral
- **Topic Extraction**: Key topics and themes from text
- **Intent Classification**: Question, request, complaint, feedback, update
- **Confidence Scoring**: Model confidence for each prediction
- **Trend Analysis**: Sentiment trends over time (daily, weekly, monthly)

### API Endpoints

#### POST `/api/ai-insights/sentiment/analyze`

Analyze sentiment of text communication.

**Request Body**:
```json
{
  "text": "I'm really enjoying working on this new project. The team collaboration has been excellent!",
  "sourceType": "SLACK",
  "sourceId": "msg-12345",
  "sourceReference": "channel-general"
}
```

**Response**:
```json
{
  "id": "uuid",
  "sentimentScore": 0.85,
  "sentimentLabel": "POSITIVE",
  "confidence": 0.92,
  "emotions": {
    "joy": 0.75,
    "neutral": 0.20,
    "sadness": 0.05
  },
  "dominantEmotion": "joy",
  "topics": ["project", "team", "collaboration"],
  "intent": "feedback",
  "modelVersion": "v1.0",
  "analyzedAt": "2025-01-15T10:30:00Z"
}
```

#### GET `/api/ai-insights/sentiment/trend`

Get sentiment trend for a user over a time period.

**Query Parameters**:
- `userId` (required): User ID
- `periodType`: DAILY | WEEKLY | MONTHLY
- `periodStart`: Start date (ISO 8601)
- `periodEnd`: End date (ISO 8601)

**Response**:
```json
{
  "id": "uuid",
  "userId": "user-123",
  "periodType": "WEEKLY",
  "periodStart": "2025-01-01T00:00:00Z",
  "periodEnd": "2025-01-07T23:59:59Z",
  "averageSentiment": 0.65,
  "sentimentDirection": "IMPROVING",
  "positiveCount": 42,
  "neutralCount": 15,
  "negativeCount": 3,
  "totalAnalyzed": 60,
  "emotionDistribution": {
    "joy": 0.45,
    "neutral": 0.35,
    "sadness": 0.10,
    "anger": 0.05,
    "surprise": 0.05
  }
}
```

#### GET `/api/ai-insights/sentiment/history`

Get sentiment analysis history for a user.

**Query Parameters**:
- `userId` (required): User ID
- `limit`: Number of records (default: 100)
- `sourceType`: Filter by source type

### Database Schema

```prisma
model SentimentAnalysis {
  id                  String    @id @default(uuid()) @db.Uuid
  tenantId            String    @map("tenant_id") @db.Uuid
  userId              String    @map("user_id") @db.Uuid
  sourceType          String    @map("source_type")
  sourceId            String?   @map("source_id")
  sourceReference     String?   @map("source_reference")
  textSample          String    @map("text_sample") @db.Text
  sentimentScore      Decimal   @map("sentiment_score") @db.Decimal(4, 3)
  sentimentLabel      String    @map("sentiment_label")
  confidence          Decimal   @map("confidence") @db.Decimal(3, 2)
  emotions            Json      @default("{}") @map("emotions")
  dominantEmotion     String?   @map("dominant_emotion")
  topics              String[]  @default([])
  intent              String?
  modelVersion        String    @map("model_version")
  analyzedAt          DateTime  @default(now()) @map("analyzed_at")

  tenant              Tenant    @relation(fields: [tenantId], references: [id])
  user                User      @relation(fields: [userId], references: [id])

  @@index([tenantId, userId])
  @@index([analyzedAt])
  @@map("sentiment_analyses")
}

model SentimentTrend {
  id                    String    @id @default(uuid()) @db.Uuid
  tenantId              String    @map("tenant_id") @db.Uuid
  userId                String    @map("user_id") @db.Uuid
  periodType            String    @map("period_type")
  periodStart           DateTime  @map("period_start")
  periodEnd             DateTime  @map("period_end")
  averageSentiment      Decimal   @map("average_sentiment") @db.Decimal(4, 3)
  sentimentDirection    String    @map("sentiment_direction")
  positiveCount         Int       @default(0) @map("positive_count")
  neutralCount          Int       @default(0) @map("neutral_count")
  negativeCount         Int       @default(0) @map("negative_count")
  totalAnalyzed         Int       @map("total_analyzed")
  emotionDistribution   Json      @map("emotion_distribution")
  calculatedAt          DateTime  @default(now()) @map("calculated_at")

  tenant                Tenant    @relation(fields: [tenantId], references: [id])
  user                  User      @relation(fields: [userId], references: [id])

  @@unique([tenantId, userId, periodType, periodStart])
  @@index([tenantId, userId])
  @@map("sentiment_trends")
}
```

### Integration Example

```typescript
import { SentimentAnalysisService } from './services/ai-insights';

const sentimentService = new SentimentAnalysisService();

// Analyze email sentiment
const emailAnalysis = await sentimentService.analyzeSentiment({
  tenantId: 'tenant-123',
  userId: 'user-456',
  text: emailContent,
  sourceType: 'EMAIL',
  sourceId: emailId
});

// Check if sentiment is concerning
if (emailAnalysis.sentimentScore < -0.5) {
  console.log('Negative sentiment detected!');
  // Trigger alert or intervention
}

// Get weekly trend
const weeklyTrend = await sentimentService.getSentimentTrend({
  tenantId: 'tenant-123',
  userId: 'user-456',
  periodType: 'WEEKLY',
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-01-07')
});
```

---

## Feature 42: Productivity Prediction Engine

### Description

Machine learning model that forecasts individual and team productivity based on historical performance data, work patterns, and contextual factors.

### ML Models Used

1. **Random Forest Regressor**
   - Ensemble learning method
   - 100 decision trees
   - Handles non-linear relationships
   - Feature importance analysis

2. **Gradient Boosting Regressor**
   - Boosting algorithm for high accuracy
   - Used for ensemble prediction
   - Confidence interval calculation

### Feature Engineering

The model extracts 20+ features from various data sources:

**Code Activity** (from Git/GitHub):
- Commits count (7/30 day windows)
- Pull requests created/merged
- Code review participation
- Lines of code added/modified

**Task Management**:
- Tasks completed
- Task completion rate
- Average task duration
- Overdue tasks ratio

**Meeting & Collaboration**:
- Meeting hours
- Meeting attendance rate
- Collaboration score
- Communication frequency

**Performance Metrics**:
- Goal progress percentage
- Previous productivity scores
- Engagement scores
- Sentiment scores

**Temporal Features**:
- Day of week
- Week of month
- Quarter
- Tenure (months at company)

### API Endpoints

#### POST `/api/ai-insights/productivity/predict`

Predict productivity score for an entity.

**Request Body**:
```json
{
  "entityType": "USER",
  "entityId": "user-123",
  "predictionType": "WEEKLY",
  "predictionDate": "2025-01-20",
  "features": {
    "commits_7d": 15,
    "prs_created_7d": 3,
    "tasks_completed_7d": 8,
    "meeting_hours_7d": 12,
    "engagement_score": 75
  }
}
```

**Response**:
```json
{
  "id": "uuid",
  "predictedScore": 82.5,
  "confidence": 0.88,
  "confidenceInterval": {
    "lower": 75.3,
    "upper": 89.7
  },
  "featureImportance": {
    "tasks_completed_7d": 0.25,
    "commits_7d": 0.20,
    "engagement_score": 0.18,
    "meeting_hours_7d": 0.15
  },
  "positiveFac tors": [
    "High task completion rate",
    "Strong code contribution",
    "Good engagement level"
  ],
  "negativeFac tors": [
    "Meeting hours above optimal"
  ],
  "recommendations": [
    "Reduce meeting time by 20% to increase focus time",
    "Continue current task completion pace"
  ]
}
```

#### POST `/api/ai-insights/productivity/extract-features`

Extract features for productivity prediction.

**Request Body**:
```json
{
  "entityType": "USER",
  "entityId": "user-123",
  "featureDate": "2025-01-15"
}
```

**Response**:
```json
{
  "features": {
    "commits_7d": 15,
    "commits_30d": 62,
    "prs_created_7d": 3,
    "prs_merged_7d": 2,
    "code_reviews_given_7d": 8,
    "tasks_completed_7d": 8,
    "task_completion_rate": 0.89,
    "meeting_hours_7d": 12,
    "meeting_attendance_rate": 0.95,
    "engagement_score": 75,
    "sentiment_score": 0.65,
    "goal_progress": 0.72
  }
}
```

#### GET `/api/ai-insights/productivity/predictions`

Get historical productivity predictions.

#### POST `/api/ai-insights/productivity/validate`

Validate prediction accuracy with actual results.

**Request Body**:
```json
{
  "predictionId": "pred-123",
  "actualScore": 80.0
}
```

### Model Training

The productivity prediction model requires training with historical data:

```python
from models.productivity_predictor import ProductivityPredictor
import pandas as pd

# Load historical data
training_data = pd.read_csv('productivity_training_data.csv')

# Initialize and train
predictor = ProductivityPredictor()
predictor.train(
    training_data=training_data,
    target_column='productivity_score'
)

# Save trained model
predictor.save_model('models/productivity_v1.pkl')
```

**Training Data Format**:
```csv
user_id,commits_7d,prs_created_7d,tasks_completed_7d,...,productivity_score
user-1,12,2,6,75.5
user-2,18,4,9,85.2
```

### Database Schema

```prisma
model ProductivityPrediction {
  id                  String    @id @default(uuid()) @db.Uuid
  tenantId            String    @map("tenant_id") @db.Uuid
  entityType          String    @map("entity_type")
  entityId            String    @map("entity_id")
  predictionType      String    @map("prediction_type")
  predictionDate      DateTime  @map("prediction_date")
  predictedScore      Decimal   @map("predicted_score") @db.Decimal(5, 2)
  confidence          Decimal   @map("confidence") @db.Decimal(3, 2)
  confidenceInterval  Json      @map("confidence_interval")
  features            Json      @map("features")
  featureImportance   Json      @map("feature_importance")
  modelVersion        String    @map("model_version")
  actualScore         Decimal?  @map("actual_score") @db.Decimal(5, 2)
  predictionError     Decimal?  @map("prediction_error") @db.Decimal(5, 2)
  validatedAt         DateTime? @map("validated_at")
  createdAt           DateTime  @default(now()) @map("created_at")

  tenant              Tenant    @relation(fields: [tenantId], references: [id])

  @@index([tenantId, entityType, entityId])
  @@index([predictionDate])
  @@map("productivity_predictions")
}
```

---

## Feature 43: Engagement Scoring Algorithm

### Description

Real-time engagement calculation from activity patterns, behaviors, and interactions. Provides multi-dimensional engagement scoring with risk assessment.

### Scoring Components

The engagement score (0-100) comprises 5 weighted components:

1. **Participation (25%)**
   - Meeting attendance rate
   - Meeting participation (speaking, contributing)
   - Discussion forum activity
   - Event attendance
   - Survey completion rate

2. **Communication (20%)**
   - Message frequency
   - Response rate to mentions
   - Communication clarity
   - Emoji/reaction usage

3. **Collaboration (20%)**
   - Code reviews given
   - Pair programming sessions
   - Knowledge sharing (docs, presentations)
   - Cross-team collaborations
   - Mentoring activities

4. **Initiative (20%)**
   - Self-started tasks/projects
   - Process improvement suggestions
   - Voluntary contributions
   - Proactive problem-solving
   - Learning activities

5. **Responsiveness (15%)**
   - Average response time
   - Response rate
   - Availability during working hours
   - Acknowledgment rate

### Engagement Levels

| Score Range | Level      | Interpretation                    |
|-------------|------------|-----------------------------------|
| 80-100      | VERY_HIGH  | Highly engaged, active contributor |
| 65-79       | HIGH       | Good engagement, consistent       |
| 45-64       | MODERATE   | Average engagement                |
| 30-44       | LOW        | Below average, needs attention    |
| 0-29        | VERY_LOW   | At-risk of disengagement          |

### Risk Assessment

**Risk Levels**:
- **CRITICAL** (risk score ≥ 50): Immediate intervention needed
- **HIGH** (risk score ≥ 30): Schedule check-in within days
- **MEDIUM** (risk score ≥ 15): Monitor and follow up
- **LOW** (risk score < 15): No immediate concern

**Risk Factors**:
- Overall engagement < 40
- Declining trend (> -10 points)
- Low participation (< 30)
- Minimal communication (< 30)
- No proactive behavior (< 20)
- Poor responsiveness (< 30)

### API Endpoints

#### POST `/api/ai-insights/engagement/calculate`

Calculate engagement score for a user.

**Request Body**:
```json
{
  "userId": "user-123",
  "scoreDate": "2025-01-15",
  "calculationPeriod": "WEEKLY"
}
```

**Response**:
```json
{
  "id": "uuid",
  "userId": "user-123",
  "overallScore": 72.5,
  "scoreLevel": "HIGH",
  "componentScores": {
    "participation": 75.0,
    "communication": 68.0,
    "collaboration": 80.0,
    "initiative": 65.0,
    "responsiveness": 72.0
  },
  "activityMetrics": {
    "totalActivities": 156,
    "activeDays": 5,
    "avgDailyActivities": 31.2,
    "consistencyScore": 85.5
  },
  "engagementPatterns": {
    "peakActivityHour": "10:00",
    "mostActiveDay": "Tuesday",
    "consistencyScore": 85.5,
    "engagementDistribution": {
      "synchronous": 0.45,
      "asynchronous": 0.55
    }
  },
  "trendDirection": "IMPROVING",
  "changeFromPrevious": 5.2,
  "weekOverWeekChange": 8.5,
  "atRisk": false,
  "riskLevel": "LOW",
  "riskFactors": []
}
```

#### POST `/api/ai-insights/engagement/track-event`

Track individual engagement event.

**Request Body**:
```json
{
  "eventType": "MEETING_ATTENDED",
  "eventCategory": "PARTICIPATION",
  "eventData": {
    "meetingId": "meet-123",
    "duration": 60,
    "spoke": true
  },
  "engagementImpact": 5.0,
  "positiveIndicator": true,
  "sourceSystem": "CALENDAR"
}
```

#### GET `/api/ai-insights/engagement/history`

Get engagement score history.

#### GET `/api/ai-insights/engagement/at-risk`

Get list of at-risk users based on engagement.

**Query Parameters**:
- `riskLevel`: CRITICAL | HIGH | MEDIUM

**Response**:
```json
{
  "atRiskUsers": [
    {
      "userId": "user-456",
      "currentScore": 28.5,
      "scoreLevel": "VERY_LOW",
      "riskLevel": "CRITICAL",
      "riskFactors": [
        "Overall engagement below threshold",
        "Declining engagement trend",
        "Very low participation in meetings and activities"
      ],
      "lastCalculated": "2025-01-15T10:00:00Z"
    }
  ],
  "totalAtRisk": 1
}
```

### Database Schema

```prisma
model EngagementScore {
  id                  String    @id @default(uuid()) @db.Uuid
  tenantId            String    @map("tenant_id") @db.Uuid
  userId              String    @map("user_id") @db.Uuid
  scoreDate           DateTime  @map("score_date")
  overallScore        Decimal   @map("overall_score") @db.Decimal(5, 2)
  scoreLevel          String    @map("score_level")
  participationScore  Decimal   @map("participation_score") @db.Decimal(5, 2)
  communicationScore  Decimal   @map("communication_score") @db.Decimal(5, 2)
  collaborationScore  Decimal   @map("collaboration_score") @db.Decimal(5, 2)
  initiativeScore     Decimal   @map("initiative_score") @db.Decimal(5, 2)
  responsivenessScore Decimal   @map("responsiveness_score") @db.Decimal(5, 2)
  trendDirection      String?   @map("trend_direction")
  atRisk              Boolean   @default(false) @map("at_risk")
  riskLevel           String?   @map("risk_level")
  riskFactors         String[]  @default([]) @map("risk_factors")
  calculatedAt        DateTime  @default(now()) @map("calculated_at")

  tenant              Tenant    @relation(fields: [tenantId], references: [id])
  user                User      @relation(fields: [userId], references: [id])

  @@unique([tenantId, userId, scoreDate])
  @@index([tenantId, userId])
  @@index([atRisk])
  @@map("engagement_scores")
}

model EngagementEvent {
  id                  String    @id @default(uuid()) @db.Uuid
  tenantId            String    @map("tenant_id") @db.Uuid
  userId              String    @map("user_id") @db.Uuid
  eventType           String    @map("event_type")
  eventCategory       String    @map("event_category")
  eventData           Json      @map("event_data")
  engagementImpact    Decimal   @map("engagement_impact") @db.Decimal(5, 2)
  positiveIndicator   Boolean   @map("positive_indicator")
  sourceSystem        String?   @map("source_system")
  occurredAt          DateTime  @default(now()) @map("occurred_at")

  tenant              Tenant    @relation(fields: [tenantId], references: [id])
  user                User      @relation(fields: [userId], references: [id])

  @@index([tenantId, userId])
  @@index([occurredAt])
  @@map("engagement_events")
}
```

---

## Feature 44: Anomaly Detection & Risk Flagging

### Description

Pattern recognition system for detecting burnout, disengagement, performance decline, and other concerning behavioral patterns using machine learning anomaly detection.

### ML Models Used

1. **Isolation Forest**
   - Unsupervised anomaly detection
   - 100 estimators
   - Contamination factor: 0.1 (10% expected anomalies)
   - Anomaly score range: 0-100

2. **Alternative Models** (Configurable):
   - Local Outlier Factor (LOF)
   - K-Nearest Neighbors (KNN)

### Anomaly Types Detected

1. **BURNOUT**
   - Hours worked > 55 AND
   - Productivity score < 40 AND
   - Sentiment score < -0.3

2. **DISENGAGEMENT**
   - Engagement score < 30 AND
   - Response time > 24 hours AND
   - Meeting attendance < 50%

3. **PERFORMANCE_DECLINE**
   - Productivity score < 40 AND
   - 30-day productivity trend < -10

4. **OVERWORK**
   - Hours worked > 60 OR
   - Meeting hours > 30

5. **QUALITY_DECLINE**
   - Bug rate > 0.15 OR
   - Code quality score < 50

6. **SOCIAL_WITHDRAWAL**
   - Collaboration score < 30 AND
   - Communication frequency < 10

7. **NEGATIVE_SENTIMENT_SPIKE**
   - Sentiment score < -0.5 OR
   - 30-day sentiment trend < -0.3

### Severity Levels

| Anomaly Score | Severity | Action Required                |
|---------------|----------|--------------------------------|
| 80-100        | CRITICAL | Immediate intervention (24h)   |
| 60-79         | HIGH     | Schedule check-in (2-3 days)   |
| 40-59         | MEDIUM   | Monitor and follow up (1 week) |
| 0-39          | LOW      | Note and track                 |

### API Endpoints

#### POST `/api/ai-insights/anomaly/detect`

Detect anomalies for an entity.

**Request Body**:
```json
{
  "entityType": "USER",
  "entityId": "user-123"
}
```

**Response**:
```json
{
  "id": "uuid",
  "isAnomaly": true,
  "anomalyScore": 75.5,
  "confidenceScore": 0.85,
  "anomalyTypes": ["BURNOUT", "OVERWORK"],
  "severity": "HIGH",
  "detectionMethod": "isolation_forest",
  "currentMetrics": {
    "productivityScore": 35,
    "engagementScore": 42,
    "sentimentScore": -0.45,
    "hoursWorked": 58,
    "tasksCompleted": 3,
    "meetingHours": 28
  },
  "deviations": {
    "hoursWorked": {
      "current": 58,
      "expected": 40,
      "deviation": 3.6,
      "deviationPercentage": 45.0
    },
    "productivityScore": {
      "current": 35,
      "expected": 75,
      "deviation": -2.8,
      "deviationPercentage": -53.3
    }
  },
  "contributingFactors": [
    "Hours Worked increased by 45.0%",
    "Productivity Score decreased by 53.3%",
    "Sentiment Score decreased by 35.0%"
  ],
  "riskLevel": "HIGH",
  "urgency": "SOON",
  "recommendations": [
    "Immediate 1-on-1 to assess workload and wellbeing",
    "Consider workload redistribution",
    "Review and prioritize workload",
    "Set boundaries on working hours"
  ],
  "suggestedActions": [
    {
      "action": "Schedule immediate check-in",
      "priority": "URGENT",
      "timeframe": "Within 24 hours"
    },
    {
      "action": "Assess mental health and wellbeing",
      "priority": "HIGH",
      "timeframe": "Within 2 days"
    }
  ]
}
```

#### POST `/api/ai-insights/anomaly/:anomalyId/acknowledge`

Acknowledge detection of anomaly.

**Response**:
```json
{
  "id": "uuid",
  "acknowledgedAt": "2025-01-15T14:30:00Z",
  "acknowledgedBy": "manager-123"
}
```

#### POST `/api/ai-insights/anomaly/:anomalyId/resolve`

Mark anomaly as resolved.

**Request Body**:
```json
{
  "resolution": "Workload redistributed, employee taking 3 days off"
}
```

#### GET `/api/ai-insights/anomaly/active`

Get active (unresolved) anomalies.

#### GET `/api/ai-insights/anomaly/statistics`

Get anomaly detection statistics.

### Model Training

```python
from models.anomaly_detector import AnomalyDetector
import pandas as pd

# Load historical normal behavior data
historical_data = pd.read_csv('normal_behavior_data.csv')

# Initialize and fit detector
detector = AnomalyDetector(method='isolation_forest', contamination=0.1)
detector.fit(historical_data)

# Save fitted detector
detector.save_model('models/anomaly_detector_v1.pkl')
```

### Database Schema

```prisma
model AnomalyDetection {
  id                  String    @id @default(uuid()) @db.Uuid
  tenantId            String    @map("tenant_id") @db.Uuid
  entityType          String    @map("entity_type")
  entityId            String    @map("entity_id")
  anomalyScore        Decimal   @map("anomaly_score") @db.Decimal(5, 2)
  isAnomaly           Boolean   @map("is_anomaly")
  anomalyTypes        String[]  @map("anomaly_types")
  severity            String    @map("severity")
  confidenceScore     Decimal   @map("confidence_score") @db.Decimal(3, 2)
  detectionMethod     String    @map("detection_method")
  metrics             Json      @map("metrics")
  deviations          Json      @map("deviations")
  contributingFactors String[]  @map("contributing_factors")
  recommendations     String[]  @map("recommendations")
  status              String    @default("ACTIVE") @map("status")
  acknowledgedBy      String?   @map("acknowledged_by") @db.Uuid
  acknowledgedAt      DateTime? @map("acknowledged_at")
  resolvedAt          DateTime? @map("resolved_at")
  resolution          String?   @map("resolution") @db.Text
  detectedAt          DateTime  @default(now()) @map("detected_at")

  tenant              Tenant    @relation(fields: [tenantId], references: [id])

  @@index([tenantId, entityType, entityId])
  @@index([status])
  @@index([severity])
  @@map("anomaly_detections")
}
```

---

## Feature 45: AI-Powered Performance Benchmarking

### Description

Statistical benchmarking system with predictive modeling that compares individual performance against role-specific, department-specific, or company-wide benchmarks using percentile analysis.

### Benchmark Types

1. **COMPANY_WIDE**: All employees across organization
2. **DEPARTMENT**: Department-specific benchmarks
3. **ROLE**: Role-specific benchmarks
4. **LEVEL**: Seniority level benchmarks
5. **CUSTOM**: Custom segment benchmarks

### Statistical Methods

1. **Percentile Calculation**
   - P25, P50 (median), P75, P90
   - Linear interpolation between percentiles
   - Min/max values for boundary cases

2. **Z-Score Analysis**
   - Standard deviations from mean
   - z = (value - mean) / std_dev

3. **Performance Classification**
   - EXCEPTIONAL: ≥ 90th percentile (Top 10%)
   - ABOVE: 75-89th percentile (Top 25%)
   - AT: 25-74th percentile (Middle 50%)
   - BELOW: < 25th percentile (Bottom 25%)

### API Endpoints

#### POST `/api/ai-insights/benchmark/create`

Create or update statistical benchmark.

**Request Body**:
```json
{
  "benchmarkName": "Engineering Productivity Q1 2025",
  "benchmarkType": "ROLE",
  "metricName": "productivity_score",
  "metricCategory": "PRODUCTIVITY",
  "targetRole": "Software Engineer",
  "targetDepartment": null,
  "targetLevel": null,
  "validFrom": "2025-01-01",
  "validUntil": "2025-03-31"
}
```

**Response**:
```json
{
  "id": "uuid",
  "sampleSize": 127,
  "statistics": {
    "percentile25": 65.2,
    "percentile50": 75.8,
    "percentile75": 85.3,
    "percentile90": 92.1,
    "mean": 76.5,
    "standardDeviation": 12.3,
    "minValue": 35.0,
    "maxValue": 98.5
  }
}
```

#### POST `/api/ai-insights/benchmark/compare`

Compare user performance to benchmark.

**Request Body**:
```json
{
  "userId": "user-123",
  "metricName": "productivity_score",
  "metricValue": 88.5,
  "benchmarkType": "ROLE",
  "targetRole": "Software Engineer"
}
```

**Response**:
```json
{
  "id": "uuid",
  "userId": "user-123",
  "userValue": 88.5,
  "benchmarkValue": 75.8,
  "percentileRank": 87.3,
  "deviationFromMean": 12.0,
  "zScore": 0.98,
  "performanceLevel": "ABOVE",
  "relativePosition": "TOP_25",
  "benchmarkStats": {
    "mean": 76.5,
    "median": 75.8,
    "p75": 85.3,
    "p90": 92.1,
    "std": 12.3
  },
  "strengths": [
    "Performing in top 25% for productivity_score",
    "Above average performance (87th percentile)",
    "Exceeds 75th percentile by 3.2 points"
  ],
  "improvementAreas": [],
  "recommendations": [
    "Maintain strong performance",
    "Look for opportunities to push to top 10%"
  ]
}
```

#### GET `/api/ai-insights/benchmark/comparisons`

Get user's benchmark comparison history.

#### GET `/api/ai-insights/benchmark/team-summary`

Get team benchmark summary.

**Response**:
```json
{
  "teamId": "team-123",
  "metricName": "productivity_score",
  "teamMembers": 12,
  "performanceDistribution": {
    "EXCEPTIONAL": 2,
    "ABOVE": 4,
    "AT": 5,
    "BELOW": 1
  },
  "teamAverage": 78.5,
  "benchmarkAverage": 76.5,
  "teamVsBenchmark": 2.0,
  "topPerformers": [
    {
      "userId": "user-123",
      "value": 92.0,
      "percentileRank": 95.2
    }
  ]
}
```

### Database Schema

```prisma
model PerformanceBenchmark {
  id                  String    @id @default(uuid()) @db.Uuid
  tenantId            String    @map("tenant_id") @db.Uuid
  benchmarkName       String    @map("benchmark_name")
  benchmarkType       String    @map("benchmark_type")
  metricName          String    @map("metric_name")
  metricCategory      String    @map("metric_category")
  targetRole          String?   @map("target_role")
  targetDepartment    String?   @map("target_department")
  targetLevel         String?   @map("target_level")
  sampleSize          Int       @map("sample_size")
  percentile25        Decimal   @map("percentile_25") @db.Decimal(10, 2)
  percentile50        Decimal   @map("percentile_50") @db.Decimal(10, 2)
  percentile75        Decimal   @map("percentile_75") @db.Decimal(10, 2)
  percentile90        Decimal   @map("percentile_90") @db.Decimal(10, 2)
  mean                Decimal   @map("mean") @db.Decimal(10, 2)
  standardDeviation   Decimal   @map("standard_deviation") @db.Decimal(10, 2)
  minValue            Decimal   @map("min_value") @db.Decimal(10, 2)
  maxValue            Decimal   @map("max_value") @db.Decimal(10, 2)
  validFrom           DateTime  @map("valid_from")
  validUntil          DateTime? @map("valid_until")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  tenant              Tenant    @relation(fields: [tenantId], references: [id])
  comparisons         PerformanceComparison[]

  @@unique([tenantId, benchmarkName, metricName])
  @@index([tenantId, benchmarkType])
  @@map("performance_benchmarks")
}

model PerformanceComparison {
  id                  String              @id @default(uuid()) @db.Uuid
  tenantId            String              @map("tenant_id") @db.Uuid
  userId              String              @map("user_id") @db.Uuid
  benchmarkId         String              @map("benchmark_id") @db.Uuid
  userValue           Decimal             @map("user_value") @db.Decimal(10, 2)
  benchmarkValue      Decimal             @map("benchmark_value") @db.Decimal(10, 2)
  percentileRank      Decimal             @map("percentile_rank") @db.Decimal(5, 2)
  performanceLevel    String              @map("performance_level")
  relativePosition    String              @map("relative_position")
  deviationFromMean   Decimal             @map("deviation_from_mean") @db.Decimal(10, 2)
  zScore              Decimal             @map("z_score") @db.Decimal(5, 2)
  comparisonDate      DateTime            @map("comparison_date")
  createdAt           DateTime            @default(now()) @map("created_at")

  tenant              Tenant              @relation(fields: [tenantId], references: [id])
  user                User                @relation(fields: [userId], references: [id])
  benchmark           PerformanceBenchmark @relation(fields: [benchmarkId], references: [id])

  @@index([tenantId, userId])
  @@index([benchmarkId])
  @@map("performance_comparisons")
}
```

---

## Configuration & Deployment

### Environment Variables

Create `.env` file in ml-service directory:

```bash
# ML Service Configuration
ML_SERVICE_PORT=8001
ML_SERVICE_HOST=0.0.0.0

# Model Paths
PRODUCTIVITY_MODEL_PATH=./models/productivity_v1.pkl
ANOMALY_MODEL_PATH=./models/anomaly_detector_v1.pkl

# Model Configuration
ANOMALY_CONTAMINATION=0.1
PRODUCTIVITY_MODEL_TYPE=random_forest

# Database (for future direct DB access)
DATABASE_URL=postgresql://user:password@localhost:5432/pms

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=INFO
```

### Installation

**ML Service (Python)**:

```bash
cd apps/ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download NLP models
python -c "import nltk; nltk.download('vader_lexicon')"
python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; AutoTokenizer.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english'); AutoModelForSequenceClassification.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english')"
```

**API Service (TypeScript)**:

```bash
cd apps/api
npm install
```

### Running Services

**Development Mode**:

```bash
# Terminal 1: ML Service
cd apps/ml-service
source venv/bin/activate
python src/api/main.py

# Terminal 2: API Service
cd apps/api
npm run dev
```

**Production Mode**:

```bash
# ML Service with Gunicorn
cd apps/ml-service
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api.main:app --bind 0.0.0.0:8001

# API Service
cd apps/api
npm run build
npm start
```

### Docker Deployment

Create `apps/ml-service/Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLP models
RUN python -c "import nltk; nltk.download('vader_lexicon')"
RUN python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
    AutoTokenizer.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english'); \
    AutoModelForSequenceClassification.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english')"

# Copy application code
COPY src/ ./src/
COPY models/ ./models/

# Expose port
EXPOSE 8001

# Run application
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  ml-service:
    build: ./apps/ml-service
    ports:
      - "8001:8001"
    environment:
      - ML_SERVICE_PORT=8001
      - PRODUCTIVITY_MODEL_PATH=/app/models/productivity_v1.pkl
      - ANOMALY_MODEL_PATH=/app/models/anomaly_detector_v1.pkl
    volumes:
      - ./apps/ml-service/models:/app/models
    restart: unless-stopped

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      - ML_SERVICE_URL=http://ml-service:8001
      - DATABASE_URL=postgresql://user:password@postgres:5432/pms
    depends_on:
      - ml-service
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=pms
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Model Training & Management

### Training Data Preparation

**Productivity Prediction**:

```python
import pandas as pd
from datetime import datetime, timedelta

# Prepare training data
def prepare_productivity_training_data(start_date, end_date):
    # Extract features for all users in date range
    training_records = []

    for user in users:
        for date in date_range(start_date, end_date):
            features = extract_features(user, date)
            actual_score = get_actual_productivity(user, date + timedelta(days=7))

            training_records.append({
                **features,
                'productivity_score': actual_score
            })

    return pd.DataFrame(training_records)

# Save training data
training_df = prepare_productivity_training_data(
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 12, 31)
)
training_df.to_csv('productivity_training_data.csv', index=False)
```

**Anomaly Detection**:

```python
# Prepare normal behavior data (exclude known anomalies)
def prepare_anomaly_training_data():
    normal_records = []

    for user in users:
        metrics = get_user_metrics(user)
        # Filter out periods with known issues
        if not has_known_issues(user, metrics['date']):
            normal_records.append(metrics)

    return pd.DataFrame(normal_records)

normal_df = prepare_anomaly_training_data()
normal_df.to_csv('normal_behavior_data.csv', index=False)
```

### Model Retraining Schedule

1. **Productivity Predictor**: Retrain monthly with last 12 months of data
2. **Anomaly Detector**: Retrain quarterly with normal behavior data
3. **Sentiment Analyzer**: Transformer models are pre-trained, no retraining needed

### Model Versioning

Store model versions in database:

```prisma
model MLModel {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @map("tenant_id") @db.Uuid
  modelType       String    @map("model_type")
  modelVersion    String    @map("model_version")
  modelPath       String    @map("model_path")
  algorithm       String    @map("algorithm")
  hyperparameters Json      @map("hyperparameters")
  trainingDate    DateTime  @map("training_date")
  metrics         Json      @map("metrics")
  isActive        Boolean   @default(false) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")

  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  predictions     ModelPrediction[]

  @@index([tenantId, modelType])
  @@index([isActive])
  @@map("ml_models")
}
```

---

## Performance Optimization

### Caching Strategy

Implement Redis caching for frequent requests:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache engagement scores (15 min TTL)
const cacheKey = `engagement:${tenantId}:${userId}:${date}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const score = await calculateEngagement(...);
await redis.setex(cacheKey, 900, JSON.stringify(score));
```

### Batch Processing

Process multiple predictions in batch:

```python
@app.post("/api/ml/sentiment/batch")
def analyze_sentiment_batch(texts: List[str]):
    # Batch tokenization and inference
    inputs = tokenizer(texts, return_tensors="pt", padding=True, truncation=True)
    outputs = model(**inputs)

    results = []
    for i, text in enumerate(texts):
        results.append(process_single_result(text, outputs[i]))

    return results
```

### Model Loading Optimization

Use lazy loading and singleton pattern:

```python
_sentiment_analyzer = None

def get_sentiment_analyzer():
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = SentimentAnalyzer()
    return _sentiment_analyzer
```

---

## Monitoring & Observability

### Model Performance Metrics

Track model accuracy over time:

```prisma
model ModelPrediction {
  id              String    @id @default(uuid()) @db.Uuid
  modelId         String    @map("model_id") @db.Uuid
  predictionType  String    @map("prediction_type")
  inputFeatures   Json      @map("input_features")
  predictedValue  Decimal   @map("predicted_value") @db.Decimal(10, 2)
  actualValue     Decimal?  @map("actual_value") @db.Decimal(10, 2)
  predictionError Decimal?  @map("prediction_error") @db.Decimal(10, 2)
  confidence      Decimal   @map("confidence") @db.Decimal(3, 2)
  createdAt       DateTime  @default(now()) @map("created_at")
  validatedAt     DateTime? @map("validated_at")

  model           MLModel   @relation(fields: [modelId], references: [id])

  @@index([modelId])
  @@index([createdAt])
  @@map("model_predictions")
}
```

### Logging

Configure structured logging:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Log prediction requests
logger.info(f"Productivity prediction for user {user_id}", extra={
    'user_id': user_id,
    'features': features,
    'prediction': result
})
```

---

## Security & Privacy

### Data Privacy

- All PII (Personally Identifiable Information) is excluded from ML features
- Sentiment analysis stores only text samples, not full messages
- Multi-tenancy ensures complete data isolation
- GDPR compliance: Users can request deletion of all ML-generated data

### API Security

- All endpoints require authentication via JWT tokens
- Row-level security enforced at database layer
- Rate limiting on ML endpoints (100 req/min per tenant)
- Input validation and sanitization

---

## Testing

### Unit Tests

```typescript
// engagement-scoring.service.spec.ts
describe('EngagementScoringService', () => {
  it('should calculate engagement score correctly', async () => {
    const metrics = {
      meetings_attended: 8,
      total_meetings: 10,
      messages_sent: 50,
      // ...
    };

    const result = await engagementService.calculateEngagementScore({
      tenantId: 'test-tenant',
      userId: 'test-user',
      calculationPeriod: 'WEEKLY'
    });

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.componentScores).toBeDefined();
  });
});
```

### Integration Tests

```python
# test_sentiment_api.py
def test_sentiment_analysis_endpoint():
    response = client.post("/api/ml/sentiment/analyze", json={
        "text": "This is a great project!"
    })

    assert response.status_code == 200
    data = response.json()
    assert data['sentiment_score'] > 0
    assert data['sentiment_label'] == 'POSITIVE'
```

---

## Troubleshooting

### Common Issues

**Issue**: ML service fails to start
- **Solution**: Ensure all Python dependencies are installed, NLP models are downloaded

**Issue**: Low prediction accuracy
- **Solution**: Retrain model with more recent data, check feature quality

**Issue**: Slow sentiment analysis
- **Solution**: Enable batch processing, implement caching, use smaller transformer model

**Issue**: High memory usage
- **Solution**: Use model quantization, reduce batch sizes, implement model unloading

---

## Future Enhancements

1. **A/B Testing Framework**: Compare different model versions
2. **AutoML**: Automated hyperparameter tuning
3. **Explainable AI**: SHAP values for feature importance
4. **Real-time Streaming**: Process events as they occur
5. **Custom ML Models**: Allow tenants to train custom models
6. **Federated Learning**: Privacy-preserving model training
7. **Graph Neural Networks**: Team dynamics modeling
8. **Reinforcement Learning**: Optimal intervention timing

---

## API Reference Summary

### Base URL
- API Service: `http://localhost:3001/api/ai-insights`
- ML Service: `http://localhost:8001/api/ml`

### Authentication
All API endpoints require JWT authentication header:
```
Authorization: Bearer <token>
```

### Rate Limits
- Standard: 100 requests/minute per tenant
- Burst: 200 requests/minute for short periods

### Error Codes
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

---

## Support & Resources

- **Documentation**: `/docs/AI_DRIVEN_INSIGHTS_INTELLIGENCE_ENGINE.md`
- **API Spec**: OpenAPI/Swagger at `/api/docs`
- **Model Cards**: `/docs/models/` directory
- **Training Scripts**: `/scripts/ml-training/`
- **Example Notebooks**: `/notebooks/`

---

## Conclusion

The AI-Driven Insights & Intelligence Engine provides comprehensive machine learning capabilities for performance management, enabling:

✅ Real-time sentiment analysis of communications
✅ Predictive productivity forecasting
✅ Multi-dimensional engagement scoring
✅ Proactive anomaly detection and risk flagging
✅ Statistical performance benchmarking

The system is production-ready with proper error handling, monitoring, and scalability considerations. Regular model retraining and validation ensure continued accuracy and relevance.
