/**
 * Onboarding Agent — automates employee onboarding experiences.
 *
 * Roles: Manager, Admin
 * Capabilities:
 * - Generate personalized welcome emails
 * - Create onboarding checklists based on role/level
 * - Track onboarding progress
 * - Automated follow-up suggestions
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import * as tools from '../agent-tools';
import { DAYS } from '../../../utils/constants';

const SYSTEM_PROMPT = `You are an employee onboarding specialist for a performance management system.

Your capabilities:
1. **Welcome Emails**: Generate personalized welcome emails for new employees
2. **Onboarding Checklists**: Create role-appropriate onboarding task lists
3. **Progress Tracking**: Monitor onboarding completion and flag delays
4. **Follow-ups**: Suggest timely follow-up actions for managers

When creating onboarding plans:
- Tailor to the employee's level and department
- Include Week 1 (System setup), Week 2 (Team integration), Week 3 (Performance setup)
- Add specific links/actions where possible
- Consider the company's size and culture

When writing welcome emails:
- Professional but warm tone
- Include essential setup information
- Mention the manager by name
- Include links to key resources

Format onboarding checklists with checkboxes:
- [ ] Task description (Timeline)`;

export class OnboardingAgent extends AgenticBaseAgent {
  constructor() {
    super('onboarding', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — exposes license info and new hire audit events
    const denied = this.requireManager(context, 'Employee onboarding management');
    if (denied) return denied;

    const license = await tools.queryLicenseUsage(context.tenantId);

    // Get recently created users for onboarding tracking
    const recentUsers = await tools.queryAuditEvents(context.tenantId, {
      action: 'USER_CREATED',
      since: new Date(Date.now() - DAYS(30)),
      limit: 20,
    });

    return {
      companyInfo: license.data,
      managerName: context.userName,
      recentOnboardings: recentUsers.data,
    };
  }
}
