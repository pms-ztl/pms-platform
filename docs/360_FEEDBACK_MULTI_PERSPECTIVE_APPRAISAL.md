# 360° Feedback & Multi-Perspective Appraisal System

## Overview

The 360° Feedback & Multi-Perspective Appraisal System provides a comprehensive framework for collecting, aggregating, and analyzing feedback from multiple perspectives including managers, peers, direct reports, self-evaluation, cross-functional stakeholders, and external stakeholders.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Feedback Cycle Management                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Nomination │  │ Collection │  │ Aggregation│         │
│  │   Phase    │  │   Phase    │  │   Phase    │         │
│  └────────────┘  └────────────┘  └────────────┘         │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│                 Feedback Perspectives                     │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌──────┐           │
│  │Mgr │ │Peer│ │Self│ │DR  │ │CF  │ │Stake │           │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └──────┘           │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│              Processing & Analysis                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │Anonymous │  │Sentiment │  │   Gap    │               │
│  │ ization  │  │ Analysis │  │ Analysis │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│                Results & Insights                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │Aggregated│  │Individual│  │Dashboard │               │
│  │ Results  │  │ Feedback │  │ & Reports│               │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Models

**FeedbackCycle** - Manages feedback collection cycles
```prisma
- Timeline: nomination → collection → aggregation → release
- Perspectives: Manager, Peers, Direct Reports, Self, Cross-Functional, Stakeholders
- Anonymity settings
- Questionnaire configuration
```

**FeedbackQuestionnaire** - Question templates
```prisma
- Question types: Rating, Open-ended, Multi-choice
- AI-driven question adaptation
- Competency-based questions
- Template library
```

**FeedbackNomination** - Reviewer nominations
```prisma
- Subject-Reviewer pairs
- Relationship classification
- Approval workflow
- Nomination reasons
```

**FeedbackRequest** - Feedback requests
```prisma
- Request tracking
- Due dates and reminders
- Access tokens
- Decline management
```

**FeedbackResponse** - Individual responses
```prisma
- Question responses
- Ratings and comments
- Anonymization
- Sentiment analysis
```

**FeedbackAggregation** - Aggregated results
```prisma
- Perspective-based aggregation
- Statistical measures
- Anonymity compliance
- Theme extraction
```

**FeedbackGapAnalysis** - Discrepancy analysis
```prisma
- Self vs Manager gap
- Self vs Peer gap
- Manager vs Peer gap
- Gap severity classification
```

**FeedbackAccessControl** - Privacy controls
```prisma
- View permissions
- Export permissions
- Time-based access
- Role-based controls
```

## Features (29-34)

### Feature 29: Intelligent 360° Feedback Collector

**Description:** Automated 360-degree appraisal system with AI-driven question adaptation

**Capabilities:**
- Multi-perspective feedback collection (6 perspectives)
- Dynamic questionnaire generation
- AI-powered question adaptation based on:
  - Role and seniority
  - Department and function
  - Previous feedback patterns
  - Performance history
- Automated reviewer nomination
- Smart reminder system
- Progress tracking
- Mobile-responsive collection interface

**Feedback Perspectives:**

1. **Manager Feedback** (1 reviewer)
   - Direct supervisor evaluation
   - Performance assessment
   - Goal achievement review
   - Development recommendations

2. **Peer Feedback** (3-5 reviewers)
   - Colleague collaboration
   - Team contribution
   - Technical skills
   - Communication effectiveness

3. **Direct Report Feedback** (2-∞ reviewers)
   - Leadership assessment
   - Support and guidance
   - Communication clarity
   - Management effectiveness

4. **Self-Evaluation** (1 reviewer - self)
   - Self-awareness check
   - Achievement reflection
   - Growth areas identification
   - Goal setting

5. **Cross-Functional Feedback** (2-4 reviewers)
   - Inter-departmental collaboration
   - Project contribution
   - Stakeholder management
   - Cross-team effectiveness

