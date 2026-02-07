# Actionable Insights & Planning Tools

## Overview

The Actionable Insights & Planning Tools provide strategic planning and decision-support capabilities based on performance data, AI-driven recommendations, and organizational analytics. This comprehensive suite enables data-driven decision making for promotions, succession planning, development, team formation, performance improvement, and organizational health.

### Features Included

- **Feature 46**: Automated Promotion & Succession Recommendation System
- **Feature 47**: Personalized Development Plan Generator
- **Feature 48**: Team Formation & Restructuring Optimizer
- **Feature 49**: Performance Improvement Plan (PIP) Automation
- **Feature 50**: Organizational Health & Culture Diagnostics Dashboard

---

## Feature 46: Automated Promotion & Succession Recommendation System

### Description

AI-driven system that identifies high-potential employees for promotions and creates succession plans for critical positions using collaborative filtering and content-based recommendation algorithms.

### Key Capabilities

- **Multi-Factor Scoring**: Combines 6 scoring dimensions
  - Performance Score (30%)
  - Potential Score (25%)
  - Skills Match Score (20%)
  - Leadership Score (15%)
  - Tenure Score (5%)
  - Engagement Score (5%)

- **Readiness Levels**:
  - `READY_NOW`: Candidate is prepared for immediate promotion
  - `READY_1_YEAR`: 12 months of development needed
  - `READY_2_YEARS`: 24 months of development needed
  - `NEEDS_DEVELOPMENT`: Significant development required (36+ months)

- **Skill Gap Analysis**: Identifies specific skills requiring development
- **Development Roadmap**: Generates actionable development plans
- **Risk Assessment**: Flags potential risks (engagement, flight risk, sentiment)
- **Success Probability**: Calculates likelihood of promotion success

### API Endpoints

#### POST `/api/actionable-insights/promotion/recommend`

Generate promotion recommendation for a user.

**Request Body**:
```json
{
  "userId": "user-123",
  "targetRole": "Senior Software Engineer",
  "targetLevel": "L5",
  "targetDepartment": "dept-456"
}
```

**Response**:
```json
{
  "id": "rec-789",
  "userId": "user-123",
  "targetRole": "Senior Software Engineer",
  "overallScore": 82.5,
  "readinessLevel": "READY_1_YEAR",
  "confidenceScore": 0.88,
  "componentScores": {
    "performanceScore": 85.0,
    "potentialScore": 80.0,
    "skillsMatchScore": 75.0,
    "leadershipScore": 78.0,
    "tenureScore": 85.0,
    "engagementScore": 82.0
  },
  "strengths": [
    "Consistently high performance with strong track record",
    "Strong leadership competencies demonstrated"
  ],
  "developmentNeeds": [
    "Develop System Architecture capability to required level",
    "Build advanced mentoring skills"
  ],
  "skillGaps": {
    "System Architecture": {
      "current": 3,
      "required": 4,
      "gap": 1,
      "priority": "HIGH"
    }
  },
  "developmentActions": [
    {
      "skillName": "System Architecture",
      "currentLevel": 3,
      "targetLevel": 4,
      "actions": [
        "Complete advanced System Architecture training course",
        "Work on project requiring System Architecture application",
        "Seek mentorship from expert in System Architecture"
      ],
      "estimatedDuration": 3,
      "priority": "HIGH"
    }
  ],
  "estimatedTimeToReady": 12,
  "successProbability": 0.85,
  "riskFactors": [],
  "status": "PENDING"
}
```

#### POST `/api/actionable-insights/succession/create`

Create succession plan for a critical position.

**Request Body**:
```json
{
  "positionId": "pos-123",
  "positionTitle": "Engineering Manager",
  "currentIncumbent": "user-456",
  "criticality": "CRITICAL"
}
```

**Response**:
```json
{
  "id": "succ-789",
  "positionId": "pos-123",
  "positionTitle": "Engineering Manager",
  "currentIncumbent": "user-456",
  "criticality": "CRITICAL",
  "turnoverRisk": "LOW",
  "vacancyImpact": "SEVERE",
  "successors": [
    {
      "userId": "user-789",
      "readiness": "READY_NOW",
      "overallScore": 88.5,
      "probability": 0.90,
      "strengths": ["Excellent leadership", "Strong technical skills"],
      "developmentNeeds": []
    },
    {
      "userId": "user-012",
      "readiness": "READY_1_YEAR",
      "overallScore": 75.0,
      "probability": 0.75,
      "strengths": ["High potential"],
      "developmentNeeds": ["Leadership development"]
    }
  ],
  "emergencyBackup": "user-789",
  "benchStrength": 1,
  "nextReviewDate": "2025-04-15T00:00:00Z"
}
```

