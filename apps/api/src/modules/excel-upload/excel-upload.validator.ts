import { prisma } from '@pms/database';

export interface ExcelRowData {
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber?: string;
  department?: string;
  level?: number;
  jobTitle?: string;
  managerEmail?: string;
  hireDate?: string;
  role?: string;
}

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface RowWarning {
  row: number;
  field: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface RowSuggestion {
  row: number;
  field: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  validRows: ExcelRowData[];
  errors: RowError[];
  warnings: RowWarning[];
  suggestions: RowSuggestion[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Fuzzy Matching Utilities ───────────────────────────────

/**
 * Levenshtein distance between two strings (case-insensitive).
 */
function levenshtein(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  const m = al.length;
  const n = bl.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = al[i - 1] === bl[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Similarity ratio (0–1) between two strings.
 */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Find the best fuzzy match from a list of candidates.
 * Returns { match, score } or null if below threshold.
 */
function fuzzyMatch(
  input: string,
  candidates: string[],
  threshold: number = 0.7,
): { match: string; score: number } | null {
  let best: { match: string; score: number } | null = null;
  for (const candidate of candidates) {
    const score = similarity(input, candidate);
    if (score >= threshold && (!best || score > best.score)) {
      best = { match: candidate, score };
    }
  }
  return best;
}

/**
 * Detect the dominant email domain from a list of existing emails.
 */
function detectDominantDomain(emails: string[]): string | null {
  const domainCounts = new Map<string, number>();
  for (const e of emails) {
    const domain = e.split('@')[1]?.toLowerCase();
    if (domain) {
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }
  }
  let topDomain: string | null = null;
  let topCount = 0;
  for (const [domain, count] of domainCounts) {
    if (count > topCount) {
      topDomain = domain;
      topCount = count;
    }
  }
  // Only return if at least 60% of emails share this domain
  if (topDomain && topCount >= emails.length * 0.6) {
    return topDomain;
  }
  return null;
}

/**
 * Title-case a name: "john doe" → "John Doe", "JOHN" → "John"
 */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(?:^|\s|[-'])\S/g, (c) => c.toUpperCase());
}

// ── Main Validator ─────────────────────────────────────────

/**
 * Validate all rows from an Excel upload against tenant rules.
 * Returns errors (blocking), warnings (non-blocking), and suggestions (auto-fixable).
 */
export async function validateExcelRows(
  tenantId: string,
  rows: ExcelRowData[],
): Promise<ValidationResult> {
  const errors: RowError[] = [];
  const warnings: RowWarning[] = [];
  const suggestions: RowSuggestion[] = [];
  const validRows: ExcelRowData[] = [];

  // ── Fetch tenant config ──────────────────────────────────
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { maxLevel: true, licenseCount: true, maxUsers: true, subscriptionStatus: true, subscriptionExpiresAt: true },
  });

  if (!tenant) {
    return { valid: false, validRows: [], errors: [{ row: 0, field: 'tenant', message: 'Tenant not found' }], warnings: [], suggestions: [] };
  }

  // Block upload if subscription is not active
  const blockedStatuses = ['EXPIRED', 'SUSPENDED', 'CANCELLED'];
  if (tenant.subscriptionStatus && blockedStatuses.includes(tenant.subscriptionStatus)) {
    return {
      valid: false,
      validRows: [],
      errors: [{ row: 0, field: 'subscription', message: `Subscription is ${tenant.subscriptionStatus.toLowerCase()}. Employee creation is disabled until the subscription is renewed.` }],
      warnings: [],
      suggestions: [],
    };
  }
  if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < new Date()) {
    return {
      valid: false,
      validRows: [],
      errors: [{ row: 0, field: 'subscription', message: 'Subscription has expired. Employee creation is disabled until the subscription is renewed.' }],
      warnings: [],
      suggestions: [],
    };
  }

  const effectiveLimit = Math.max(tenant.licenseCount, tenant.maxUsers);

  // ── Fetch lookup data ────────────────────────────────────
  const [activeCount, existingUsers, departments, tenantRoles] = await Promise.all([
    prisma.user.count({
      where: { tenantId, isActive: true, deletedAt: null, archivedAt: null },
    }),
    prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { email: true, employeeNumber: true, firstName: true, lastName: true },
    }),
    prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true },
    }),
    prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true },
    }),
  ]);

  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const existingEmpNumbers = new Set(
    existingUsers.filter((u) => u.employeeNumber).map((u) => u.employeeNumber!.toLowerCase()),
  );
  const existingEmailsList = existingUsers.map((u) => u.email.toLowerCase());
  const dominantDomain = detectDominantDomain(existingEmailsList);

  // Department lookup: exact match by name or code
  const deptNames = new Set(departments.map((d) => d.name.toLowerCase()));
  const deptCodes = new Set(departments.map((d) => d.code.toLowerCase()));
  const allDeptLabels = [
    ...departments.map((d) => d.name),
    ...departments.map((d) => d.code),
  ];

  const validRoleNames = new Set(tenantRoles.map((r) => r.name.toLowerCase()));

  // Track emails/emp numbers within this batch
  const batchEmails = new Set<string>();
  const batchEmpNumbers = new Set<string>();

  let newUserCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 3; // +3 because row 1 is header, row 2 is instructions
    let rowValid = true;

    // ── Required fields ──────────────────────────────────
    if (!row.firstName?.trim()) {
      errors.push({ row: rowNum, field: 'firstName', message: 'First name is required' });
      rowValid = false;
    }
    if (!row.lastName?.trim()) {
      errors.push({ row: rowNum, field: 'lastName', message: 'Last name is required' });
      rowValid = false;
    }
    if (!row.email?.trim()) {
      errors.push({ row: rowNum, field: 'email', message: 'Email is required' });
      rowValid = false;
    }

    // ── Name casing suggestions ──────────────────────────
    if (row.firstName) {
      const titled = titleCase(row.firstName.trim());
      if (titled !== row.firstName.trim()) {
        suggestions.push({
          row: rowNum,
          field: 'firstName',
          currentValue: row.firstName,
          suggestedValue: titled,
          reason: 'Name casing corrected to Title Case',
        });
      }
    }
    if (row.lastName) {
      const titled = titleCase(row.lastName.trim());
      if (titled !== row.lastName.trim()) {
        suggestions.push({
          row: rowNum,
          field: 'lastName',
          currentValue: row.lastName,
          suggestedValue: titled,
          reason: 'Name casing corrected to Title Case',
        });
      }
    }

    // ── Email format ─────────────────────────────────────
    if (row.email && !EMAIL_REGEX.test(row.email.trim())) {
      // Check if adding dominant domain would fix it (e.g., user typed "john" instead of "john@co.com")
      if (dominantDomain && !row.email.includes('@')) {
        const suggested = `${row.email.trim().toLowerCase()}@${dominantDomain}`;
        if (EMAIL_REGEX.test(suggested)) {
          suggestions.push({
            row: rowNum,
            field: 'email',
            currentValue: row.email,
            suggestedValue: suggested,
            reason: `Email domain auto-completed using organization pattern @${dominantDomain}`,
          });
          // Still mark as error — suggestion must be accepted first
        }
      }
      errors.push({ row: rowNum, field: 'email', message: `Invalid email format: ${row.email}` });
      rowValid = false;
    }

    // ── Duplicate email in DB ────────────────────────────
    if (row.email && existingEmails.has(row.email.trim().toLowerCase())) {
      errors.push({ row: rowNum, field: 'email', message: `Email already exists in organization: ${row.email}` });
      rowValid = false;
    }

    // ── Duplicate email within batch ─────────────────────
    if (row.email) {
      const lowerEmail = row.email.trim().toLowerCase();
      if (batchEmails.has(lowerEmail)) {
        errors.push({ row: rowNum, field: 'email', message: `Duplicate email in upload file: ${row.email}` });
        rowValid = false;
      }
      batchEmails.add(lowerEmail);
    }

    // ── Employee number uniqueness ───────────────────────
    if (row.employeeNumber) {
      const lowerEmpNum = row.employeeNumber.trim().toLowerCase();
      if (existingEmpNumbers.has(lowerEmpNum)) {
        errors.push({ row: rowNum, field: 'employeeNumber', message: `Employee number already exists: ${row.employeeNumber}` });
        rowValid = false;
      }
      if (batchEmpNumbers.has(lowerEmpNum)) {
        errors.push({ row: rowNum, field: 'employeeNumber', message: `Duplicate employee number in file: ${row.employeeNumber}` });
        rowValid = false;
      }
      batchEmpNumbers.add(lowerEmpNum);
    }

    // ── Level validation ─────────────────────────────────
    if (row.level !== undefined && row.level !== null) {
      const level = Number(row.level);
      if (isNaN(level) || level < 1 || level > 16) {
        errors.push({ row: rowNum, field: 'level', message: `Level must be between 1 and 16. Got: ${row.level}` });
        rowValid = false;
      } else if (level > tenant.maxLevel) {
        errors.push({ row: rowNum, field: 'level', message: `Level ${level} exceeds organization max level of ${tenant.maxLevel}` });
        rowValid = false;
      }
    }

    // ── Cross-field: Level vs. Job Title consistency ─────
    if (row.jobTitle && row.level !== undefined) {
      const titleLower = row.jobTitle.toLowerCase();
      const level = Number(row.level);
      if ((titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal')) && level <= 2) {
        warnings.push({
          row: rowNum,
          field: 'level',
          message: `Job title "${row.jobTitle}" suggests a senior role but level is ${level}. Consider adjusting.`,
          severity: 'warning',
        });
      }
      if ((titleLower.includes('intern') || titleLower.includes('junior') || titleLower.includes('trainee')) && level >= 5) {
        warnings.push({
          row: rowNum,
          field: 'level',
          message: `Job title "${row.jobTitle}" suggests a junior role but level is ${level}. Consider adjusting.`,
          severity: 'warning',
        });
      }
    }

    // ── Department check with fuzzy matching ─────────────
    if (row.department) {
      const deptLower = row.department.trim().toLowerCase();
      if (!deptNames.has(deptLower) && !deptCodes.has(deptLower)) {
        // Try fuzzy match
        const fuzzy = fuzzyMatch(row.department.trim(), allDeptLabels, 0.7);
        if (fuzzy) {
          suggestions.push({
            row: rowNum,
            field: 'department',
            currentValue: row.department,
            suggestedValue: fuzzy.match,
            reason: `Fuzzy match (${Math.round(fuzzy.score * 100)}% similar) — did you mean "${fuzzy.match}"?`,
          });
          // Still error — user must accept suggestion
        }
        errors.push({ row: rowNum, field: 'department', message: `Department not found: ${row.department}. Create it first or check spelling.` });
        rowValid = false;
      }
    }

    // ── Manager email validation ─────────────────────────
    if (row.managerEmail) {
      const managerLower = row.managerEmail.trim().toLowerCase();

      // Self-reference check
      if (row.email && managerLower === row.email.trim().toLowerCase()) {
        errors.push({ row: rowNum, field: 'managerEmail', message: 'Employee cannot be their own manager' });
        rowValid = false;
      } else if (!existingEmails.has(managerLower) && !batchEmails.has(managerLower)) {
        // Manager not found — try fuzzy match against existing emails
        const fuzzy = fuzzyMatch(managerLower, existingEmailsList, 0.8);
        if (fuzzy) {
          suggestions.push({
            row: rowNum,
            field: 'managerEmail',
            currentValue: row.managerEmail,
            suggestedValue: fuzzy.match,
            reason: `Manager email not found. Did you mean "${fuzzy.match}" (${Math.round(fuzzy.score * 100)}% similar)?`,
          });
        }
        // Check if manager is being added in a later row of this batch
        const managerInBatch = rows.some((r, idx) => idx > i && r.email?.trim().toLowerCase() === managerLower);
        if (managerInBatch) {
          warnings.push({
            row: rowNum,
            field: 'managerEmail',
            message: `Manager "${row.managerEmail}" is defined later in this file. They will be created in order — ensure the manager row is processed first.`,
            severity: 'info',
          });
        } else {
          warnings.push({
            row: rowNum,
            field: 'managerEmail',
            message: `Manager email "${row.managerEmail}" not found. The manager field will be skipped for this employee.`,
            severity: 'warning',
          });
        }
      }
    }

    // ── Email domain consistency warning ──────────────────
    if (row.email && dominantDomain) {
      const rowDomain = row.email.split('@')[1]?.toLowerCase();
      if (rowDomain && rowDomain !== dominantDomain) {
        warnings.push({
          row: rowNum,
          field: 'email',
          message: `Email uses domain "${rowDomain}" but most employees use "@${dominantDomain}". Verify this is correct.`,
          severity: 'info',
        });
      }
    }

    // ── Hire date validation ─────────────────────────────
    if (row.hireDate) {
      const d = new Date(row.hireDate);
      if (isNaN(d.getTime())) {
        errors.push({ row: rowNum, field: 'hireDate', message: `Invalid date format: ${row.hireDate}` });
        rowValid = false;
      } else {
        // Warn on future dates
        if (d > new Date()) {
          warnings.push({
            row: rowNum,
            field: 'hireDate',
            message: `Hire date ${row.hireDate} is in the future. Is this a planned hire?`,
            severity: 'info',
          });
        }
        // Warn on very old dates (before 1990)
        if (d.getFullYear() < 1990) {
          warnings.push({
            row: rowNum,
            field: 'hireDate',
            message: `Hire date ${row.hireDate} seems unusually old. Please verify.`,
            severity: 'warning',
          });
        }
      }
    }

    // ── Role validation with fuzzy matching ──────────────
    if (row.role) {
      const roleLower = row.role.trim().toLowerCase();
      if (!validRoleNames.has(roleLower)) {
        const roleList = tenantRoles.map((r) => r.name);
        const fuzzy = fuzzyMatch(row.role.trim(), roleList, 0.7);
        if (fuzzy) {
          suggestions.push({
            row: rowNum,
            field: 'role',
            currentValue: row.role,
            suggestedValue: fuzzy.match,
            reason: `Role not found. Did you mean "${fuzzy.match}" (${Math.round(fuzzy.score * 100)}% similar)?`,
          });
        }
        const available = roleList.join(', ');
        errors.push({
          row: rowNum,
          field: 'role',
          message: `Role not found: "${row.role}". Available roles: ${available}`,
        });
        rowValid = false;
      }
    }

    if (rowValid) {
      newUserCount++;
      validRows.push(row);
    }
  }

  // ── License limit check (cumulative) ──────────────────
  if (activeCount + newUserCount > effectiveLimit) {
    errors.push({
      row: 0,
      field: 'license',
      message: `License limit exceeded. Active: ${activeCount}, New: ${newUserCount}, Limit: ${effectiveLimit}. ` +
        `Can only add ${Math.max(0, effectiveLimit - activeCount)} more user(s).`,
    });
    return { valid: false, validRows: [], errors, warnings, suggestions };
  }

  return {
    valid: errors.length === 0,
    validRows,
    errors,
    warnings,
    suggestions,
  };
}