6. **Stakeholder Feedback** (optional, 1-3 reviewers)
   - External client feedback
   - Vendor relationships
   - Partner collaboration
   - Customer satisfaction

**AI Question Adaptation:**

```typescript
interface QuestionAdaptation {
  baseQuestion: string;
  adaptedQuestions: {
    junior: string;
    mid: string;
    senior: string;
    executive: string;
  };
  competencies: string[];
  weight: number;
}

// Example adaptation
const leadershipQuestion: QuestionAdaptation = {
  baseQuestion: "How effective is this person at leadership?",
  adaptedQuestions: {
    junior: "How well does this person contribute to team discussions and take initiative on tasks?",
    mid: "How effectively does this person mentor others and lead small initiatives?",
    senior: "How well does this person set strategic direction and develop team capabilities?",
    executive: "How effectively does this person drive organizational transformation and build high-performing teams?"
  },
  competencies: ["leadership", "influence", "team_development"],
  weight: 0.25
};
```

**Workflow:**

```
1. Cycle Creation
   ├── Define timeline
   ├── Select participants
   ├── Configure questionnaire
   └── Set anonymity rules

2. Nomination Phase
   ├── Self-nomination (if enabled)
   ├── Manager nomination
   ├── Auto-nomination (reporting lines)
   └── Approval workflow

3. Collection Phase
   ├── Send requests
   ├── AI-adapted questions
   ├── Real-time progress tracking
   └── Automated reminders

4. Aggregation Phase
   ├── Anonymization
   ├── Statistical aggregation
   ├── Sentiment analysis
   └── Gap analysis

5. Results Release
   ├── Access control application
   ├── Report generation
   ├── Dashboard visualization
   └── Action planning
```

### Feature 30: Peer Group Review Module

**Description:** Structured peer evaluation system with contribution comparisons

**Capabilities:**
- Peer nomination and selection
- Contribution scoring
- Relative ranking (optional)
- Comparative analysis
- Anonymous vs identified feedback
- Peer consensus metrics
- Outlier detection
- Calibration support

**Peer Review Components:**

**1. Peer Selection:**
```typescript
interface PeerSelectionCriteria {
  minPeers: number;              // Default: 3
  maxPeers: number;              // Default: 5
  allowSelfNomination: boolean;   // Default: true
  requireManagerApproval: boolean; // Default: true
  sameDepartment: boolean;        // Optional filter
  sameLevel: boolean;             // Optional filter
  collaborationHistory: boolean;  // Auto-suggest based on interactions
}
```

**2. Peer Comparison Matrix:**
```
Dimension: Technical Excellence
┌──────────────┬────────┬────────┬────────┬─────────┐
│ Reviewer     │ Rating │ vs Avg │ vs Team│ Outlier │
├──────────────┼────────┼────────┼────────┼─────────┤
│ Peer 1       │ 4.5    │ +0.3   │ +0.5   │   No    │
│ Peer 2       │ 4.0    │ -0.2   │  0.0   │   No    │
│ Peer 3       │ 4.2    │  0.0   │ +0.2   │   No    │
│ Peer 4       │ 3.0    │ -1.2   │ -1.0   │  Yes    │
│ Peer 5       │ 4.3    │ +0.1   │ +0.3   │   No    │
├──────────────┼────────┼────────┼────────┼─────────┤
│ Average      │ 4.0    │   -    │   -    │    -    │
│ Std Dev      │ 0.58   │   -    │   -    │    -    │
└──────────────┴────────┴────────┴────────┴─────────┘
```

**3. Peer Consensus Score:**
```typescript
function calculatePeerConsensus(ratings: number[]): {
  consensus: number;      // 0-100
  reliability: string;    // HIGH, MEDIUM, LOW
  outlierCount: number;
} {
  const mean = ratings.reduce((a, b) => a + b) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  // Low std dev = high consensus
  const consensus = Math.max(0, 100 - (stdDev / mean) * 100);

  // Detect outliers (>2 std dev from mean)
  const outliers = ratings.filter(r => Math.abs(r - mean) > 2 * stdDev);

  const reliability = consensus > 80 ? 'HIGH' : consensus > 60 ? 'MEDIUM' : 'LOW';

  return {
    consensus: Math.round(consensus),
    reliability,
    outlierCount: outliers.length
  };
}
```

