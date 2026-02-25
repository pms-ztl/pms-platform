/**
 * Excel Validation Agent — LLM-enhanced Excel upload validation.
 *
 * Roles: Manager, Admin
 * Enhances the existing rule-based validator with:
 * - Smart auto-fixes (email domains, phone formats, name casing)
 * - Duplicate detection with confidence scores
 * - Level distribution analysis
 * - Data enrichment suggestions
 * - Cross-field consistency checking
 */

import { v4 as uuidv4 } from 'uuid';

import { prisma } from '@pms/database';
import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../agentic-base-agent';
import type { LLMProvider, LLMResponse } from '../llm-client';
import { logger } from '../../../utils/logger';

// ── Types ──────────────────────────────────────────────────

export interface AIAutoFix {
  id: string;
  row: number;
  field: string;
  currentValue: string;
  suggestedValue: string;
  issue: string;
  confidence: number;
  category: 'name_casing' | 'email_completion' | 'department_match' | 'level_adjustment' | 'date_format' | 'role_match' | 'data_cleanup';
}

export interface AIReviewItem {
  row: number;
  field: string;
  issue: string;
  options: string[];
  severity: 'warning' | 'error';
}

export interface AIDuplicateCluster {
  rows: number[];
  reason: string;
  confidence: number;
}

export interface AIAnalysisResult {
  qualityScore: number;
  autoFixable: AIAutoFix[];
  reviewNeeded: AIReviewItem[];
  duplicateClusters: AIDuplicateCluster[];
  analysis: {
    levelDistribution: Array<{ level: number; count: number }>;
    departmentDistribution: Array<{ dept: string; count: number }>;
    overallNotes: string;
    riskFlags: string[];
  };
}

// ── System Prompt ──────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intelligent data validation assistant for employee Excel uploads in a Performance Management System.

Your capabilities:
1. **Smart Error Fixing**: Identify and suggest fixes for common data issues
   - Email domains: suggest adding @company.com based on dominant pattern
   - Name casing: convert ALL CAPS, all lowercase, or inconsistent casing to Title Case
   - Department names: correct misspellings, suggest closest match from existing departments
   - Role names: match against available roles with fuzzy matching
   - Date formats: normalize to YYYY-MM-DD

2. **Duplicate Detection**: Flag potential duplicate employees
   - Similar first+last name combinations (accounting for typos)
   - Very similar email addresses
   - Same employee numbers with different formatting

3. **Level Distribution Analysis**: Check if the org level distribution looks reasonable
   - Flag if too many people are at the same level
   - Flag if junior titles have senior levels or vice versa

4. **Cross-Field Consistency**:
   - Job title vs level alignment
   - Department vs role alignment
   - Manager hierarchy validation

5. **Data Quality Score**: Give an overall quality score (0-100)
   - 90-100: Excellent - minimal or no issues
   - 70-89: Good - some minor fixes suggested
   - 50-69: Fair - several issues need attention
   - 0-49: Poor - significant data quality problems

CRITICAL RULES:
- You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no explanatory text
- Every auto-fix MUST include a confidence score between 0 and 1
- Confidence > 0.9 means safe to auto-apply; 0.7-0.9 means suggest but verify; < 0.7 means needs review
- Use the provided organizational context (departments, roles, email patterns) to make informed suggestions
- Never invent data — only suggest corrections based on existing patterns`;

// Chat-mode system prompt — used when this agent is invoked via the chat interface
// (as opposed to the dedicated analyzeExcelData endpoint)
const CHAT_SYSTEM_PROMPT = `You are the Excel Data Validation specialist for a Performance Management System.

When users chat with you, respond in clear, friendly natural language. You can help with:
- Explaining your data validation capabilities (duplicate detection, format checks, etc.)
- Answering questions about Excel upload requirements and column formats
- Giving tips on data quality, common mistakes, and how to prepare clean data
- Describing what auto-fixes you can perform (email domains, name casing, date formats)
- Explaining quality scores and what they mean

If a user asks about specific data, explain what you can check and suggest they use
the Excel Upload feature to get a full AI-enhanced validation report.

