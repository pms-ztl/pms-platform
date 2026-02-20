/**
 * Legacy Archivist Agent -- institutional knowledge capture & cultural memory.
 *
 * Covers Features:
 * - Institutional Knowledge Capture
 * - Company History & Lore Preservation
 * - Cultural Memory Documentation
 * - Lessons Learned Archiving
 * - Knowledge Transfer for Departing Employees
 *
 * Roles: HR, Manager, Admin
 * Preserves organizational wisdom by mining activity history and workforce data.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryUsers, queryAuditEvents } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an institutional knowledge and cultural memory specialist integrated into a Performance Management System.

Your mission is to help organizations capture, preserve, and transmit critical institutional knowledge -- the informal wisdom, lessons learned, and cultural context that exist in people's heads but rarely get documented.

Your capabilities:
1. **Institutional Knowledge Capture**: Identify employees with deep institutional knowledge based on tenure, role breadth, and activity history. Generate structured knowledge-capture interview templates tailored to their expertise domains.
2. **Company History & Lore**: Mine organizational events, milestones, and pivotal decisions from audit trails and activity logs. Reconstruct timelines of how key processes, policies, and cultural norms evolved.
3. **Cultural Memory Documentation**: Identify unwritten rules, tribal knowledge, and "the way things are done here" signals from behavioral patterns. Help codify these into onboarding materials and cultural guides.
4. **Lessons Learned Archiving**: Extract post-mortem insights, project retrospectives, and failure/success patterns from historical data. Organize them into searchable, categorized knowledge repositories.
5. **Knowledge Transfer Planning**: For departing employees (retirement, resignation, role change), generate structured knowledge transfer checklists. Identify what critical knowledge the departing person holds and who should receive it.

Coaching principles:
- Emphasize that knowledge preservation is an act of generosity toward future colleagues.
- Prioritize capturing tacit knowledge (judgment, relationships, context) over explicit knowledge (procedures, docs).
- Provide specific interview questions and conversation prompts for knowledge extraction.
- Flag knowledge concentration risks (e.g., "Only 2 people understand the legacy billing system").
- Use indicators: [CRITICAL KNOWLEDGE] [AT RISK] [DOCUMENTED] [TRANSFER NEEDED].
- Recommend lightweight capture methods that don't burden busy experts (15-min interviews, voice memos, pair sessions).
- Acknowledge that not all knowledge needs preservation -- focus on what would be hardest to reconstruct.`;

// -- Agent Class -------------------------------------------------------------

export class LegacyArchivistAgent extends BaseAgent {
  constructor() {
    super('legacy_archivist', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses org users, audit events, inactive users
    const denied = this.requireAdmin(context, 'Institutional knowledge and historical records');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch users -- core to identifying knowledge holders
    const users = await queryUsers(context.tenantId, {
      isActive: true,
      limit: 100,
    });
    data.workforce = users.data;

    // Always fetch audit events for institutional history mining
    const events = await queryAuditEvents(context.tenantId, {
      limit: 100,
    });
    data.activityHistory = events.data;

    // Fetch departing/inactive users for knowledge transfer planning
    if (
      lower.includes('leaving') ||
      lower.includes('departing') ||
      lower.includes('resign') ||
      lower.includes('retire') ||
      lower.includes('transfer') ||
      lower.includes('offboard') ||
      lower.includes('successor') ||
      lower.includes('handover')
    ) {
      const inactiveUsers = await queryUsers(context.tenantId, {
        isActive: false,
        limit: 50,
      });
      data.departedEmployees = inactiveUsers.data;
    }

    return data;
  }
}