### Feature 31: AI-Powered Self-Evaluation System

**Description:** Guided self-assessment with intelligent suggestions

**Capabilities:**
- Reflective prompts
- Achievement highlighting
- Gap identification
- Goal alignment
- AI-powered suggestions based on:
  - Past performance
  - Peer feedback patterns
  - Goal completion data
  - Growth trajectory
- Bias detection in self-assessment
- Calibration against others' views

**Self-Evaluation Structure:**

```typescript
interface SelfEvaluationSection {
  section: string;
  questions: SelfEvaluationQuestion[];
  aiSuggestions: AISuggestion[];
}

interface SelfEvaluationQuestion {
  id: string;
  question: string;
  type: 'rating' | 'text' | 'achievements' | 'goals';
  aiPrompt?: string;  // Contextual prompt
  examples?: string[]; // AI-generated examples
}

interface AISuggestion {
  type: 'achievement' | 'strength' | 'improvement' | 'goal';
  suggestion: string;
  confidence: number;
  evidence: string[];  // Supporting data
}
```

**AI Suggestions Example:**

```json
{
  "achievements": [
    {
      "suggestion": "Led migration of authentication system to OAuth 2.0",
      "confidence": 0.95,
      "evidence": [
        "Project milestone completed 2 weeks early",
        "Security audit passed with zero findings",
        "Positive feedback from 4 team members"
      ]
    }
  ],
  "strengths": [
    {
      "suggestion": "Consistently delivers high-quality code with low defect rates",
      "confidence": 0.88,
      "evidence": [
        "Code review approval rate: 98%",
        "Production bugs: 40% below team average",
        "Peer feedback mentions 'thorough' 6 times"
      ]
    }
  ],
  "improvements": [
    {
      "suggestion": "Could improve cross-team communication",
      "confidence": 0.75,
      "evidence": [
        "Cross-functional feedback avg: 3.8/5",
        "Peer feedback: 'Could share updates more proactively'",
        "Meeting participation below peers"
      ]
    }
  ]
}
```

**Bias Detection:**

```typescript
interface SelfAssessmentBias {
  type: 'inflation' | 'deflation' | 'balanced';
  severity: 'low' | 'medium' | 'high';
  dimensions: {
    dimension: string;
    selfRating: number;
    othersAvg: number;
    gap: number;
  }[];
  recommendation: string;
}

// Example: Self-inflation detected
{
  type: 'inflation',
  severity: 'medium',
  dimensions: [
    {
      dimension: 'Leadership',
      selfRating: 4.8,
      othersAvg: 3.9,
      gap: +0.9
    }
  ],
  recommendation: 'Your self-assessment is notably higher than others\' feedback. Consider reviewing specific examples and seeking clarification from your manager.'
}
```

### Feature 32: Stakeholder Impact Assessment Tool

**Description:** Multi-source feedback collection for stakeholder impact measurement

**Capabilities:**
- External stakeholder feedback
- Client satisfaction surveys
- Vendor relationship assessment
- Partner collaboration scores
- Impact measurement metrics
- Anonymous option for honest feedback
- Aggregated stakeholder view
- Longitudinal tracking

**Stakeholder Types:**

```typescript
enum StakeholderType {
  INTERNAL_CLIENT = 'Internal department/team served',
  EXTERNAL_CLIENT = 'External customer/client',
  VENDOR = 'External vendor/supplier',
  PARTNER = 'Business partner',
  BOARD_MEMBER = 'Board member/advisor',
  EXECUTIVE_SPONSOR = 'Executive sponsor',
  CROSS_FUNCTIONAL = 'Cross-functional collaborator'
}
```

