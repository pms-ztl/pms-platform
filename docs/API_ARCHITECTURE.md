# API Layer & Integration Framework Architecture

## 📋 Overview

Comprehensive API layer and integration framework for the PMS platform supporting RESTful APIs, GraphQL, webhooks, and third-party integrations.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                     │
│         (Web, Mobile, Third-party Integrations)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Rate Limiting│  │Authentication│  │  Monitoring  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────┬──────────────────────┬─────────────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│   REST API v1   │    │   GraphQL API   │
│   (NestJS)      │    │   (Apollo)      │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┬──────────────┬──────────────┐
         │                     │              │              │
         ▼                     ▼              ▼              ▼
┌─────────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐
│  Core Services  │  │   Webhook   │  │   OAuth  │  │  Sync    │
│  (Business      │  │   System    │  │   SSO    │  │  Engine  │
│   Logic)        │  └─────────────┘  └──────────┘  └──────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   HRIS   │  │  Project │  │   Comm   │  │ Identity │   │
│  │ Adapters │  │   Mgmt   │  │ Platform │  │ Provider │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              External Systems (Third-party APIs)             │
│  Workday │ SAP SF │ Jira │ Slack │ Teams │ Azure AD        │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 API Endpoints

### RESTful API (v1)

#### Base URL
```
https://api.pms-platform.com/v1
```

#### Authentication
```http
Authorization: Bearer {access_token}
X-Tenant-ID: {tenant_uuid}
X-API-Version: 1
```

#### Core Resources

**Users & Identity**
- `GET    /users` - List users with filters
- `GET    /users/:id` - Get user details
- `POST   /users` - Create user
- `PATCH  /users/:id` - Update user
- `DELETE /users/:id` - Soft delete user
- `GET    /users/:id/hierarchy` - Get reporting hierarchy
- `GET    /users/:id/direct-reports` - Get direct reports

**Goals & OKRs**
- `GET    /goals` - List goals
- `GET    /goals/:id` - Get goal details
- `POST   /goals` - Create goal
- `PATCH  /goals/:id` - Update goal
- `DELETE /goals/:id` - Delete goal
- `POST   /goals/:id/key-results` - Add key result
- `PATCH  /goals/:id/progress` - Update progress
- `GET    /goals/:id/alignment` - Get goal alignment

**Performance Reviews**
- `GET    /reviews` - List reviews
- `GET    /reviews/:id` - Get review details
- `POST   /reviews` - Create review
- `PATCH  /reviews/:id` - Update review
- `POST   /reviews/:id/submit` - Submit review
- `POST   /reviews/:id/approve` - Approve review
- `GET    /reviews/:id/feedback` - Get review feedback

**Feedback**
- `GET    /feedback` - List feedback
- `POST   /feedback` - Create feedback
- `GET    /feedback/received` - Get received feedback
- `GET    /feedback/given` - Get given feedback
- `POST   /feedback/:id/acknowledge` - Acknowledge feedback

**One-on-Ones**
- `GET    /one-on-ones` - List 1-on-1s
- `POST   /one-on-ones` - Schedule 1-on-1
- `PATCH  /one-on-ones/:id` - Update 1-on-1
- `POST   /one-on-ones/:id/complete` - Mark as completed
- `GET    /one-on-ones/:id/notes` - Get meeting notes

**Competencies**
- `GET    /competencies` - List competencies
- `GET    /competencies/:id/assessments` - Get assessments
- `POST   /competencies/assess` - Create assessment
- `GET    /users/:id/competency-gaps` - Get skill gaps

**Promotion & Succession (Features 46)**
- `GET    /promotions/recommendations` - List promotion recommendations
- `POST   /promotions/recommendations` - Create recommendation
- `PATCH  /promotions/recommendations/:id` - Update recommendation
- `POST   /promotions/recommendations/:id/approve` - Approve promotion
- `GET    /succession-plans` - List succession plans
- `POST   /succession-plans` - Create succession plan
- `GET    /succession-plans/:positionId` - Get plan for position

**Development Plans (Feature 47)**
- `GET    /development-plans` - List development plans
- `POST   /development-plans` - Create plan
- `PATCH  /development-plans/:id` - Update plan
- `POST   /development-plans/:id/activities` - Add activity
- `PATCH  /development-plans/:id/progress` - Update progress

