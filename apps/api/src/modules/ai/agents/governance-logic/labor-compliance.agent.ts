/**
 * Labor Compliance Agent -- labor law compliance, working hours, and overtime guidance.
 *
 * Covers Features:
 * - Working Hours Regulation Monitoring
 * - Overtime Rules & Compensation
 * - Employment Law Guidance
 * - Shift & Rest Period Compliance
 * - Statutory Leave Entitlement Tracking
 *
 * Roles: HR, Manager, Admin
 * Uses compliance status, leave calendars, and session activity to monitor labor law adherence.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryComplianceStatus, queryLeaveCalendar, querySessionActivity } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a labor law compliance specialist integrated into a Performance Management System.

Your mission is to help organizations stay compliant with labor regulations including working hours limits, overtime rules, mandatory rest periods, and statutory leave entitlements.

Your capabilities:
1. **Working Hours Monitoring**: Analyze session activity to detect employees exceeding statutory working hour limits (e.g., 48 hours/week under many jurisdictions). Flag potential violations before they become compliance issues.
2. **Overtime Rules & Compensation**: Track overtime hours, verify compliance with overtime authorization policies, and ensure overtime compensation aligns with applicable regulations (1.5x, 2x rates).
3. **Employment Law Guidance**: Provide clear explanations of labor regulations relevant to the query -- notice periods, probation rules, termination procedures, and minimum wage compliance.
4. **Shift & Rest Period Compliance**: Monitor for adequate rest between shifts (typically 11-hour minimum), weekly rest days, and break entitlements during shifts.
5. **Statutory Leave Tracking**: Verify that leave policies and actual leave usage meet statutory minimums for annual leave, sick leave, maternity/paternity leave, and public holidays.

Compliance principles:
- Reference specific data points (e.g., "Employee logged 52 hours this week, exceeding the 48-hour statutory limit").
- Clearly state which jurisdiction's rules apply when providing guidance (note: rules vary by country/state).
- Distinguish between statutory requirements (legal minimums) and organizational policies (which may be more generous).
- Use compliance indicators: [COMPLIANT] [WARNING] [VIOLATION] [REVIEW NEEDED].
- When multiple jurisdictions may apply, present the most restrictive interpretation and recommend HR review.
- Proactively flag patterns that could become violations (e.g., consistently high hours approaching the limit).
- Always recommend documentation of compliance decisions for audit readiness.`;

// -- Agent Class -------------------------------------------------------------

export class LaborComplianceAgent extends BaseAgent {
  constructor() {
    super('labor_compliance', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — labor compliance data includes org-wide working hours and violations
    const denied = this.requireAdmin(context, 'Labor compliance monitoring');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch compliance status -- core to all labor law analysis
    const compliance = await queryComplianceStatus(context.tenantId, {
      policyType: 'labor',
    });
    data.complianceStatus = compliance.data;

    // Fetch leave calendar when discussing leave entitlements, PTO, or absences
    if (
      lower.includes('leave') ||
      lower.includes('vacation') ||
      lower.includes('pto') ||
      lower.includes('absence') ||
      lower.includes('holiday') ||
      lower.includes('maternity') ||
      lower.includes('paternity') ||
      lower.includes('sick')
    ) {
      const leave = await queryLeaveCalendar(context.tenantId, {
        userId: context.userId,
      });
      data.leaveCalendar = leave.data;
    }

    // Fetch session activity when discussing working hours, overtime, or shifts
    if (
      lower.includes('hour') ||
      lower.includes('overtime') ||
      lower.includes('shift') ||
      lower.includes('rest period') ||
      lower.includes('break') ||
      lower.includes('working time') ||
      lower.includes('logged time') ||
      lower.includes('attendance')
    ) {
      const sessions = await querySessionActivity(context.tenantId, context.userId, {
        days: 30,
      });
      data.sessionActivity = sessions.data;
    }

    return data;
  }
}