**Impact Assessment Framework:**

```
Impact Dimensions:
1. Responsiveness (How quickly they respond to requests)
2. Quality (Quality of deliverables/service)
3. Communication (Clarity and frequency of communication)
4. Collaboration (Ease of working together)
5. Problem-Solving (Ability to resolve issues)
6. Value-Add (Strategic value beyond basic requirements)
7. Reliability (Consistency and dependability)
8. Innovation (Brings new ideas and approaches)
```

**Stakeholder Feedback Form:**

```typescript
interface StakeholderFeedback {
  stakeholderInfo: {
    type: StakeholderType;
    relationship: string;
    duration: string;        // How long worked together
    frequency: string;       // Interaction frequency
  };

  impactRatings: {
    responsiveness: number;  // 1-5
    quality: number;
    communication: number;
    collaboration: number;
    problemSolving: number;
    valueAdd: number;
    reliability: number;
    innovation: number;
  };

  qualitative: {
    positiveImpacts: string;    // What went well
    challengingAspects: string; // Areas for improvement
    futureExpectations: string; // What they'd like to see
  };

  nps: number;  // Net Promoter Score: -100 to 100
}
```

**Aggregated Stakeholder View:**

```
Stakeholder Impact Summary for Jane Doe
Period: Q1 2025
Total Stakeholders: 12

Average Impact Score: 4.2/5.0
┌──────────────────────┬───────┬────────────────┐
│ Dimension            │ Score │ vs. Benchmark  │
├──────────────────────┼───────┼────────────────┤
│ Responsiveness       │ 4.5   │ +0.3 (Above)   │
│ Quality              │ 4.7   │ +0.5 (Above)   │
│ Communication        │ 3.8   │ -0.2 (Below)   │
│ Collaboration        │ 4.3   │ +0.1 (Above)   │
│ Problem-Solving      │ 4.4   │ +0.2 (Above)   │
│ Value-Add            │ 4.0   │  0.0 (On par)  │
│ Reliability          │ 4.6   │ +0.4 (Above)   │
│ Innovation           │ 3.9   │ -0.1 (Slightly)│
└──────────────────────┴───────┴────────────────┘

Net Promoter Score: +45 (Promoters: 67%, Detractors: 22%)

Top Strengths (from qualitative feedback):
• Delivers high-quality work consistently
• Very responsive to urgent requests
• Goes above and beyond basic requirements

Development Areas:
• Could improve proactive communication
• Share more regular status updates
```

### Feature 33: Anonymous Feedback Aggregation Engine

**Description:** Anonymization system protecting respondent identity while maintaining data value

**Capabilities:**
- Cryptographic anonymization
- Minimum response thresholds
- Statistical aggregation
- Pattern obfuscation
- Re-identification prevention
- Audit trail (without PII)
- Compliance with privacy laws
- Anonymous ID generation

**Anonymization Algorithm:**