**Team Optimization (Feature 48)**
- `GET    /teams/:id/optimization` - Get team optimization
- `POST   /teams/:id/analyze` - Analyze team composition
- `GET    /teams/:id/recommendations` - Get optimization recommendations

**PIPs (Feature 49)**
- `GET    /pips` - List PIPs
- `POST   /pips` - Create PIP
- `PATCH  /pips/:id` - Update PIP
- `POST   /pips/:id/check-ins` - Add check-in
- `POST   /pips/:id/complete` - Complete PIP

**Organizational Health (Feature 50)**
- `GET    /org-health/metrics` - Get org health metrics
- `GET    /org-health/insights` - Get insights
- `GET    /org-health/trends` - Get trends
- `GET    /org-health/risk-areas` - Get risk areas

**Analytics & Reporting**
- `GET    /analytics/performance-distribution` - Performance distribution
- `GET    /analytics/goal-completion` - Goal completion rates
- `GET    /analytics/engagement-trends` - Engagement trends
- `GET    /analytics/attrition-risk` - Attrition risk analysis
- `POST   /reports/generate` - Generate custom report

**Webhooks**
- `GET    /webhooks` - List webhooks
- `POST   /webhooks` - Create webhook
- `PATCH  /webhooks/:id` - Update webhook
- `DELETE /webhooks/:id` - Delete webhook
- `GET    /webhooks/:id/deliveries` - Get delivery history

**Integrations**
- `GET    /integrations` - List available integrations
- `POST   /integrations/:provider/connect` - Connect integration
- `DELETE /integrations/:provider/disconnect` - Disconnect
- `POST   /integrations/:provider/sync` - Trigger manual sync
- `GET    /integrations/:provider/status` - Get sync status

### GraphQL API

#### Endpoint
```
https://api.pms-platform.com/graphql
```

#### Schema Overview

```graphql
type Query {
  # Users
  user(id: ID!): User
  users(filter: UserFilter, page: PageInput): UserConnection

  # Goals
  goal(id: ID!): Goal
  goals(filter: GoalFilter, page: PageInput): GoalConnection
  goalAlignment(goalId: ID!): [Goal]

  # Reviews
  review(id: ID!): PerformanceReview
  reviews(filter: ReviewFilter, page: PageInput): ReviewConnection

  # Feedback
  feedback(id: ID!): Feedback
  feedbackReceived(userId: ID!, page: PageInput): FeedbackConnection
  feedbackGiven(userId: ID!, page: PageInput): FeedbackConnection

  # Analytics
  performanceDistribution(filter: AnalyticsFilter): PerformanceDistribution
  engagementTrends(filter: AnalyticsFilter): [EngagementDataPoint]
  attritionRisk(departmentId: ID): [AttritionPrediction]

  # Org Health
  organizationalHealth(period: String): OrganizationalHealthMetrics

  # Promotions
  promotionRecommendations(filter: PromotionFilter): [PromotionRecommendation]
  successionPlans(filter: SuccessionFilter): [SuccessionPlan]

  # Development
  developmentPlan(userId: ID!): DevelopmentPlan
  developmentPlans(filter: DevelopmentFilter): [DevelopmentPlan]

  # Team Optimization
  teamOptimization(teamId: ID!): TeamOptimization

  # PIPs
  performanceImprovementPlans(filter: PIPFilter): [PerformanceImprovementPlan]
}

type Mutation {
  # Users
  createUser(input: CreateUserInput!): User
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean

  # Goals
  createGoal(input: CreateGoalInput!): Goal
  updateGoal(id: ID!, input: UpdateGoalInput!): Goal
  updateGoalProgress(id: ID!, progress: Float!): Goal

  # Reviews
  createReview(input: CreateReviewInput!): PerformanceReview
  submitReview(id: ID!): PerformanceReview
  approveReview(id: ID!): PerformanceReview

  # Feedback
  createFeedback(input: CreateFeedbackInput!): Feedback
  acknowledgeFeedback(id: ID!): Feedback

  # Promotions
  createPromotionRecommendation(input: PromotionInput!): PromotionRecommendation
  approvePromotion(id: ID!): PromotionRecommendation

  # Development Plans
  createDevelopmentPlan(input: DevelopmentPlanInput!): DevelopmentPlan
  updateDevelopmentPlanProgress(id: ID!, progress: Float!): DevelopmentPlan

  # PIPs
  createPIP(input: CreatePIPInput!): PerformanceImprovementPlan
  addPIPCheckIn(pipId: ID!, input: CheckInInput!): PIPCheckIn

  # Webhooks
  createWebhook(input: CreateWebhookInput!): Webhook
  deleteWebhook(id: ID!): Boolean

  # Integrations
  connectIntegration(provider: String!, config: JSON!): Integration
  syncIntegration(provider: String!): SyncResult
}

type Subscription {
  # Real-time updates
  goalUpdated(userId: ID!): Goal
  reviewStatusChanged(userId: ID!): PerformanceReview
  feedbackReceived(userId: ID!): Feedback
  notificationReceived(userId: ID!): Notification
  teamMemberAdded(teamId: ID!): TeamMember
}
```

