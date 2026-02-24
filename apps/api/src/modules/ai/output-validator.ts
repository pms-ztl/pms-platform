/**
 * Output Validator — post-processing guardrails for all AI agent responses.
 *
 * Runs AFTER the LLM generates a response and BEFORE it's returned to the user.
 * Catches issues that prompt-based guardrails can't guarantee:
 *
 * 1. PII Detection: SSN, credit card, passport patterns
 * 2. Prohibited Content: Salary amounts, legal advice, medical diagnoses
 * 3. HR Policy Compliance: Gendered language, discriminatory recommendations
 * 4. Response Length: Hard cap to prevent runaway generation
 * 5. Tenant Data Leakage: Cross-tenant data references
 */

import { logger } from '../../utils/logger';

// ── Constants ──────────────────────────────────────────────

/** Maximum response length in characters */
const MAX_RESPONSE_LENGTH = 8000;

// ── PII Patterns ───────────────────────────────────────────

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: 'SSN',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN REDACTED]',
  },
  {
    name: 'Credit Card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    replacement: '[CARD NUMBER REDACTED]',
  },
  {
    name: 'Credit Card Spaced',
    pattern: /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g,
    replacement: '[CARD NUMBER REDACTED]',
  },
  {
    name: 'Passport',
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    // Only flag if preceded by passport-related words to reduce false positives
    replacement: '[PASSPORT REDACTED]',
  },
  {
    name: 'Bank Account',
    pattern: /\baccount\s*(?:number|#|no\.?)\s*[:.]?\s*\d{8,17}\b/gi,
    replacement: '[ACCOUNT NUMBER REDACTED]',
  },
  {
    name: 'Routing Number',
    pattern: /\brouting\s*(?:number|#|no\.?)\s*[:.]?\s*\d{9}\b/gi,
    replacement: '[ROUTING NUMBER REDACTED]',
  },
];

// ── Prohibited Content Patterns ────────────────────────────

const PROHIBITED_PATTERNS: Array<{ name: string; pattern: RegExp; severity: 'warn' | 'block' }> = [
  {
    name: 'Specific Salary Amount',
    // Matches "$XX,XXX" or "$XXX,XXX" patterns that look like specific salary figures
    pattern: /\$\s?\d{2,3},\d{3}(?:\.\d{2})?\s*(?:per\s*(?:year|annum|month)|annually|salary|compensation)/gi,
    severity: 'warn',
  },
  {
    name: 'Legal Advice',
    pattern: /\b(?:you\s+should\s+(?:sue|file\s+a\s+lawsuit|consult\s+(?:a|your)\s+lawyer)|(?:this\s+(?:is|constitutes)\s+(?:illegal|unlawful))|(?:grounds?\s+for\s+(?:termination|dismissal|litigation)))\b/gi,
    severity: 'warn',
  },
  {
    name: 'Medical Diagnosis',
    pattern: /\b(?:you\s+(?:have|suffer\s+from|are\s+diagnosed\s+with)|(?:diagnosis|diagnosed)\s*:\s*\w+|prescri(?:be|ption)\s+\w+)\b/gi,
    severity: 'warn',
  },
];

// ── HR Policy Compliance Patterns ──────────────────────────

const HR_COMPLIANCE_PATTERNS: Array<{ name: string; pattern: RegExp; suggestion: string }> = [
  {
    name: 'Gendered Promotion Language',
    pattern: /\b(?:he|she|him|her)\s+(?:should|shouldn't|would|wouldn't)\s+(?:be\s+)?(?:promoted|given\s+a\s+raise|considered\s+for)/gi,
    suggestion: 'Use gender-neutral language: "they should be considered for..."',
  },
  {
    name: 'Age-based Recommendation',
    pattern: /\b(?:too\s+(?:old|young)\s+(?:for|to)|(?:at\s+(?:his|her|their)\s+age)|(?:nearing\s+retirement))\b/gi,
    suggestion: 'Avoid age-based assessments in performance recommendations',
  },
  {
    name: 'Discriminatory Performance Language',
    pattern: /\b(?:(?:for\s+(?:a|an)\s+)?(?:woman|man|female|male|minority)\s*,?\s*(?:performs?|does?|did)\s+(?:well|poorly|adequately))\b/gi,
    suggestion: 'Remove demographic qualifiers from performance assessments',
  },
];

// ── Types ──────────────────────────────────────────────────

export interface ValidationResult {
  /** The (possibly sanitized) response text */
  content: string;
  /** Whether any issues were found */
  hasIssues: boolean;
  /** List of issues found */
  issues: ValidationIssue[];
  /** Whether the response was modified */
  wasModified: boolean;
}

export interface ValidationIssue {
  type: 'pii' | 'prohibited' | 'hr_compliance' | 'length' | 'tenant_leakage';
  name: string;
  severity: 'info' | 'warn' | 'block';
  message: string;
  /** Whether the content was auto-redacted */
  redacted: boolean;
}

// ── Output Validator ───────────────────────────────────────

class OutputValidator {
  /**
   * Validate and sanitize an agent response before returning to user.
   */
  validate(
    content: string,
    context?: { tenantName?: string; roleCategory?: string },
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    let sanitized = content;
    let wasModified = false;

    // 1. PII Scrubbing
    for (const pii of PII_PATTERNS) {
      // Special handling for passport: only flag with context clue
      if (pii.name === 'Passport') {
        const passportContextPattern = /\bpassport\b/i;
        if (!passportContextPattern.test(sanitized)) continue;
      }

      if (pii.pattern.test(sanitized)) {
        issues.push({
          type: 'pii',
          name: pii.name,
          severity: 'block',
          message: `PII detected: ${pii.name} pattern found and redacted`,
          redacted: true,
        });
        sanitized = sanitized.replace(pii.pattern, pii.replacement);
        wasModified = true;
        // Reset regex lastIndex after test
        pii.pattern.lastIndex = 0;
      }
      pii.pattern.lastIndex = 0;
    }

    // 2. Prohibited Content
    for (const prohibited of PROHIBITED_PATTERNS) {
      if (prohibited.pattern.test(sanitized)) {
        issues.push({
          type: 'prohibited',
          name: prohibited.name,
          severity: prohibited.severity,
          message: `Prohibited content pattern detected: ${prohibited.name}`,
          redacted: false,
        });
        prohibited.pattern.lastIndex = 0;
      }
      prohibited.pattern.lastIndex = 0;
    }

    // 3. HR Policy Compliance
    for (const compliance of HR_COMPLIANCE_PATTERNS) {
      if (compliance.pattern.test(sanitized)) {
        issues.push({
          type: 'hr_compliance',
          name: compliance.name,
          severity: 'warn',
          message: `HR compliance issue: ${compliance.suggestion}`,
          redacted: false,
        });
        compliance.pattern.lastIndex = 0;
      }
      compliance.pattern.lastIndex = 0;
    }

    // 4. Response Length Enforcement
    if (sanitized.length > MAX_RESPONSE_LENGTH) {
      issues.push({
        type: 'length',
        name: 'Response Too Long',
        severity: 'info',
        message: `Response truncated from ${sanitized.length} to ${MAX_RESPONSE_LENGTH} characters`,
        redacted: true,
      });
      sanitized = sanitized.slice(0, MAX_RESPONSE_LENGTH) + '\n\n*[Response truncated for brevity]*';
      wasModified = true;
    }

    // 5. Tenant Data Leakage Check
    if (context?.tenantName) {
      // Check for references to common "other tenant" patterns
      // This is a heuristic — checking for phrases like "in [Company], they..."
      const crossTenantPattern = /\b(?:in\s+(?:their|another|other)\s+(?:company|organization|tenant))\b/gi;
      if (crossTenantPattern.test(sanitized)) {
        issues.push({
          type: 'tenant_leakage',
          name: 'Potential Cross-Tenant Reference',
          severity: 'warn',
          message: 'Response may contain cross-tenant data references',
          redacted: false,
        });
      }
    }

    // Log issues if any
    if (issues.length > 0) {
      const blockers = issues.filter((i) => i.severity === 'block');
      const warnings = issues.filter((i) => i.severity === 'warn');
      logger.warn('Output validation issues detected', {
        issueCount: issues.length,
        blockers: blockers.length,
        warnings: warnings.length,
        types: [...new Set(issues.map((i) => i.type))],
        wasModified,
      });
    }

    return {
      content: sanitized,
      hasIssues: issues.length > 0,
      issues,
      wasModified,
    };
  }
}

/** Singleton output validator */
export const outputValidator = new OutputValidator();