#### GET `/api/actionable-insights/promotion/user/:userId`

Get all promotion recommendations for a user.

#### GET `/api/actionable-insights/succession/plans`

Get succession plans with optional filtering.

**Query Parameters**:
- `criticality`: Filter by criticality (CRITICAL, HIGH, MEDIUM, LOW)

#### POST `/api/actionable-insights/promotion/:recommendationId/approve`

Approve a promotion recommendation.

#### POST `/api/actionable-insights/promotion/:recommendationId/reject`

Reject a promotion recommendation.

**Request Body**:
```json
{
  "rejectionReason": "Insufficient experience in required technical areas"
}
```

### Database Schema

```prisma
model PromotionRecommendation {
  id                    String    @id @default(uuid())
  tenantId              String
  userId                String
  targetRole            String
  targetLevel           String?
  targetDepartment      String?

  // Scoring
  overallScore          Decimal   @db.Decimal(5, 2)
  readinessLevel        String    // READY_NOW, READY_1_YEAR, READY_2_YEARS, NEEDS_DEVELOPMENT
  confidenceScore       Decimal   @db.Decimal(3, 2)

  // Component scores
  performanceScore      Decimal   @db.Decimal(5, 2)
  potentialScore        Decimal   @db.Decimal(5, 2)
  skillsMatchScore      Decimal   @db.Decimal(5, 2)
  leadershipScore       Decimal   @db.Decimal(5, 2)
  tenureScore           Decimal   @db.Decimal(5, 2)
  engagementScore       Decimal   @db.Decimal(5, 2)

  // Analysis
  strengths             String[]
  developmentNeeds      String[]
  skillGaps             Json
  developmentActions    Json
  riskFactors           String[]

  // Workflow
  status                String    @default("PENDING")
  reviewedBy            String?
  approvedBy            String?

  @@map("promotion_recommendations")
}

model SuccessionPlan {
  id                    String    @id @default(uuid())
  tenantId              String
  positionId            String
  positionTitle         String
  currentIncumbent      String?
  criticality           String    // CRITICAL, HIGH, MEDIUM, LOW

  // Risk Assessment
  turnoverRisk          String?   // HIGH, MEDIUM, LOW
  vacancyImpact         String

  // Succession Pool
  successors            Json      // Array of candidates
  emergencyBackup       String?
  benchStrength         Int       @default(0)

  @@map("succession_plans")
}
```

### Integration Example

```typescript
import { PromotionSuccessionService } from './services/actionable-insights';

const service = new PromotionSuccessionService();

// Generate promotion recommendation
const recommendation = await service.generatePromotionRecommendation({
  tenantId: 'tenant-123',
  userId: 'user-456',
  targetRole: 'Senior Software Engineer',
  targetLevel: 'L5'
});

// Create succession plan
const successionPlan = await service.createSuccessionPlan({
  tenantId: 'tenant-123',
  positionId: 'pos-789',
  positionTitle: 'Engineering Manager',
  criticality: 'CRITICAL'
});
```

---

## Feature 47: Personalized Development Plan Generator

### Description

AI-powered system that automatically generates personalized career development plans based on performance profiles, skill gaps, career goals, and competency assessments.

### Key Capabilities

- **Automated Plan Generation**: Creates comprehensive development plans with activities, milestones, and timelines
- **Skill Gap Analysis**: Identifies gaps between current and target role requirements
- **Competency Gap Assessment**: Analyzes leadership and behavioral competencies
- **Career Path Roadmap**: Generates step-by-step career progression paths
- **Learning Resource Recommendation**: Suggests relevant courses, training, and resources
- **Mentor Matching**: Recommends suitable mentors based on target role
- **Progress Tracking**: Monitors completion rates and progress percentages
- **Checkpoint Scheduling**: Automatically schedules review checkpoints

### Plan Types

- `CAREER_GROWTH`: Long-term career advancement
- `SKILL_DEVELOPMENT`: Technical/functional skill building
- `LEADERSHIP`: Leadership capability development
- `PERFORMANCE_IMPROVEMENT`: Address performance gaps

### API Endpoints

#### POST `/api/actionable-insights/development/generate`

Generate personalized development plan.

**Request Body**:
```json
{
  "userId": "user-123",
  "planType": "CAREER_GROWTH",
  "careerGoal": "Become a Senior Engineering Manager",
  "targetRole": "Senior Engineering Manager",
  "targetLevel": "L6",
  "duration": 24
}
```