## 🔐 Authentication & Authorization

### OAuth 2.0 Flow

```
1. Client → Authorization Request → Auth Server
2. Auth Server → User Login → User
3. User → Credentials → Auth Server
4. Auth Server → Authorization Code → Client
5. Client → Exchange Code → Auth Server
6. Auth Server → Access Token + Refresh Token → Client
7. Client → API Request with Token → API Server
8. API Server → Validate Token → Auth Server
9. API Server → Response → Client
```

### SSO Integration

**Supported Providers:**
- Azure Active Directory
- Okta
- Google Workspace
- SAML 2.0 (Generic)

**SAML Flow:**
```
1. User → Access Application → PMS Platform
2. PMS Platform → SAML Request → IdP
3. IdP → Authentication → User
4. User → Credentials → IdP
5. IdP → SAML Assertion → PMS Platform
6. PMS Platform → Create Session → User
7. PMS Platform → Redirect to App → User
```

### JWT Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "tenant": "tenant-uuid",
    "email": "user@example.com",
    "roles": ["EMPLOYEE", "MANAGER"],
    "permissions": ["goals:read:own", "reviews:manage:team"],
    "iat": 1640000000,
    "exp": 1640003600,
    "iss": "https://auth.pms-platform.com",
    "aud": "https://api.pms-platform.com"
  }
}
```

## 🔔 Webhook System

### Event Types

**User Events:**
- `user.created`
- `user.updated`
- `user.deleted`
- `user.role_changed`

**Goal Events:**
- `goal.created`
- `goal.updated`
- `goal.completed`
- `goal.overdue`

**Review Events:**
- `review.created`
- `review.submitted`
- `review.approved`
- `review.calibrated`

**Feedback Events:**
- `feedback.received`
- `feedback.acknowledged`

**One-on-One Events:**
- `one_on_one.scheduled`
- `one_on_one.completed`
- `one_on_one.cancelled`

**Promotion Events:**
- `promotion.recommended`
- `promotion.approved`
- `promotion.rejected`

**PIP Events:**
- `pip.created`
- `pip.check_in_added`
- `pip.completed`
- `pip.extended`

**Org Health Events:**
- `org_health.metrics_updated`
- `org_health.risk_detected`

### Webhook Payload

```json
{
  "id": "webhook-delivery-uuid",
  "event": "goal.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "tenant-uuid",
  "data": {
    "goal": {
      "id": "goal-uuid",
      "title": "Complete Q1 Objectives",
      "owner_id": "user-uuid",
      "progress": 100,
      "status": "COMPLETED",
      "completed_at": "2024-01-15T10:30:00Z"
    }
  },
  "metadata": {
    "triggered_by": "user-uuid",
    "ip_address": "192.168.1.1"
  }
}
```

### Webhook Security

- **Signature Verification:** HMAC-SHA256
- **Retry Logic:** Exponential backoff (3 attempts)
- **Timeout:** 30 seconds
- **Rate Limiting:** 100 deliveries/minute per webhook

## 🔗 Integration Adapters

### HRIS Integrations

#### Workday Adapter
```typescript
interface WorkdayConfig {
  tenantName: string;
  username: string;
  password: string;
  apiVersion: string;
}

// Sync Operations
- syncEmployees(): Promise<SyncResult>
- syncOrganizationStructure(): Promise<SyncResult>
- syncJobProfiles(): Promise<SyncResult>
- syncCompensation(): Promise<SyncResult>
```

#### BambooHR Adapter
```typescript
interface BambooHRConfig {
  subdomain: string;
  apiKey: string;
}