```typescript
interface AnonymizationConfig {
  minResponses: number;           // Default: 3
  suppressIndividual: boolean;    // Don't show individual if <min
  obfuscateOutliers: boolean;     // Blend extreme values
  hashResponderIds: boolean;      // Use cryptographic hashing
  stripMetadata: boolean;         // Remove timestamps, IP, etc.
}

class AnonymizationEngine {
  /**
   * Generate consistent anonymous ID for a reviewer in a cycle
   * Uses HMAC-SHA256 with cycle-specific salt
   */
  generateAnonymousId(
    reviewerId: string,
    cycleId: string,
    secretKey: string
  ): string {
    const data = `${reviewerId}:${cycleId}`;
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(data);
    return hmac.digest('hex').substring(0, 16);
  }

  /**
   * Check if feedback meets anonymity threshold
   */
  meetsAnonymityThreshold(
    responseCount: number,
    config: AnonymizationConfig
  ): boolean {
    return responseCount >= config.minResponses;
  }

  /**
   * Aggregate responses with anonymization
   */
  aggregateAnonymous(
    responses: FeedbackResponse[],
    config: AnonymizationConfig
  ): AggregatedFeedback {
    if (!this.meetsAnonymityThreshold(responses.length, config)) {
      return {
        error: 'INSUFFICIENT_RESPONSES',
        message: `Need at least ${config.minResponses} responses for anonymity`,
        canShow: false
      };
    }

    // Aggregate ratings
    const ratings = responses.map(r => r.overallRating);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const stdDev = this.calculateStdDev(ratings);

    // Aggregate qualitative feedback with pattern extraction
    const themes = this.extractThemes(responses.map(r => r.strengths));

    // Obfuscate outliers to prevent re-identification
    const sanitizedRatings = config.obfuscateOutliers
      ? this.obfuscateOutliers(ratings, avgRating, stdDev)
      : ratings;

    return {
      responseCount: responses.length,
      avgRating: avgRating,
      ratingRange: {
        min: Math.min(...sanitizedRatings),
        max: Math.max(...sanitizedRatings)
      },
      themes: themes,
      meetsAnonymityThreshold: true,
      canShow: true
    };
  }

  /**
   * Obfuscate outlier values to prevent re-identification
   */
  private obfuscateOutliers(
    values: number[],
    mean: number,
    stdDev: number
  ): number[] {
    return values.map(v => {
      // If value is >2 std dev from mean, pull it closer
      if (Math.abs(v - mean) > 2 * stdDev) {
        const direction = v > mean ? 1 : -1;
        return mean + (direction * 2 * stdDev);
      }
      return v;
    });
  }

  /**
   * Extract common themes from text feedback
   */
  private extractThemes(texts: string[]): string[] {
    // NLP-based theme extraction
    // For simplicity, using keyword frequency
    const keywords = this.extractKeywords(texts);
    return keywords.slice(0, 5); // Top 5 themes
  }
}
```

**Privacy Protection Measures:**

1. **Minimum Response Threshold:**
   - Require minimum 3 responses before showing aggregated results
   - Show "Insufficient responses for anonymity" if below threshold

2. **Anonymous ID Generation:**
   - Use HMAC-SHA256 with cycle-specific salt
   - Consistent within cycle, different across cycles
   - No reverse mapping possible

3. **Metadata Stripping:**
   - Remove timestamps
   - Remove IP addresses
   - Remove browser fingerprints
   - Randomize response order

4. **Outlier Obfuscation:**
   - Detect extreme values (>2σ from mean)
   - Pull outliers toward mean
   - Prevents "only one person would rate that way" identification

5. **Qualitative Aggregation:**
   - Extract themes instead of showing individual comments
   - Paraphrase similar feedback
   - Group related comments

**Access Controls:**

```typescript
interface FeedbackAccessRules {
  subject: {
    canViewOwnResults: boolean;
    canViewAggregated: boolean;
    canViewIndividual: boolean;      // Only if not anonymous
    canViewComparisons: boolean;
    canExport: boolean;
  };
  manager: {
    canViewTeamAggregated: boolean;
    canViewIndividual: boolean;
    canViewComparisons: boolean;
    canExport: boolean;
  };
  hr: {
    canViewAllAggregated: boolean;
    canViewIndividual: boolean;      // With proper justification
    canExport: boolean;
    auditRequired: boolean;
  };
  admin: {
    canViewRawData: boolean;         // For technical troubleshooting only
    auditRequired: boolean;
    requiresApproval: boolean;
  };
}
```

### Feature 34: Cross-Hierarchical Appraisal Comparison

**Description:** Comparison tool for peer vs. manager vs. self evaluations

**Capabilities:**
- Multi-perspective comparison
- Gap visualization
- Discrepancy analysis
- Blind spot detection
- Hidden strength identification
- Alignment scoring
- Calibration recommendations
- Development insights

**Comparison Framework:**