**Response**:
```json
{
  "id": "plan-456",
  "userId": "user-123",
  "planName": "John Doe - CAREER_GROWTH Plan",
  "planType": "CAREER_GROWTH",
  "duration": 24,
  "startDate": "2025-01-15T00:00:00Z",
  "targetCompletionDate": "2027-01-15T00:00:00Z",
  "careerGoal": "Become a Senior Engineering Manager",
  "targetRole": "Senior Engineering Manager",
  "currentLevel": "MID",
  "strengthsAssessed": [
    "System Design (Expert level)",
    "Technical Leadership"
  ],
  "developmentAreas": [
    "People Management requires improvement",
    "Strategic Planning development needed"
  ],
  "skillGapAnalysis": {
    "People Management": {
      "current": 2,
      "required": 4,
      "gap": 2,
      "category": "LEADERSHIP",
      "priority": "HIGH"
    },
    "Strategic Planning": {
      "current": 2,
      "required": 4,
      "gap": 2,
      "category": "BUSINESS",
      "priority": "HIGH"
    }
  },
  "activities": [
    {
      "activityType": "TRAINING",
      "title": "People Management Training Course",
      "description": "Complete advanced training in People Management to reach proficiency level 4",
      "targetSkills": ["People Management"],
      "estimatedHours": 40,
      "priority": "HIGH",
      "learningObjectives": [
        "Understand advanced concepts in People Management",
        "Apply People Management in real-world projects",
        "Achieve proficiency level 4"
      ]
    },
    {
      "activityType": "COURSE",
      "title": "Leadership Fundamentals Certificate",
      "description": "Complete comprehensive leadership training program",
      "targetCompetencies": ["Leadership", "People Management", "Strategic Thinking"],
      "estimatedHours": 60,
      "priority": "HIGH"
    }
  ],
  "totalActivities": 8,
  "completedActivities": 0,
  "progressPercentage": 0,
  "milestones": [
    {
      "name": "Q1 Milestone",
      "month": 6,
      "description": "Complete 2 development activities",
      "criteria": [
        "25% of development plan completed",
        "Demonstrate progress in key skill areas"
      ]
    }
  ],
  "learningResources": [
    {
      "type": "COURSE",
      "title": "Advanced People Management Training",
      "provider": "Online Learning Platform",
      "estimatedHours": 30,
      "cost": 299
    }
  ],
  "mentorAssigned": "user-789",
  "budget": 1500.00,
  "status": "DRAFT",
  "generatedBy": "AI",
  "confidence": 0.85
}
```

#### GET `/api/actionable-insights/development/user/:userId`

Get all development plans for a user.

#### PUT `/api/actionable-insights/development/:planId/progress`

Update development plan progress (recalculates based on activity completion).

#### POST `/api/actionable-insights/development/:planId/complete`

Mark development plan as completed.

### Database Schema

```prisma
model DevelopmentPlan {
  id                    String    @id @default(uuid())
  tenantId              String
  userId                String
  planName              String
  planType              String    // CAREER_GROWTH, SKILL_DEVELOPMENT, LEADERSHIP, PERFORMANCE_IMPROVEMENT
  duration              Int       // months
  startDate             DateTime
  targetCompletionDate  DateTime

  // Career objectives
  careerGoal            String    @db.Text
  targetRole            String?
  targetLevel           String?
  careerPath            Json      // Roadmap

  // Assessment
  currentLevel          String
  strengthsAssessed     String[]
  developmentAreas      String[]
  skillGapAnalysis      Json
  competencyGaps        Json

  // Activities & Progress
  activities            Json
  totalActivities       Int       @default(0)
  completedActivities   Int       @default(0)
  progressPercentage    Decimal   @default(0) @db.Decimal(5, 2)

  // Resources
  learningResources     Json
  mentorAssigned        String?
  budget                Decimal?  @db.Decimal(10, 2)

  // Status
  status                String    @default("DRAFT")

  @@map("development_plans")
}

model DevelopmentActivity {
  id                    String    @id @default(uuid())
  tenantId              String
  developmentPlanId     String
  userId                String
  activityType          String    // TRAINING, COURSE, CERTIFICATION, MENTORING, PROJECT
  title                 String
  description           String    @db.Text
  targetSkills          String[]
  estimatedHours        Decimal?  @db.Decimal(6, 2)
  status                String    @default("NOT_STARTED")
  progressPercentage    Decimal   @default(0) @db.Decimal(5, 2)

  @@map("development_activities")
}
```

---

## Feature 48: Team Formation & Restructuring Optimizer

### Description

Recommendation engine that generates optimal team compositions using skill matching algorithms, diversity optimization, and collaboration scoring.

### Key Capabilities

