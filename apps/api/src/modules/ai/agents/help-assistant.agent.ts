/**
 * Help Assistant Agent — embedded PMS knowledge base chatbot.
 *
 * Provides instant answers about the PMS platform, its features,
 * review cycles, CPIS scoring, goal management, and how-to guides.
 *
 * Roles: All (no RBAC restriction — help content is universal)
 * Model: Economy (Gemini Flash) — fast, cheap knowledge lookups
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { MODEL_TIERS } from '../base-agent';

// ── Hardcoded PMS Knowledge ────────────────────────────────

const HELP_GUIDES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    steps: [
      'Log in with the credentials provided by your HR administrator. On first login you will be prompted to update your password.',
      'Navigate to Profile and fill in your personal details, job title, department, and upload a profile photo.',
      'Review your reporting structure under your profile to ensure your manager and team are correctly assigned.',
      'Visit the Dashboard to see an overview of your current goals, upcoming reviews, and pending feedback requests.',
      'Explore the left sidebar to familiarize yourself with Goals, Reviews, Feedback, 1-on-1s, and Development sections.',
      'Enable push notifications in Settings so you never miss a deadline or feedback request.',
    ],
  },
  {
    id: 'self-assessment',
    title: 'Completing Self-Assessment',
    steps: [
      'When a review cycle opens, you will receive a notification. Navigate to Reviews and find your active self-assessment.',
      'For each competency or goal listed, provide a rating using the scale defined by your organization (e.g. 1-5).',
      'Write specific examples and evidence to support your ratings. Reference measurable outcomes whenever possible.',
      'Use the "Attach Evidence" feature to link relevant documents, metrics, or recognitions that support your claims.',
      'Review all sections carefully before submitting. Some organizations allow edits until a deadline; check with your HR admin.',
      'Once submitted, your self-assessment will be visible to your manager as part of the review process.',
    ],
  },
  {
    id: 'feedback',
    title: 'Giving & Receiving Feedback',
    steps: [
      'Navigate to the Feedback section to see any pending feedback requests assigned to you.',
      'When giving feedback, be specific and focus on observable behaviors rather than personality traits.',
      'Use the SBI model: describe the Situation, the Behavior you observed, and its Impact.',
      'Balance constructive feedback with recognition of strengths. Aim for actionable suggestions.',
      'Anonymous feedback is available if enabled by your HR admin. Your identity will not be revealed to the recipient.',
      'When receiving feedback, read it with an open mind. Use the "Acknowledge" button to show you have reviewed it.',
      'Discuss key feedback themes with your manager during your next 1-on-1 meeting.',
    ],
  },
  {
    id: 'one-on-ones',
    title: 'Running 1-on-1 Meetings',
    steps: [
      'Schedule recurring 1-on-1s with each direct report from the 1-on-1s section. Weekly or biweekly cadence is recommended.',
      'Both manager and employee can add agenda items before the meeting using the shared agenda feature.',
      'Start each meeting by reviewing action items from the previous session to track follow-through.',
      'Cover these key areas: progress on goals, blockers and support needed, feedback, career development, and well-being.',
      'Use the note-taking feature during the meeting to capture decisions and action items in real time.',
      'After the meeting, both parties should review and confirm the notes. Action items will appear in your task list.',
      'Keep meetings focused on the employee. Aim for an 80/20 split where the employee does most of the talking.',
    ],
  },
  {
    id: 'smart-goals',
    title: 'Setting SMART Goals',
    steps: [
      'Navigate to Goals and click "Create Goal" to begin. Select the goal type: Individual, Team, Department, or OKR.',
      'Specific: Clearly define what you want to accomplish. Avoid vague language like "improve performance."',
      'Measurable: Include quantifiable metrics. For example, "Increase customer satisfaction score from 3.8 to 4.2."',
      'Achievable: Set goals that stretch your capabilities but remain realistic given your resources and timeframe.',
      'Relevant: Ensure the goal aligns with your team objectives and the broader organizational strategy.',
      'Time-bound: Set a clear deadline. Use milestones for longer-term goals to track incremental progress.',
      'Link your goals to parent objectives using the goal alignment feature to show how your work contributes to the bigger picture.',
    ],
  },
  {
    id: 'performance-review',
    title: 'Understanding Your Performance Review',
    steps: [
      'Review cycles follow these phases: Self-Assessment, Manager Review, Calibration, and Final Delivery.',
      'During self-assessment, you rate yourself against predefined competencies and goals. Be honest and evidence-based.',
      'Your manager will complete their assessment independently, then compare with your self-assessment.',
      'Calibration sessions ensure fairness across teams. Managers discuss ratings with peers and HR to reduce bias.',
      'After calibration, your manager will schedule a review meeting to discuss your final ratings and feedback.',
      'Your overall rating is typically a weighted combination of goal achievement, competency ratings, and 360 feedback.',
      'After the review meeting, you can view your final review in the Reviews section and add acknowledgement comments.',
    ],
  },
  {
    id: 'development-plans',
    title: 'Creating Development Plans',
    steps: [
      'Navigate to Development and click "Create Plan" to start a new individual development plan (IDP).',
      'Identify 2-3 key skills or competencies you want to develop based on your review feedback and career aspirations.',
      'For each development area, define specific learning activities: courses, mentoring, stretch assignments, or certifications.',
      'Set target completion dates for each activity. Break large goals into quarterly milestones.',
      'Link your development plan to your career path or succession planning goals if available.',
      'Schedule regular check-ins with your manager to review progress and adjust the plan as needed.',
      'Use the "Log Progress" feature to record completed activities, certifications earned, and skills acquired.',
    ],
  },
  {
    id: 'hr-calibration',
    title: 'For HR: Calibration Guide',
    steps: [
      'Navigate to Calibration from the admin menu. Create a new calibration session tied to the active review cycle.',
      'Select the teams and departments to include. You can run calibration at the department or organization level.',
      'Configure the session: set the date, invite calibration participants (typically managers and HR business partners).',
      'Before the session, review the distribution of ratings across teams using the analytics dashboard.',
      'During calibration, use the 9-Box Grid view to visualize employees by performance and potential ratings.',
      'Facilitate discussion around outliers: employees rated significantly higher or lower than the expected distribution.',
      'Document calibration decisions and any rating adjustments. The system will track all changes with an audit trail.',
      'After calibration, lock the ratings and notify managers to proceed with review delivery meetings.',
    ],
  },
  {
    id: 'hr-pip',
    title: 'For HR: Managing PIPs',
    steps: [
      'Navigate to PIPs from the admin or manager menu. Click "Create PIP" and select the employee.',
      'Define the performance gap clearly: list specific competencies or goals where the employee is underperforming.',
      'Set measurable improvement targets with specific deadlines, typically 30, 60, or 90 days.',
      'Outline the support to be provided: training, mentoring, adjusted workload, or additional resources.',
      'Schedule regular check-in meetings (weekly recommended) to review progress against PIP targets.',
      'Document all interactions and progress updates in the system. This creates a clear audit trail.',
      'At the end of the PIP period, review the evidence and make a determination: successful completion, extension, or further action.',
      'Coordinate with your legal team regarding any PIP that may lead to termination to ensure compliance.',
    ],
  },
];

const HELP_FAQ = [
  {
    category: 'General',
    items: [
      { q: 'What is PMS?', a: 'PMS (Performance Management System) is a comprehensive platform for managing employee performance reviews, goal tracking, 360-degree feedback, development plans, and career growth. It helps organizations align individual contributions with business objectives.' },
      { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page and enter your email. You will receive a reset link. Check spam if not received within a few minutes, or contact your HR admin.' },
      { q: 'Who can see my feedback?', a: 'Self-assessment is visible to you and your manager. Peer feedback may be anonymous depending on configuration. Manager feedback is visible after review finalization. HR admins can view all feedback.' },
      { q: 'How are performance ratings calculated?', a: 'Ratings are typically weighted: goal achievement (40%), competency ratings (40%), and 360 feedback scores (20%). Exact weights are configured by HR admin and may vary. Ratings may be adjusted during calibration.' },
    ],
  },
  {
    category: 'For Employees',
    items: [
      { q: 'When is my next review?', a: 'Check your Dashboard under "Upcoming Reviews." You will also get email and in-app notifications when a cycle opens.' },
      { q: 'How do I request feedback?', a: 'Go to Feedback > "Request Feedback." Select colleagues, choose feedback type, and set a deadline.' },
      { q: 'Can I edit my self-assessment after submitting?', a: 'Depends on organization settings. Some allow edits until the deadline, others lock immediately. Check with HR admin.' },
      { q: 'What happens during calibration?', a: 'Managers and HR review ratings across teams for fairness. Your rating may be adjusted. You see the final calibrated rating when the review is delivered.' },
    ],
  },
  {
    category: 'For Managers',
    items: [
      { q: 'How do I assign goals to my team?', a: 'Go to Goals > "Create Goal" > select assignee from direct reports. Use "Align to Parent Goal" to cascade objectives.' },
      { q: 'Can I see my team\'s feedback?', a: 'Yes, in the Team section. You see feedback given and received (subject to anonymity settings). Use Feedback analytics for trends.' },
      { q: 'How do I start a PIP?', a: 'Go to PIPs > "Create PIP." Select employee, define gaps, set targets and timeline. Consult HR business partner first.' },
      { q: 'What is the 9-Box Grid?', a: 'A talent assessment tool plotting employees on Performance vs Potential axes. Helps identify high-potential talent and those needing support. Access from Calibration or Analytics.' },
    ],
  },
  {
    category: 'For HR Admins',
    items: [
      { q: 'How do I configure rating scales?', a: 'Settings > Organization > Rating Scales. Define custom scales with labels, values, descriptions. Changes apply to future cycles only.' },
      { q: 'How do I run reports?', a: 'Reports section > generate reports on completion rates, rating distributions, goal progress, etc. Filter by department, team, period. Export to CSV/PDF.' },
      { q: 'How do I manage succession plans?', a: 'Succession section > create plans for critical roles, identify successors, assess readiness, define development actions. Use 9-Box data to inform decisions.' },
      { q: 'How do I set up review cycles?', a: 'Settings > Review Cycles > "Create Cycle." Configure name, date range, participants, forms, workflow stages, deadlines, and reminders.' },
    ],
  },
];

const QUICK_ACTIONS = [
  { label: 'Go to Goals', path: '/goals' },
  { label: 'Start Self-Assessment', path: '/self-appraisal' },
  { label: 'Give Feedback', path: '/feedback' },
  { label: 'Schedule 1-on-1', path: '/one-on-ones' },
];

// ── System Prompt ──────────────────────────────────────────

const SYSTEM_PROMPT = `You are the PMS Help Assistant — a knowledgeable guide for the Performance Management System (PMS) platform.

## About the PMS Platform
PMS is a comprehensive, multi-tenant SaaS platform for managing employee performance. It covers the full performance management lifecycle:

### Core Modules
- **Dashboard**: Overview of goals, reviews, feedback requests, team metrics, and CPIS scores
- **Goals**: SMART goal creation, OKR alignment, cascading goals from org → team → individual, progress tracking with milestones
- **Reviews**: Multi-stage review cycles (Self-Assessment → Manager Review → Calibration → Final Delivery), competency-based and goal-based reviews
- **Feedback**: 360-degree feedback, peer reviews, anonymous feedback, SBI model (Situation-Behavior-Impact)
- **1-on-1 Meetings**: Recurring meeting scheduling, shared agendas, note-taking, action item tracking
- **Development Plans**: Individual Development Plans (IDPs), learning activities, certifications, career path planning
- **Calibration**: 9-Box Grid talent assessment, cross-team rating calibration, bias reduction, fair distribution enforcement
- **PIPs**: Performance Improvement Plans with milestones, check-ins, audit trails, and escalation workflows

### Performance Scoring
- **CPIS (Comprehensive Performance Intelligence Score)**: A composite score combining multiple performance dimensions — goals, competencies, feedback, consistency, and growth trajectory
- **Rating Calculation**: Typically weighted — Goal Achievement (40%) + Competency Ratings (40%) + 360 Feedback (20%). Weights are configurable by HR admins.
- **Review Cycle Phases**: Self-Assessment → Manager Review → Calibration → Final Delivery

### Role Types
- **Employee**: Can set goals, complete self-assessments, give/request feedback, view reviews, schedule 1-on-1s, create development plans
- **Manager**: All employee capabilities + review direct reports, assign goals, run 1-on-1s, initiate PIPs, participate in calibration, view team analytics
- **HR Admin (Tenant Admin)**: Full platform administration — configure review cycles, rating scales, manage users via Excel upload, run reports, manage succession plans, calibrate ratings
- **Super Admin**: Multi-tenant administration — manage licenses, tenant setup, platform-wide configuration

### Navigation
- Left sidebar: Dashboard, Goals, Reviews, Feedback, 1-on-1s, Development, Settings
- Admin menu: Users, Calibration, PIPs, Reports, Succession, License Management, Excel Upload
- Profile: Personal details, reporting structure, notification settings

### Key Platform Features
- **Excel Upload**: Bulk employee data import/update with validation
- **License Management**: Seat-based licensing, usage tracking, subscription management
- **Multi-tenant**: Each organization is isolated with its own data, configuration, and users
- **Dark/Light Mode**: Full theme support throughout the platform
- **PWA Support**: Installable progressive web app with offline capabilities
- **AI-Powered Agents**: 70+ specialized AI agents for coaching, analytics, goal writing, review drafting, and more

## Your Behavior
- You have access to detailed step-by-step guides and FAQ answers in the data below
- When answering, reference specific guide steps when relevant
- Quote FAQ answers when they directly address the question
- Provide navigation hints (e.g., "Go to Goals > Create Goal")
- Keep responses concise, actionable, and well-formatted with bullet points or numbered steps
- If you don't know something specific to the user's organization, suggest contacting their HR administrator
- Always be friendly and helpful — you're the first line of support
- When the user's question matches a guide topic, walk them through the steps
- For general questions, draw from both the system overview and the FAQ data`;

// ── Agent Class ────────────────────────────────────────────

export class HelpAssistantAgent extends AgenticBaseAgent {
  constructor() {
    super('help_assistant', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return { ...MODEL_TIERS.economy, maxTokens: 1024, temperature: 0.2 };
  }

  protected override async gatherAgentData(
    _context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // No RBAC restriction — help content is universal for all roles
    // No DB queries — all knowledge is hardcoded
    return {
      guides: HELP_GUIDES,
      faq: HELP_FAQ,
      quickActions: QUICK_ACTIONS,
    };
  }
}