```
Spider/Radar Chart Comparison:
        Communication (5.0)
                |
    Technical   |    Leadership
        (4.5) --+--  (3.5)
              / | \
    Collab   /  |  \   Problem
    (4.0)   /   |   \  Solving (4.2)
           /    |    \
          ------+------
               Self: ─
               Manager: ━
               Peers: ···
```

**Gap Analysis Types:**

```typescript
enum GapType {
  SELF_INFLATION = 'Self-rating significantly higher than others',
  SELF_DEFLATION = 'Self-rating significantly lower than others',
  MANAGER_PEER_MISMATCH = 'Manager and peer ratings diverge',
  BLIND_SPOT = 'Rated low by others, high by self',
  HIDDEN_STRENGTH = 'Rated high by others, low by self',
  ALIGNED = 'All perspectives in agreement'
}

enum GapSeverity {
  LOW = 'Gap < 0.5 points',
  MEDIUM = 'Gap 0.5-1.0 points',
  HIGH = 'Gap 1.0-1.5 points',
  CRITICAL = 'Gap > 1.5 points'
}
```

**Gap Analysis Report:**

```
360° Feedback Gap Analysis
Employee: John Smith
Cycle: Q4 2024 Annual Review

Overall Alignment Score: 72/100 (Medium Alignment)

┌─────────────────────────────────────────────────────────────┐
│ Dimension: Leadership                                        │
├─────────────┬────────┬────────┬─────────┬─────────┬─────────┤
│ Perspective │ Rating │ vs Self│ vs Mgr  │ vs Peers│ Status  │
├─────────────┼────────┼────────┼─────────┼─────────┼─────────┤
│ Self        │  4.2   │   -    │  +0.9   │  +0.8   │ ⚠️ High │
│ Manager     │  3.3   │  -0.9  │    -    │  -0.1   │ ✓ Good  │
│ Peers (4)   │  3.4   │  -0.8  │  +0.1   │    -    │ ✓ Good  │
│ Reports (3) │  3.0   │  -1.2  │  -0.3   │  -0.4   │ 🔴 Crit │
├─────────────┼────────┼────────┼─────────┼─────────┼─────────┤
│ Gap Type    │        │ SELF_INFLATION (BLIND_SPOT)          │
│ Severity    │        │ HIGH                                 │
│ Confidence  │        │ HIGH (7 responses, low variance)     │
└─────────────┴────────┴────────┴─────────┴─────────┴─────────┘

📊 Interpretation:
Your self-assessment of leadership is notably higher than how others
perceive it, particularly from direct reports. This indicates a
potential blind spot in leadership effectiveness.

💡 Recommendations:
1. Seek specific examples from your manager about leadership gaps
2. Schedule 1:1s with direct reports to understand their perspective
3. Consider leadership coaching or training
4. Set concrete goals around leadership behaviors
5. Request more frequent feedback on leadership decisions

📈 Development Priority: HIGH
Focus Area: Leadership impact on direct reports
```

**Comparison Dashboard:**

```
┌───────────────────────────────────────────────────────────┐
│ 360° Feedback Comparison Dashboard                        │
├───────────────────────────────────────────────────────────┤
│                                                            │
│ Alignment by Dimension                                    │
│ ═══════════════════════                                   │
│ Technical Skills      ████████████████ 92% ✓              │
│ Communication         ████████████ 75% ✓                  │
│ Leadership            ████████ 58% ⚠️                     │
│ Collaboration         ███████████████ 88% ✓               │
│ Problem Solving       ████████████████ 91% ✓              │
│                                                            │
├───────────────────────────────────────────────────────────┤
│ Key Insights                                              │
│                                                            │
│ ✓ Strengths (Aligned positive ratings):                  │
│   • Technical Excellence (All rate 4.5+)                  │
│   • Problem Solving (All rate 4.0+)                       │
│                                                            │
│ 🔍 Blind Spots (Self higher than others):                │
│   • Leadership: Self 4.2, Others 3.2 (Δ 1.0)            │
│   • Delegation: Self 4.0, Others 3.0 (Δ 1.0)            │
│                                                            │
│ 💎 Hidden Strengths (Self lower than others):            │
│   • Mentoring: Self 3.5, Others 4.3 (Δ 0.8)             │
│   • Innovation: Self 3.8, Others 4.5 (Δ 0.7)            │
│                                                            │
│ ⚠️ Development Areas (All rate low):                     │
│   • Conflict Resolution (All rate 3.0-3.2)               │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

**Calibration Recommendations:**

```typescript
interface CalibrationRecommendation {
  dimension: string;
  issue: string;
  severity: GapSeverity;
  actions: CalibrationAction[];
}