- **Multi-Objective Optimization**: Balances skill coverage, diversity, performance, and collaboration
- **Candidate Scoring**: Evaluates team members across multiple dimensions
- **Team Combination Generation**: Creates and scores multiple team configurations
- **Skill Coverage Analysis**: Ensures all required skills are represented
- **Diversity Optimization**: Maximizes team diversity across departments, levels, and backgrounds
- **Risk Assessment**: Identifies potential team risks and vulnerabilities
- **Implementation Planning**: Generates step-by-step implementation roadmap

### Optimization Types

- `NEW_TEAM`: Form new team from scratch
- `RESTRUCTURE`: Reorganize existing team
- `EXPANSION`: Add members to existing team
- `REBALANCE`: Optimize current team composition

### Scoring Dimensions

- **Overall Score**: Composite team quality score (0-100)
- **Skill Coverage Score**: Percentage of required skills covered
- **Diversity Score**: Team diversity across multiple dimensions
- **Collaboration Score**: Expected team collaboration quality
- **Performance Score**: Average individual performance
- **Chemistry Score**: Predicted team chemistry based on past interactions

### API Endpoints

#### POST `/api/actionable-insights/team/optimize`

Generate optimal team composition.

**Request Body**:
```json
{
  "optimizationType": "NEW_TEAM",
  "teamName": "Cloud Platform Team",
  "department": "dept-123",
  "teamSize": 8,
  "requiredSkills": [
    {
      "skillName": "Cloud Architecture",
      "minimumLevel": 4,
      "weight": 2,
      "priority": "HIGH"
    },
    {
      "skillName": "DevOps",
      "minimumLevel": 3,
      "weight": 1.5,
      "priority": "HIGH"
    },
    {
      "skillName": "Python",
      "minimumLevel": 3,
      "weight": 1,
      "priority": "MEDIUM"
    }
  ],
  "requiredCompetencies": [
    {
      "competencyName": "Collaboration",
      "minimumScore": 70,
      "priority": "HIGH"
    }
  ],
  "objectives": [
    "Build scalable cloud platform",
    "Achieve 99.9% uptime SLA"
  ],
  "constraints": {
    "excludeUsers": ["user-exclude-1"],
    "minTenureMonths": 6
  }
}
```

**Response**:
```json
{
  "id": "opt-789",
  "optimizationType": "NEW_TEAM",
  "teamName": "Cloud Platform Team",
  "teamSize": 8,
  "recommendedMembers": [
    {
      "userId": "user-001",
      "role": "Tech Lead",
      "score": 92.5,
      "rationale": "Excellent fit with strong skills and performance",
      "skills": [
        { "name": "Cloud Architecture", "level": 5 },
        { "name": "DevOps", "level": 4 }
      ]
    },
    {
      "userId": "user-002",
      "role": "Senior Engineer",
      "score": 88.0,
      "rationale": "Good fit with some skill gaps that can be addressed",
      "skills": [
        { "name": "Python", "level": 4 },
        { "name": "DevOps", "level": 3 }
      ]
    }
  ],
  "overallScore": 85.5,
  "skillCoverageScore": 95.0,
  "diversityScore": 78.0,
  "collaborationScore": 82.0,
  "performanceScore": 87.0,
  "chemistryScore": 75.0,
  "strengthsAnalysis": [
    "High-performing team with strong track records",
    "Comprehensive skill coverage across all required areas"
  ],
  "risks": [],
  "skillGaps": {},
  "recommendations": [],
  "implementationSteps": [
    {
      "step": 1,
      "action": "Obtain approval for team formation",
      "owner": "Manager",
      "timeline": "Week 1"
    },
    {
      "step": 2,
      "action": "Notify selected team members",
      "owner": "HR",
      "timeline": "Week 2"
    }
  ],
  "confidence": 0.88,
  "status": "PENDING"
}
```

#### GET `/api/actionable-insights/team/:teamId/analyze`

Analyze existing team composition.

**Response**:
```json
{
  "id": "analysis-456",
  "teamId": "team-123",
  "analysisDate": "2025-01-15T00:00:00Z",
  "analysisPeriod": "CURRENT",
  "teamSize": 10,
  "avgTenure": 28.5,
  "avgPerformanceScore": 78.0,
  "diversityMetrics": {
    "departmentCount": 3,
    "levelCount": 4,
    "diversityScore": 75
  },
  "skillDistribution": {
    "Python": 7,
    "JavaScript": 5,
    "DevOps": 4
  },
  "productivityScore": 78.0,
  "collaborationScore": 82.0,
  "innovationScore": 75.0,
  "turnoverRisk": "LOW",
  "burnoutRisk": "LOW",
  "engagementLevel": "HIGH",
  "keyStrengths": [
    "High-performing team with strong results"
  ],
  "vulnerabilities": [],
  "recommendations": []
}
```

