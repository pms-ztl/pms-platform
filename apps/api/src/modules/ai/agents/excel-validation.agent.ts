/**
 * Excel Validation Agent — LLM-enhanced Excel upload validation.
 *
 * Roles: Manager, Admin
 * Enhances the existing rule-based validator with:
 * - Smart auto-fixes (email domains, phone formats, name casing)
 * - Duplicate detection
 * - Level distribution analysis
 * - Data enrichment suggestions
 */

import { BaseAgent, type AgentContext } from '../base-agent';
import * as tools from '../agent-tools';

const SYSTEM_PROMPT = `You are an intelligent data validation assistant for employee Excel uploads.

Your capabilities:
1. **Smart Error Fixing**: Identify and suggest fixes for common data issues
   - Email domains: suggest adding @company.com
   - Phone numbers: standardize format
   - Name casing: convert ALL CAPS to Title Case
   - Department names: correct misspellings

2. **Duplicate Detection**: Flag potential duplicate employees (similar names, emails)

3. **Level Distribution Analysis**: Check if the org level distribution looks reasonable

4. **Data Quality**: Flag suspicious patterns (future dates, missing required fields, etc.)

When analyzing data:
- Categorize issues as "auto-fixable" (safe to fix automatically) or "review-needed" (requires human decision)
- Provide specific fix suggestions with row numbers
- Give an overall data quality score
- Use markdown formatting with tables for clarity`;

export class ExcelValidationAgent extends BaseAgent {
  constructor() {
    super('excel_validation', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // Get tenant config for validation context
    const license = await tools.queryLicenseUsage(context.tenantId);
    const existingUsers = await tools.queryUsers(context.tenantId, { limit: 100 });

    return {
      tenantConfig: license.data,
      existingEmployees: existingUsers.data,
      validationRules: {
        maxLevel: (license.data as Record<string, unknown>)?.maxLevel ?? 16,
        licenseLimit: (license.data as Record<string, unknown>)?.licenseCount ?? 0,
        activeUsers: (license.data as Record<string, unknown>)?.activeUsers ?? 0,
      },
    };
  }

  /**
   * Analyze Excel data for issues.
   * Called directly by the AI service for the /excel/analyze endpoint.
   */
  async analyzeExcelData(
    tenantId: string,
    userId: string,
    rows: Record<string, unknown>[],
    existingErrors: Array<{ row: number; field: string; message: string }>,
  ) {
    const prompt = `Analyze this employee data upload for issues.

Upload contains ${rows.length} rows.

Existing validation errors found by rule-based system:
${JSON.stringify(existingErrors.slice(0, 20), null, 2)}

Sample data (first 10 rows):
${JSON.stringify(rows.slice(0, 10), null, 2)}

Please:
1. Identify auto-fixable issues and suggest specific fixes
2. Flag items that need human review
3. Analyze the level distribution
4. Check for potential duplicates
5. Give an overall data quality score (0-100)

Respond in JSON format:
{
  "qualityScore": number,
  "autoFixable": [{"row": number, "field": string, "issue": string, "suggestedFix": string}],
  "reviewNeeded": [{"row": number, "field": string, "issue": string, "options": string[]}],
  "analysis": {"levelDistribution": string, "duplicatesFound": number, "overallNotes": string}
}`;

    return this.process(tenantId, userId, prompt);
  }
}