Always respond in natural language — do NOT respond with raw JSON.`;

// ── Agent Class ────────────────────────────────────────────

export class ExcelValidationAgent extends AgenticBaseAgent {
  /** Track whether the current call is a chat request (vs dedicated analysis) */
  private _isChatMode = true;

  constructor() {
    super('excel_validation', CHAT_SYSTEM_PROMPT);
  }

  /** Use standard tier for better reasoning on data analysis */
  protected override getLLMOptions(): { maxTokens?: number; temperature?: number; model?: string; provider?: LLMProvider } {
    return {
      ...MODEL_TIERS.standard,
      maxTokens: 4096,
      temperature: this._isChatMode ? 0.3 : 0.1,
    };
  }

  /**
   * Override parseResponse to catch accidental JSON responses in chat mode
   * and convert them to a natural-language summary.
   */
  protected override parseResponse(llmResponse: LLMResponse): {
    message: string;
    data?: Record<string, unknown>;
    suggestedActions?: Array<{ label: string; url?: string; action?: string }>;
  } {
    let content = llmResponse.content;

    // If the response looks like raw JSON, convert to natural language
    try {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('```json')) {
        let cleaned = trimmed;
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);
        content = this.formatAsNaturalLanguage(parsed);
      }
    } catch {
      // Not valid JSON — use as-is (this is fine for chat)
    }

    return { message: content };
  }

  /**
   * Convert a JSON analysis result into a friendly natural language summary.
   */
  private formatAsNaturalLanguage(data: Record<string, unknown>): string {
    const lines: string[] = [];

    // Quality score
    if (typeof data.qualityScore === 'number') {
      const score = data.qualityScore;
      const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Attention';
      lines.push(`## Data Quality: ${score}/100 (${label})\n`);
    }

    // Auto-fixable issues
    const fixes = data.autoFixable as any[];
    if (Array.isArray(fixes) && fixes.length > 0) {
      lines.push(`### 🔧 Auto-Fixable Issues (${fixes.length})`);
      for (const fix of fixes.slice(0, 5)) {
        lines.push(`- **Row ${fix.row}, ${fix.field}**: ${fix.issue} — suggested: "${fix.suggestedValue}" (confidence: ${Math.round((fix.confidence ?? 0) * 100)}%)`);
      }
      if (fixes.length > 5) lines.push(`- ...and ${fixes.length - 5} more`);
      lines.push('');
    }

    // Review needed
    const reviews = data.reviewNeeded as any[];
    if (Array.isArray(reviews) && reviews.length > 0) {
      lines.push(`### ⚠️ Needs Manual Review (${reviews.length})`);
      for (const item of reviews.slice(0, 5)) {
        lines.push(`- **Row ${item.row}, ${item.field}**: ${item.issue}`);
      }
      if (reviews.length > 5) lines.push(`- ...and ${reviews.length - 5} more`);
      lines.push('');
    }

    // Duplicates
    const dupes = data.duplicateClusters as any[];
    if (Array.isArray(dupes) && dupes.length > 0) {
      lines.push(`### 🔄 Potential Duplicates (${dupes.length} clusters)`);
      for (const cluster of dupes.slice(0, 3)) {
        lines.push(`- Rows ${(cluster.rows ?? []).join(', ')}: ${cluster.reason}`);
      }
      lines.push('');
    }

    // Overall notes
    const analysis = data.analysis as any;
    if (analysis?.overallNotes) {
      lines.push(`### 📝 Summary\n${analysis.overallNotes}`);
    }
    if (Array.isArray(analysis?.riskFlags) && analysis.riskFlags.length > 0) {
      lines.push(`\n### 🚩 Risk Flags`);
      for (const flag of analysis.riskFlags) {
        lines.push(`- ${flag}`);
      }
    }

    return lines.length > 0
      ? lines.join('\n')
      : 'Analysis complete. Your data looks good — no significant issues found.';
  }

  protected override async gatherAgentData(
    context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — exposes license counts and employee lists
    const denied = this.requireManager(context, 'Excel validation and employee data imports');
    if (denied) return denied;

    // Gather rich organizational context for LLM
    const [departments, roles, users, tenant] = await Promise.all([
      prisma.department.findMany({
        where: { tenantId: context.tenantId },
        select: { name: true, code: true },
      }),
      prisma.role.findMany({
        where: { tenantId: context.tenantId, deletedAt: null },
        select: { name: true, category: true },
      }),
      prisma.user.findMany({
        where: { tenantId: context.tenantId, deletedAt: null, isActive: true },
        select: { email: true, firstName: true, lastName: true, level: true, employeeNumber: true },
      }),
      prisma.tenant.findUnique({
        where: { id: context.tenantId },
        select: { maxLevel: true, licenseCount: true, maxUsers: true },
      }),
    ]);

    // Compute email domain pattern
    const domainCounts = new Map<string, number>();
    for (const u of users) {
      const domain = u.email.split('@')[1]?.toLowerCase();
      if (domain) domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }
    const emailDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count, percentage: Math.round((count / users.length) * 100) }));

    // Compute level distribution
    const levelCounts = new Map<number, number>();
    for (const u of users) {
      if (u.level) levelCounts.set(u.level, (levelCounts.get(u.level) || 0) + 1);
    }

    return {
      organizationContext: {
        departments: departments.map((d) => ({ name: d.name, code: d.code })),
        roles: roles.map((r) => ({ name: r.name, category: r.category })),
        emailDomains,
        currentLevelDistribution: Array.from(levelCounts.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([level, count]) => ({ level, count })),
        existingEmployeeCount: users.length,
        existingNames: users.slice(0, 200).map((u) => ({
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          employeeNumber: u.employeeNumber,
        })),
      },
      validationRules: {
        maxLevel: tenant?.maxLevel ?? 16,
        licenseLimit: Math.max(tenant?.licenseCount ?? 0, tenant?.maxUsers ?? 0),
        activeUsers: users.length,
      },
    };
  }

  /**
   * Analyze Excel data for issues.
   * Called by the upload service during the Analyze phase.
   * Uses the JSON system prompt (not the chat prompt).
   */
  async analyzeExcelData(
    tenantId: string,
    userId: string,
    rows: Record<string, unknown>[],
    existingErrors: Array<{ row: number; field: string; message: string }>,
    existingWarnings: Array<{ row: number; field: string; message: string; severity: string }>,
    existingSuggestions: Array<{ row: number; field: string; currentValue: string; suggestedValue: string; reason: string }>,
  ): Promise<AIAnalysisResult> {
    const prompt = `Analyze this employee data upload for a Performance Management System.

Upload contains ${rows.length} rows.

Rule-based validation already found:
- ${existingErrors.length} errors (blocking)
- ${existingWarnings.length} warnings (non-blocking)
- ${existingSuggestions.length} auto-fix suggestions

Existing errors (first 20):
${JSON.stringify(existingErrors.slice(0, 20), null, 2)}

Existing warnings (first 10):
${JSON.stringify(existingWarnings.slice(0, 10), null, 2)}

Existing suggestions (first 10):
${JSON.stringify(existingSuggestions.slice(0, 10), null, 2)}

All upload data (rows):
${JSON.stringify(rows.slice(0, 50), null, 2)}
${rows.length > 50 ? `... and ${rows.length - 50} more rows` : ''}

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown, no code fences):
{
  "qualityScore": <number 0-100>,
  "autoFixable": [
    {
      "row": <number>,
      "field": "<string>",
      "currentValue": "<string>",
      "suggestedValue": "<string>",
      "issue": "<string description>",
      "confidence": <number 0-1>,
      "category": "<name_casing|email_completion|department_match|level_adjustment|date_format|role_match|data_cleanup>"
    }
  ],
  "reviewNeeded": [
    {
      "row": <number>,
      "field": "<string>",
      "issue": "<string>",
      "options": ["<option1>", "<option2>"],
      "severity": "<warning|error>"
    }
  ],
  "duplicateClusters": [
    {
      "rows": [<row numbers>],
      "reason": "<why these look like duplicates>",
      "confidence": <number 0-1>
    }
  ],
  "analysis": {
    "levelDistribution": [{"level": <number>, "count": <number>}],
    "departmentDistribution": [{"dept": "<string>", "count": <number>}],
    "overallNotes": "<string summary of data quality>",
    "riskFlags": ["<string risk flag>"]
  }
}

Important:
- Do NOT duplicate suggestions already in existingSuggestions — add only NEW AI-discovered issues
- Focus on patterns that rule-based validation cannot catch (semantic similarity, context-aware fixes)
- Include row numbers that correspond to the data (row 3 = first data row in Excel)
- If no issues found, return empty arrays with a high quality score`;

    try {
      // Switch to JSON analysis mode (uses the original JSON system prompt)
      this._isChatMode = false;
      this.systemPrompt = SYSTEM_PROMPT;

      const response = await this.process(tenantId, userId, prompt);

      // Restore chat mode for future chat calls
      this._isChatMode = true;
      this.systemPrompt = CHAT_SYSTEM_PROMPT;

      // Parse the LLM response as JSON
      const parsed = this.parseAIResponse(response.message);
      return parsed;
    } catch (err) {
      // Restore chat mode even on failure
      this._isChatMode = true;
      this.systemPrompt = CHAT_SYSTEM_PROMPT;
      logger.error('ExcelValidationAgent.analyzeExcelData failed', {
        tenantId,
        error: (err as Error).message,
      });
      // Return a safe fallback
      return {
        qualityScore: -1, // -1 indicates AI analysis failed
        autoFixable: [],
        reviewNeeded: [],
        duplicateClusters: [],
        analysis: {
          levelDistribution: [],
          departmentDistribution: [],
          overallNotes: 'AI analysis unavailable. Rule-based validation results are still available.',
          riskFlags: [],
        },
      };
    }
  }

  /**
   * Parse the raw LLM response into a structured AIAnalysisResult.
   * Handles malformed JSON gracefully.
   */
  private parseAIResponse(raw: string): AIAnalysisResult {
    try {
      // Strip markdown fences if present
      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      // Validate and sanitize the structure
      const result: AIAnalysisResult = {
        qualityScore: typeof parsed.qualityScore === 'number' ? Math.max(0, Math.min(100, parsed.qualityScore)) : 50,
        autoFixable: Array.isArray(parsed.autoFixable)
          ? parsed.autoFixable.map((fix: any) => ({
              id: uuidv4(),
              row: Number(fix.row) || 0,
              field: String(fix.field || ''),
              currentValue: String(fix.currentValue || ''),
              suggestedValue: String(fix.suggestedValue || ''),
              issue: String(fix.issue || ''),
              confidence: typeof fix.confidence === 'number' ? Math.max(0, Math.min(1, fix.confidence)) : 0.5,
              category: this.validateCategory(fix.category),
            }))
          : [],
        reviewNeeded: Array.isArray(parsed.reviewNeeded)
          ? parsed.reviewNeeded.map((item: any) => ({
              row: Number(item.row) || 0,
              field: String(item.field || ''),
              issue: String(item.issue || ''),
              options: Array.isArray(item.options) ? item.options.map(String) : [],
              severity: item.severity === 'error' ? 'error' as const : 'warning' as const,
            }))
          : [],
        duplicateClusters: Array.isArray(parsed.duplicateClusters)
          ? parsed.duplicateClusters.map((cluster: any) => ({
              rows: Array.isArray(cluster.rows) ? cluster.rows.map(Number) : [],
              reason: String(cluster.reason || ''),
              confidence: typeof cluster.confidence === 'number' ? Math.max(0, Math.min(1, cluster.confidence)) : 0.5,
            }))
          : [],
        analysis: {
          levelDistribution: Array.isArray(parsed.analysis?.levelDistribution)
            ? parsed.analysis.levelDistribution.map((item: any) => ({
                level: Number(item.level) || 0,
                count: Number(item.count) || 0,
              }))
            : [],
          departmentDistribution: Array.isArray(parsed.analysis?.departmentDistribution)
            ? parsed.analysis.departmentDistribution.map((item: any) => ({
                dept: String(item.dept || ''),
                count: Number(item.count) || 0,
              }))
            : [],
          overallNotes: String(parsed.analysis?.overallNotes || 'Analysis complete'),
          riskFlags: Array.isArray(parsed.analysis?.riskFlags)
            ? parsed.analysis.riskFlags.map(String)
            : [],
        },
      };

      return result;
    } catch {
      logger.warn('Failed to parse AI validation response', { rawLength: raw.length });
      return {
        qualityScore: -1,
        autoFixable: [],
        reviewNeeded: [],
        duplicateClusters: [],
        analysis: {
          levelDistribution: [],
          departmentDistribution: [],
          overallNotes: 'AI analysis produced an unreadable response. Rule-based results are still valid.',
          riskFlags: [],
        },
      };
    }
  }

  private validateCategory(cat: any): AIAutoFix['category'] {
    const valid: AIAutoFix['category'][] = ['name_casing', 'email_completion', 'department_match', 'level_adjustment', 'date_format', 'role_match', 'data_cleanup'];
    return valid.includes(cat) ? cat : 'data_cleanup';
  }
}