### Database Schema

```prisma
model TeamOptimization {
  id                    String    @id @default(uuid())
  tenantId              String
  optimizationType      String
  targetTeamId          String?
  teamName              String
  teamSize              Int
  requiredSkills        Json
  requiredCompetencies  Json
  recommendedMembers    Json

  // Scoring
  overallScore          Decimal   @db.Decimal(5, 2)
  skillCoverageScore    Decimal   @db.Decimal(5, 2)
  diversityScore        Decimal   @db.Decimal(5, 2)
  collaborationScore    Decimal   @db.Decimal(5, 2)
  performanceScore      Decimal   @db.Decimal(5, 2)
  chemistryScore        Decimal?  @db.Decimal(5, 2)

  // Analysis
  strengthsAnalysis     String[]
  risks                 String[]
  skillGaps             Json
  recommendations       Json
  implementationSteps   Json

  @@map("team_optimizations")
}

model TeamCompositionAnalysis {
  id                    String    @id @default(uuid())
  tenantId              String
  teamId                String
  analysisDate          DateTime
  teamSize              Int
  avgTenure             Decimal   @db.Decimal(6, 2)
  avgPerformanceScore   Decimal   @db.Decimal(5, 2)
  diversityMetrics      Json
  skillDistribution     Json
  productivityScore     Decimal   @db.Decimal(5, 2)
  collaborationScore    Decimal   @db.Decimal(5, 2)
  turnoverRisk          String
  engagementLevel       String

  @@map("team_composition_analyses")
}
```

---

## Feature 49: Performance Improvement Plan (PIP) Automation

### Description

Automated system that generates Performance Improvement Plans with dynamic content, milestones, coaching schedules, and tracking workflows.

### Key Capabilities

- **Automated PIP Generation**: Creates comprehensive PIPs based on performance issues
- **SMART Goal Generation**: Generates Specific, Measurable, Achievable, Relevant, Time-bound goals
- **Milestone Creation**: Automatically creates progress milestones
- **Coaching Schedule**: Generates regular check-in schedule
- **Support Resource Allocation**: Recommends training, mentoring, and resources
- **Progress Tracking**: Monitors completion and on-track status
- **Outcome Management**: Tracks successful or unsuccessful completion

### PIP Types

- `PERFORMANCE`: General performance improvement
- `BEHAVIOR`: Behavioral issues and workplace conduct
- `ATTENDANCE`: Attendance and punctuality
- `SKILLS`: Technical or functional skill gaps

### Severity Levels

- `STANDARD`: Initial PIP, opportunity for improvement
- `SERIOUS`: Second PIP or serious issues
- `FINAL_WARNING`: Last opportunity before termination

### API Endpoints

#### POST `/api/actionable-insights/pip/generate`

Generate automated Performance Improvement Plan.

**Request Body**:
```json
{
  "userId": "user-123",
  "pipType": "PERFORMANCE",
  "severity": "STANDARD",
  "duration": 90,
  "performanceIssues": [
    {
      "category": "Code Quality",
      "description": "Consistently missing code review standards",
      "impact": "Increasing technical debt and bug rate",
      "goal": "Meet code quality standards in 90% of submissions",
      "metric": "Code quality score",
      "baseline": "Current: 65%",
      "target": "Target: 90%",
      "priority": "HIGH"
    },
    {
      "category": "Delivery",
      "description": "Missing project deadlines",
      "impact": "Affecting team velocity and customer commitments",
      "goal": "Deliver assignments on time",
      "metric": "On-time delivery rate",
      "baseline": "Current: 60%",
      "target": "Target: 85%",
      "priority": "HIGH"
    }
  ]
}
```