// Sync Operations
- syncEmployees(): Promise<SyncResult>
- syncTimeOff(): Promise<SyncResult>
- syncCustomFields(): Promise<SyncResult>
```

#### SAP SuccessFactors Adapter
```typescript
interface SAPSuccessFactorsConfig {
  companyId: string;
  username: string;
  password: string;
  dataCenter: string;
}

// Sync Operations
- syncEmployeeCentral(): Promise<SyncResult>
- syncPerformanceManagement(): Promise<SyncResult>
- syncGoalManagement(): Promise<SyncResult>
- syncSuccessionPlanning(): Promise<SyncResult>
```

### Project Management Integrations

#### Jira Adapter
```typescript
interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
}

// Sync Operations
- syncProjects(): Promise<SyncResult>
- syncIssues(): Promise<SyncResult>
- createGoalFromEpic(epicId: string): Promise<Goal>
- linkGoalToIssue(goalId: string, issueKey: string): Promise<void>
```

#### Asana Adapter
```typescript
interface AsanaConfig {
  accessToken: string;
  workspaceId: string;
}

// Sync Operations
- syncProjects(): Promise<SyncResult>
- syncTasks(): Promise<SyncResult>
- createGoalFromProject(projectId: string): Promise<Goal>
```

### Communication Platform Integrations

#### Slack Adapter
```typescript
interface SlackConfig {
  botToken: string;
  signingSecret: string;
  workspaceId: string;
}

// Operations
- sendNotification(channel: string, message: string): Promise<void>
- sendDirectMessage(userId: string, message: string): Promise<void>
- createChannel(name: string): Promise<Channel>
- sendGoalReminder(goalId: string): Promise<void>
- sendReviewNotification(reviewId: string): Promise<void>
```

#### Microsoft Teams Adapter
```typescript
interface TeamsConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

// Operations
- sendChannelMessage(teamId: string, channelId: string, message: string): Promise<void>
- sendDirectMessage(userId: string, message: string): Promise<void>
- createMeeting(details: MeetingDetails): Promise<Meeting>
- sendReviewReminder(reviewId: string): Promise<void>
```

### Identity Provider Integrations

#### Azure AD Adapter
```typescript
interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Operations
- authenticate(code: string): Promise<AuthResult>
- syncUsers(): Promise<SyncResult>
- syncGroups(): Promise<SyncResult>
- validateToken(token: string): Promise<TokenValidation>
```

#### Okta Adapter
```typescript
interface OktaConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  apiToken: string;
}

// Operations
- authenticate(code: string): Promise<AuthResult>
- syncUsers(): Promise<SyncResult>
- syncGroups(): Promise<SyncResult>
- createUser(userData: UserData): Promise<User>
```

## 🔄 Data Sync Mechanisms

### Sync Strategies

**1. Full Sync**
- Complete data refresh
- Scheduled: Daily at 2 AM
- Use case: Initial setup, data reconciliation

**2. Incremental Sync**
- Only changed records
- Scheduled: Every 4 hours
- Use case: Regular updates

**3. Real-time Sync**
- Webhook-triggered
- Immediate propagation
- Use case: Critical updates

### Sync Configuration

```typescript
interface SyncConfig {
  provider: string;
  strategy: 'full' | 'incremental' | 'realtime';
  schedule: string; // Cron expression
  enabled: boolean;
  mappings: FieldMapping[];
  filters: SyncFilter[];
  conflictResolution: 'source_wins' | 'target_wins' | 'newest_wins';
}
```

### Conflict Resolution

```typescript
enum ConflictResolution {
  SOURCE_WINS = 'source_wins',     // External system wins
  TARGET_WINS = 'target_wins',     // PMS platform wins
  NEWEST_WINS = 'newest_wins',     // Most recent update wins
  MANUAL = 'manual'                 // Requires manual resolution
}
```

## ⚡ Rate Limiting

### Rate Limit Tiers

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|-----------------|---------------|--------------|
| Free | 60 | 1,000 | 10,000 |
| Basic | 300 | 10,000 | 100,000 |
| Pro | 1,000 | 50,000 | 500,000 |
| Enterprise | 5,000 | 200,000 | Unlimited |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1640000000
Retry-After: 60
```

### Rate Limit Algorithm