interface CalibrationAction {
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  timeline: string;
  owner: 'EMPLOYEE' | 'MANAGER' | 'HR';
}

// Example recommendations
const recommendations: CalibrationRecommendation[] = [
  {
    dimension: 'Leadership',
    issue: 'Self-inflation with 1.0 point gap',
    severity: GapSeverity.HIGH,
    actions: [
      {
        action: 'Schedule calibration session with manager to discuss specific leadership behaviors',
        priority: 'HIGH',
        timeline: 'Within 1 week',
        owner: 'MANAGER'
      },
      {
        action: 'Gather specific examples from direct reports through skip-level meetings',
        priority: 'HIGH',
        timeline: 'Within 2 weeks',
        owner: 'MANAGER'
      },
      {
        action: 'Enroll in leadership development program',
        priority: 'MEDIUM',
        timeline: 'Within 1 month',
        owner: 'EMPLOYEE'
      },
      {
        action: 'Implement 360° feedback check-in after 3 months',
        priority: 'MEDIUM',
        timeline: '3 months',
        owner: 'HR'
      }
    ]
  }
];
```

## Implementation

### Database Schema Summary

**9 Core Models:**
1. FeedbackCycle - Cycle management
2. FeedbackQuestionnaire - Question templates
3. FeedbackNomination - Reviewer nominations
4. FeedbackRequest - Feedback requests
5. FeedbackResponse - Individual responses
6. FeedbackAggregation - Aggregated results
7. FeedbackGapAnalysis - Discrepancy analysis
8. FeedbackAccessControl - Privacy controls

**Key Features:**
- Multi-tenancy support
- Soft delete
- Comprehensive indexing
- JSON flexibility for questions/responses
- Anonymization support
- Audit trails

### API Endpoints

```
Cycle Management:
POST   /api/v1/feedback/cycles                Create cycle
GET    /api/v1/feedback/cycles                List cycles
GET    /api/v1/feedback/cycles/:id            Get cycle
PATCH  /api/v1/feedback/cycles/:id            Update cycle
DELETE /api/v1/feedback/cycles/:id            Delete cycle
POST   /api/v1/feedback/cycles/:id/launch     Launch cycle
POST   /api/v1/feedback/cycles/:id/close      Close cycle

Nominations:
POST   /api/v1/feedback/cycles/:id/nominations     Create nominations
GET    /api/v1/feedback/cycles/:id/nominations     List nominations
POST   /api/v1/feedback/nominations/:id/approve    Approve nomination
POST   /api/v1/feedback/nominations/:id/reject     Reject nomination

Requests:
GET    /api/v1/feedback/requests                   My requests
GET    /api/v1/feedback/requests/:id               Get request
POST   /api/v1/feedback/requests/:id/decline       Decline request
POST   /api/v1/feedback/requests/:id/remind        Send reminder

Responses:
POST   /api/v1/feedback/responses                  Create/update response
GET    /api/v1/feedback/responses/:id              Get response (draft)
POST   /api/v1/feedback/responses/:id/submit       Submit response
GET    /api/v1/feedback/token/:token               Access via token