**Response**:
```json
{
  "id": "pip-456",
  "userId": "user-123",
  "pipTitle": "Performance Improvement Plan - John Doe",
  "pipType": "PERFORMANCE",
  "severity": "STANDARD",
  "startDate": "2025-01-15T00:00:00Z",
  "endDate": "2025-04-15T00:00:00Z",
  "duration": 90,
  "reviewFrequency": "MONTHLY",
  "performanceIssues": [...],
  "specificBehaviors": [
    "Consistently missing code review standards",
    "Missing project deadlines"
  ],
  "impactStatement": "The following performance concerns have been identified and are impacting team productivity and business objectives: Increasing technical debt and bug rate; Affecting team velocity and customer commitments",
  "performanceExpectations": "Employee is expected to meet or exceed all performance standards for their role, including quality, timeliness, and productivity metrics.",
  "specificGoals": [
    {
      "goalNumber": 1,
      "specific": "Meet code quality standards in 90% of submissions",
      "measurable": "Achieve 80% or higher rating",
      "achievable": "Complete required actions within 90 days",
      "relevant": "Directly addresses identified performance gap in Code Quality",
      "timeBound": "To be achieved by end of PIP period (90 days)",
      "priority": "HIGH"
    }
  ],
  "measurableObjectives": [
    {
      "objectiveNumber": 1,
      "description": "Improve Code Quality",
      "metric": "Code quality score",
      "baseline": "Current: 65%",
      "target": "Target: 90%",
      "measurementMethod": "Manager assessment and performance data"
    }
  ],
  "successCriteria": [
    {
      "criterion": "Successfully complete Goal 1",
      "requiredEvidence": [
        "Documented progress in weekly check-ins",
        "Measurable improvement in key metrics",
        "Positive feedback from manager and peers"
      ],
      "weight": 50
    }
  ],
  "supportProvided": [
    {
      "type": "MENTORING",
      "description": "Assigned mentor for guidance and support",
      "frequency": "Weekly 1-hour sessions"
    },
    {
      "type": "TRAINING",
      "description": "Additional tools and resources for productivity",
      "frequency": "Ongoing"
    }
  ],
  "trainingRequired": [
    "Time management and productivity training",
    "Role-specific skills refresher"
  ],
  "mentorAssigned": "user-789",
  "coachingSchedule": [
    {
      "week": 4,
      "date": "2025-02-12T00:00:00Z",
      "topic": "Week 4 Coaching Session",
      "focus": "Goal setting and initial progress"
    }
  ],
  "milestones": [...],
  "checkInDates": [
    "2025-02-14T00:00:00Z",
    "2025-03-16T00:00:00Z",
    "2025-04-13T00:00:00Z"
  ],
  "consequencesOfNonCompliance": "Failure to meet the expectations outlined in this Performance Improvement Plan may result in further disciplinary action, up to and including termination of employment.",
  "escalationPath": [
    {
      "step": 1,
      "action": "Current PIP",
      "consequence": "Opportunity to improve"
    },
    {
      "step": 2,
      "action": "PIP Failure",
      "consequence": "Written warning and possible second PIP"
    }
  ],
  "status": "ACTIVE",
  "generatedBy": "AI"
}
```

#### POST `/api/actionable-insights/pip/:pipId/checkin`

Conduct PIP check-in.

**Request Body**:
```json
{
  "userId": "user-123",
  "progressSummary": "Employee has shown improvement in code quality metrics",
  "onTrack": true,
  "managerFeedback": "Good progress this month, continue current trajectory"
}
```

#### POST `/api/actionable-insights/pip/:pipId/complete`

Complete PIP with outcome.

**Request Body**:
```json
{
  "outcome": "SUCCESSFUL",
  "outcomeNotes": "Employee met all objectives and demonstrated sustained improvement"
}
```

### Database Schema

```prisma
model PerformanceImprovementPlan {
  id                    String    @id @default(uuid())
  tenantId              String
  userId                String
  createdBy             String
  pipTitle              String
  pipType               String
  severity              String
  startDate             DateTime
  endDate               DateTime
  duration              Int
  reviewFrequency       String

  // Issues & Expectations
  performanceIssues     Json
  specificBehaviors     String[]
  impactStatement       String    @db.Text
  performanceExpectations String  @db.Text

  // Goals & Objectives
  specificGoals         Json
  measurableObjectives  Json
  successCriteria       Json

  // Support
  supportProvided       Json
  trainingRequired      String[]
  mentorAssigned        String?
  coachingSchedule      Json

  // Tracking
  milestones            Json
  checkInDates          DateTime[]
  status                String    @default("ACTIVE")

  // Outcomes
  outcome               String?
  outcomeDate           DateTime?
  outcomeNotes          String?   @db.Text

  @@map("performance_improvement_plans")
}

model PIPCheckIn {
  id                    String    @id @default(uuid())
  tenantId              String
  pipId                 String
  userId                String
  checkInDate           DateTime
  checkInType           String
  conductedBy           String
  progressSummary       String    @db.Text
  onTrack               Boolean
  managerFeedback       String    @db.Text

  @@map("pip_check_ins")
}

model PIPMilestone {
  id                    String    @id @default(uuid())
  tenantId              String
  pipId                 String
  milestoneName         String
  description           String    @db.Text
  dueDate               DateTime
  successCriteria       Json
  measurableTargets     Json
  status                String    @default("NOT_STARTED")

  @@map("pip_milestones")
}
```

---