**Token Bucket Algorithm:**
- Bucket capacity = Rate limit
- Refill rate = 1 token per interval
- Request consumes 1 token
- Rejected if bucket empty

## 🛡️ Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req-uuid",
    "timestamp": "2024-01-15T10:30:00Z",
    "documentation_url": "https://docs.pms-platform.com/errors/VALIDATION_ERROR"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid auth |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
| SERVICE_UNAVAILABLE | 503 | Temporary outage |

### Retry Logic

```typescript
interface RetryConfig {
  maxAttempts: 3;
  initialDelay: 1000; // ms
  maxDelay: 30000; // ms
  backoffMultiplier: 2;
  retryableErrors: [408, 429, 500, 502, 503, 504];
}
```

## 📊 API Monitoring & Analytics

### Metrics Tracked

**Performance Metrics:**
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate
- Success rate

**Business Metrics:**
- API usage by endpoint
- Popular resources
- Integration usage
- Webhook delivery success rate

**Security Metrics:**
- Failed authentication attempts
- Rate limit violations
- Suspicious activity
- Token usage patterns

### Monitoring Tools

- **APM:** New Relic / DataDog
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing:** Jaeger / Zipkin
- **Alerting:** PagerDuty / Opsgenie

## 📚 API Versioning

### Versioning Strategy

**URL Versioning:**
```
https://api.pms-platform.com/v1/users
https://api.pms-platform.com/v2/users
```

**Header Versioning:**
```http
X-API-Version: 1
Accept: application/vnd.pms.v1+json
```

### Deprecation Policy

- **Announcement:** 6 months before deprecation
- **Support:** Minimum 12 months
- **Sunset Header:** Included in responses
- **Migration Guide:** Provided with alternatives

```http
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: true
Link: <https://docs.pms-platform.com/migration/v1-to-v2>; rel="deprecation"
```

## 🔒 Security Best Practices

### API Security Checklist

- ✅ HTTPS only (TLS 1.3)
- ✅ JWT token authentication
- ✅ OAuth 2.0 / SSO support
- ✅ API key rotation
- ✅ Rate limiting
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ CORS configuration
- ✅ Request size limits
- ✅ Audit logging
- ✅ IP whitelisting (enterprise)
- ✅ Encryption at rest and in transit

### Data Privacy

- **GDPR Compliance:** Right to access, delete, portability
- **Data Masking:** PII protection in logs
- **Anonymization:** Analytics without PII
- **Retention Policies:** Automatic data deletion

## 📖 Documentation

### OpenAPI/Swagger Specification

```yaml
openapi: 3.0.0
info:
  title: PMS Platform API
  version: 1.0.0
  description: Performance Management System API
  contact:
    email: api@pms-platform.com
  license:
    name: Proprietary
servers:
  - url: https://api.pms-platform.com/v1
    description: Production
  - url: https://api-staging.pms-platform.com/v1
    description: Staging
```

### Documentation Features

- Interactive API explorer (Swagger UI)
- Code examples (cURL, JavaScript, Python, Go)
- Authentication guide
- Webhook setup guide
- Integration tutorials
- SDK documentation
- Postman collection
- Rate limit documentation
- Error handling guide

## 🚀 Performance Optimization

### Caching Strategy

- **Response Caching:** Cache-Control headers
- **ETags:** Conditional requests
- **CDN:** Static assets
- **Database Query Caching:** Redis
- **GraphQL Query Caching:** Automatic Persisted Queries

### Pagination

```http
GET /v1/users?page=1&limit=50&sort=createdAt:desc

Response Headers:
X-Total-Count: 1000
X-Page: 1
X-Per-Page: 50
Link: <https://api.pms-platform.com/v1/users?page=2>; rel="next"
```

### Filtering & Sorting

```http
GET /v1/goals?status=ACTIVE&owner_id=user-uuid&sort=dueDate:asc
GET /v1/users?department=Engineering&level_gte=3
```

## 📝 Summary

The API layer provides:
- ✅ RESTful and GraphQL APIs
- ✅ Comprehensive authentication (OAuth2, SSO, JWT)
- ✅ Real-time webhooks
- ✅ 7 integration adapters
- ✅ Rate limiting and security
- ✅ Monitoring and analytics
- ✅ Complete documentation
- ✅ Error handling and retry logic

This infrastructure supports all 50 PMS features and enables seamless third-party integrations.
