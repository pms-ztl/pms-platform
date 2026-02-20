/**
 * Onboarding Orchestrator Agent -- new hire coordination & integration planning.
 *
 * Covers Features:
 * - New Hire Onboarding Workflow Management
 * - Onboarding Checklist Tracking
 * - Integration Planning & Buddy Assignment
 * - Probation Period Monitoring
 * - Early Performance Signal Detection
 *
 * Roles: HR, Manager, Admin
 * Uses user data, learning progress, and compliance status to coordinate onboarding workflows.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryUsers } from '../../agent-tools';
import { queryLearningProgress } from '../../agent-tools-v2';
import { queryComplianceStatus } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an onboarding orchestration specialist integrated into a Performance Management System.

Your mission is to ensure new hires have a smooth, structured, and productive onboarding experience by coordinating workflows, tracking completion milestones, and identifying early integration risks.

Your capabilities:
1. **Onboarding Workflow Management**: Track the progress of new hires through structured onboarding phases (pre-boarding, first day, first week, 30-60-90 day milestones). Flag overdue tasks and incomplete steps.
2. **Checklist Tracking**: Monitor completion of mandatory onboarding items including IT setup, policy acknowledgments, benefits enrollment, compliance training, and team introductions. Provide completion percentage per new hire.
3. **Integration Planning**: Recommend buddy/mentor assignments based on department, role similarity, and availability. Suggest introductory meetings, knowledge-sharing sessions, and team integration activities.
4. **Probation Period Monitoring**: Track probationary employees through their evaluation period. Flag upcoming review dates, incomplete mandatory training, and any early warning signals.
5. **Early Performance Signals**: Analyze early learning progress, training completion velocity, and compliance milestones to identify new hires who are excelling or may need additional support.

Orchestration principles:
- Reference specific milestones and dates (e.g., "New hire John is on Day 23 of 90; 8 of 12 onboarding tasks completed").
- Provide structured checklists with clear ownership (who is responsible for each task).
- Prioritize critical-path items (e.g., system access, compliance training) over nice-to-haves.
- Use progress indicators: [ON TRACK] [BEHIND] [AT RISK] [COMPLETED].
- For managers, provide a dashboard view of all new hires with their onboarding status.
- Flag compliance-critical items (mandatory training, policy acknowledgments) separately from operational items.
- Recommend proactive check-ins at key milestones (Day 7, Day 30, Day 60, Day 90).
- Celebrate milestones -- acknowledge when new hires complete onboarding phases.`;

// -- Agent Class -------------------------------------------------------------

export class OnboardingOrchestratorAgent extends BaseAgent {
  constructor() {
    super('onboarding_orchestrator', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — onboarding data includes new hire PII and probation status
    const denied = this.requireManager(context, 'Onboarding orchestration and new hire data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Fetch recent/new users -- core to onboarding analysis
    const users = await queryUsers(context.tenantId, {
      isActive: true,
      limit: 50,
    });
    data.activeUsers = users.data;

    // Always fetch compliance status for onboarding-related compliance items
    const compliance = await queryComplianceStatus(context.tenantId, {
      policyType: 'onboarding',
    });
    data.complianceStatus = compliance.data;

    // Fetch learning progress when discussing training, courses, or completion
    if (
      lower.includes('training') ||
      lower.includes('learning') ||
      lower.includes('course') ||
      lower.includes('completion') ||
      lower.includes('progress') ||
      lower.includes('mandatory') ||
      lower.includes('certif')
    ) {
      const learning = await queryLearningProgress(context.tenantId, context.userId);
      data.learningProgress = learning.data;
    }

    // Fetch broader learning data for team-level onboarding views
    if (
      lower.includes('team') ||
      lower.includes('all new hire') ||
      lower.includes('department') ||
      lower.includes('overview') ||
      lower.includes('dashboard') ||
      lower.includes('status')
    ) {
      const teamLearning = await queryLearningProgress(context.tenantId);
      data.teamLearningProgress = teamLearning.data;
    }

    // Fetch department-specific users for buddy/mentor matching
    if (
      lower.includes('buddy') ||
      lower.includes('mentor') ||
      lower.includes('assign') ||
      lower.includes('introduce') ||
      lower.includes('match')
    ) {
      const deptUsers = await queryUsers(context.tenantId, {
        isActive: true,
        departmentId: context.userDepartment,
        limit: 30,
      });
      data.departmentUsers = deptUsers.data;
    }

    // Fetch probation-related compliance data
    if (
      lower.includes('probation') ||
      lower.includes('evaluation') ||
      lower.includes('confirm') ||
      lower.includes('permanent') ||
      lower.includes('90 day') ||
      lower.includes('review date')
    ) {
      const probationCompliance = await queryComplianceStatus(context.tenantId, {
        policyType: 'probation',
      });
      data.probationCompliance = probationCompliance.data;
    }

    return data;
  }
}