## Feature 50: Organizational Health & Culture Diagnostics

### Description

Comprehensive analytics and diagnostics system that aggregates organizational health metrics, culture assessments, and provides actionable insights for improvement.

### Key Capabilities

- **Overall Health Scoring**: Composite health score across 7 dimensions
- **Component Metrics**: Engagement, performance, culture, leadership, collaboration, innovation, wellbeing
- **Health Level Classification**: EXCELLENT, GOOD, FAIR, POOR, CRITICAL
- **Turnover & Retention Analytics**: Track hiring, terminations, and retention rates
- **Risk Indicators**: At-risk employees, burnout, disengagement, flight risk
- **Culture Diagnostics**: Competing Values Framework assessment
- **Sentiment Analysis**: Organizational sentiment tracking
- **Trend Analysis**: Period-over-period comparisons
- **Department Breakdowns**: Health metrics by department
- **Recommendations**: AI-generated improvement recommendations

### Health Score Components

1. **Engagement Score (20%)**: Employee engagement levels
2. **Performance Score (20%)**: Organizational performance metrics
3. **Culture Score (15%)**: Culture health and alignment
4. **Leadership Score (15%)**: Leadership effectiveness
5. **Collaboration Score (10%)**: Team collaboration quality
6. **Innovation Score (10%)**: Innovation and creativity
7. **Wellbeing Score (10%)**: Employee wellbeing and work-life balance

### API Endpoints

#### GET `/api/actionable-insights/health/calculate`

Calculate comprehensive organizational health metrics.

**Query Parameters**:
- `period`: WEEKLY | MONTHLY | QUARTERLY | ANNUAL (default: MONTHLY)

**Response**:
```json
{
  "id": "metrics-789",
  "metricDate": "2025-01-15T00:00:00Z",
  "period": "MONTHLY",
  "periodStart": "2024-12-16T00:00:00Z",
  "periodEnd": "2025-01-15T00:00:00Z",

  // Overall Health
  "overallHealthScore": 75.5,
  "healthLevel": "GOOD",
  "trendDirection": "IMPROVING",

  // Component Scores
  "engagementScore": 78.0,
  "performanceScore": 80.0,
  "cultureScore": 72.0,
  "leadershipScore": 75.0,
  "collaborationScore": 73.0,
  "innovationScore": 70.0,
  "wellbeingScore": 76.0,

  // People Metrics
  "headcount": 250,
  "activeEmployees": 248,
  "newHires": 15,
  "terminations": 3,
  "turnoverRate": 8.5,
  "retentionRate": 91.5,

  // Engagement Metrics
  "avgEngagementScore": 78.0,
  "employeeSatisfaction": 82.0,
  "eNPS": 25,

  // Performance Metrics
  "avgPerformanceRating": 4.0,
  "highPerformers": 45,
  "lowPerformers": 8,
  "goalCompletionRate": 75.0,

  // Development Metrics
  "employeesInDevelopment": 85,
  "avgDevelopmentHours": 15.5,
  "promotionRate": 12.0,

  // Risk Indicators
  "atRiskEmployees": 12,
  "burnoutRiskCount": 5,
  "disengagementRisk": 7,
  "flightRiskCount": 10,

  // Sentiment Metrics
  "avgSentimentScore": 0.35,
  "positiveSentiment": 65.0,
  "negativeSentiment": 12.0,

  // Insights
  "strengths": [
    "Strong overall organizational health",
    "High employee engagement levels",
    "Excellent performance across organization"
  ],
  "concerns": [
    "12 employees flagged as at-risk"
  ],
  "recommendations": [
    {
      "priority": "HIGH",
      "category": "WELLBEING",
      "action": "Implement burnout prevention programs",
      "impact": "Reduce employee stress and improve retention"
    }
  ]
}
```

#### POST `/api/actionable-insights/health/culture-diagnostic`

Conduct culture diagnostic assessment.

**Response**:
```json
{
  "id": "diagnostic-456",
  "diagnosticDate": "2025-01-15T00:00:00Z",
  "diagnosticType": "COMPREHENSIVE",

  // Culture Dimensions (Competing Values Framework)
  "clanCulture": 70.0,
  "adhocracyCulture": 65.0,
  "marketCulture": 75.0,
  "hierarchyCulture": 60.0,

  // Culture Attributes
  "psychologicalSafety": 72.0,
  "trustLevel": 68.0,
  "autonomy": 70.0,
  "transparency": 65.0,
  "accountability": 75.0,
  "innovation": 68.0,
  "customerFocus": 80.0,
  "resultsOrientation": 78.0,

  // Values Alignment
  "valuesAlignment": 70.0,
  "missionClarity": 75.0,
  "visionAlignment": 72.0,

  // Analysis
  "culturalStrengths": [
    "Strong results orientation",
    "High customer focus"
  ],
  "culturalWeaknesses": [
    "Lower psychological safety",
    "Moderate transparency"
  ],
  "cultureGaps": [],
  "recommendations": []
}
```