Results:
GET    /api/v1/feedback/cycles/:id/results/:userId Get results
GET    /api/v1/feedback/cycles/:id/aggregation     Get aggregated
GET    /api/v1/feedback/cycles/:id/gap-analysis    Get gap analysis
GET    /api/v1/feedback/cycles/:id/comparisons     Get comparisons
POST   /api/v1/feedback/cycles/:id/export          Export results

Questionnaires:
POST   /api/v1/feedback/questionnaires             Create questionnaire
GET    /api/v1/feedback/questionnaires             List questionnaires
GET    /api/v1/feedback/questionnaires/:id         Get questionnaire
PATCH  /api/v1/feedback/questionnaires/:id         Update questionnaire
GET    /api/v1/feedback/questionnaires/templates   Get templates

Access Control:
POST   /api/v1/feedback/cycles/:id/access          Grant access
DELETE /api/v1/feedback/cycles/:id/access/:userId  Revoke access
GET    /api/v1/feedback/cycles/:id/access          List access
```

### Workflow Implementation

**1. Create Feedback Cycle:**

```typescript
const cycle = await feedbackService.createCycle({
  tenantId,
  name: 'Q1 2025 360° Review',
  cycleType: 'QUARTERLY',
  nominationStartDate: new Date('2025-01-01'),
  nominationEndDate: new Date('2025-01-15'),
  feedbackStartDate: new Date('2025-01-16'),
  feedbackEndDate: new Date('2025-02-15'),
  questionnaireId: 'questionnaire-uuid',
  includeManager: true,
  includePeers: true,
  minPeerReviewers: 3,
  maxPeerReviewers: 5,
  isAnonymous: true,
  minResponsesForAnonymity: 3,
  participantIds: ['user1', 'user2', 'user3'],
  createdById: userId
});
```

**2. Nomination Phase:**

```typescript
// Auto-nominate based on reporting lines
await feedbackService.autoNominate(cycleId);

// Employee self-nominates peers
await feedbackService.nominatePeer({
  cycleId,
  subjectId: employeeId,
  reviewerId: peerId,
  relationship: 'PEER',
  nominatedBy: employeeId,
  nominationReason: 'Works closely on Project X'
});

// Manager approves nominations
await feedbackService.approveNomination(nominationId, managerId);
```

**3. Send Requests:**

```typescript
// Automatically send requests for approved nominations
await feedbackService.sendRequests(cycleId);
```

**4. Collect Responses:**

```typescript
// Reviewer submits feedback
await feedbackService.submitResponse({
  requestId,
  responses: {
    'q1': { rating: 4, comment: 'Strong technical skills' },
    'q2': { rating: 5, comment: 'Excellent collaboration' }
  },
  overallRating: 4.5,
  strengths: 'Technical excellence, team player',
  areasForImprovement: 'Could improve documentation'
});
```

**5. Aggregate Results:**

```typescript
// Run aggregation for all participants
await feedbackService.aggregateResults(cycleId);

// Run gap analysis
await feedbackService.runGapAnalysis(cycleId);
```

**6. Release Results:**

```typescript
// Grant access to results
await feedbackService.grantAccess({
  cycleId,
  userId: employeeId,
  canViewOwnResults: true,
  canViewAggregated: true,
  canViewIndividual: false,
  canViewComparisons: true
});
```

## Benefits

**For Employees:**
- Comprehensive multi-perspective feedback
- Identify blind spots and hidden strengths
- Data-driven development planning
- Fair and objective assessment
- Anonymous option encourages honesty

**For Managers:**
- Holistic view of employee performance
- Identify coaching opportunities
- Calibrate ratings with peers
- Support development conversations
- Reduce bias in evaluations

**For HR:**
- Standardized feedback process
- Analytics and insights
- Compliance and audit trails
- Identify high performers
- Succession planning data

**For Organization:**
- Performance culture
- Continuous improvement
- Reduced bias
- Data-driven decisions
- Employee development

---

**Last Updated:** February 3, 2025
**Version:** 1.0.0
**Author:** PMS Platform Team