### Database Schema

```prisma
model OrganizationalHealthMetrics {
  id                    String    @id @default(uuid())
  tenantId              String
  metricDate            DateTime
  period                String
  periodStart           DateTime
  periodEnd             DateTime

  // Health Scores
  overallHealthScore    Decimal   @db.Decimal(5, 2)
  healthLevel           String
  trendDirection        String?

  // Component Scores
  engagementScore       Decimal   @db.Decimal(5, 2)
  performanceScore      Decimal   @db.Decimal(5, 2)
  cultureScore          Decimal   @db.Decimal(5, 2)
  leadershipScore       Decimal   @db.Decimal(5, 2)
  collaborationScore    Decimal   @db.Decimal(5, 2)
  innovationScore       Decimal   @db.Decimal(5, 2)
  wellbeingScore        Decimal   @db.Decimal(5, 2)

  // People Metrics
  headcount             Int
  activeEmployees       Int
  turnoverRate          Decimal   @db.Decimal(5, 2)
  retentionRate         Decimal   @db.Decimal(5, 2)

  // Risk Indicators
  atRiskEmployees       Int       @default(0)
  burnoutRiskCount      Int       @default(0)
  disengagementRisk     Int       @default(0)
  flightRiskCount       Int       @default(0)

  // Insights
  strengths             String[]
  concerns              String[]
  recommendations       Json

  @@map("organizational_health_metrics")
}

model CultureDiagnostic {
  id                    String    @id @default(uuid())
  tenantId              String
  diagnosticDate        DateTime
  diagnosticType        String

  // Culture Dimensions
  clanCulture           Decimal   @db.Decimal(5, 2)
  adhocracyCulture      Decimal   @db.Decimal(5, 2)
  marketCulture         Decimal   @db.Decimal(5, 2)
  hierarchyCulture      Decimal   @db.Decimal(5, 2)

  // Attributes
  psychologicalSafety   Decimal   @db.Decimal(5, 2)
  trustLevel            Decimal   @db.Decimal(5, 2)
  transparency          Decimal   @db.Decimal(5, 2)
  accountability        Decimal   @db.Decimal(5, 2)

  // Analysis
  culturalStrengths     String[]
  culturalWeaknesses    String[]
  recommendations       Json

  @@map("culture_diagnostics")
}
```

---

## Implementation Guide

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Prisma ORM 5.x
- TypeScript 5.x

### Installation

1. **Database Migration**:
```bash
cd packages/database
npm run db:generate
npm run db:push
```

2. **Install Dependencies**:
```bash
cd apps/api
npm install
```

### Configuration

Create `.env` file:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/pms"
```

### Usage Examples

See individual feature sections above for detailed API usage examples.

---

## Performance Considerations

- **Caching**: Implement Redis caching for frequently accessed recommendations
- **Batch Processing**: Process bulk operations asynchronously
- **Indexes**: All key query fields are indexed in database schema
- **Pagination**: Implement pagination for large result sets
- **Background Jobs**: Run heavy computations (team optimization, health metrics) as background jobs

---

## Security

- All endpoints require authentication
- Row-level security enforced via tenantId
- Sensitive PIP data requires HR role authorization
- Promotion recommendations require manager+ role
- Audit logging for all sensitive operations

---

## Monitoring

Track these metrics:
- Recommendation generation time
- Plan completion rates
- PIP success rates
- Team optimization accuracy
- Health score trends

---

## Future Enhancements

1. **Machine Learning Improvements**:
   - Collaborative filtering for team chemistry prediction
   - Deep learning for career path prediction
   - Neural networks for culture prediction

2. **Advanced Analytics**:
   - Predictive turnover modeling
   - Flight risk scoring
   - Succession pipeline analytics

3. **Integration**:
   - LMS integration for development plans
   - ATS integration for succession planning
   - HRIS integration for PIP workflow

---

## Support & Resources

- **API Documentation**: `/api/docs`
- **Source Code**: `/apps/api/src/services/actionable-insights/`
- **Database Schema**: `/packages/database/prisma/schema.prisma`

---

## Conclusion

The Actionable Insights & Planning Tools provide a comprehensive suite of AI-driven capabilities for strategic workforce planning, talent development, and organizational health management. The system enables data-driven decision making across the employee lifecycle from development to succession planning.
