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
}

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  validRows: ExcelRowData[];
  errors: RowError[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate all rows from an Excel upload against tenant rules.
 */
export async function validateExcelRows(
  tenantId: string,
  rows: ExcelRowData[],
): Promise<ValidationResult> {
  const errors: RowError[] = [];
  const validRows: ExcelRowData[] = [];

  // Fetch tenant config
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { maxLevel: true, licenseCount: true, maxUsers: true, subscriptionStatus: true, subscriptionExpiresAt: true },
  });

  if (!tenant) {
    return { valid: false, validRows: [], errors: [{ row: 0, field: 'tenant', message: 'Tenant not found' }] };
  }

  // Block upload if subscription is not active
  const blockedStatuses = ['EXPIRED', 'SUSPENDED', 'CANCELLED'];
  if (tenant.subscriptionStatus && blockedStatuses.includes(tenant.subscriptionStatus)) {
    return {
      valid: false,
      validRows: [],
      errors: [{ row: 0, field: 'subscription', message: `Subscription is ${tenant.subscriptionStatus.toLowerCase()}. Employee creation is disabled until the subscription is renewed.` }],
    };
  }
  if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < new Date()) {
    return {
      valid: false,
      validRows: [],
      errors: [{ row: 0, field: 'subscription', message: 'Subscription has expired. Employee creation is disabled until the subscription is renewed.' }],
    };
  }

  const effectiveLimit = Math.max(tenant.licenseCount, tenant.maxUsers);

  // Get current active user count
  const activeCount = await prisma.user.count({
    where: { tenantId, isActive: true, deletedAt: null, archivedAt: null },
  });

  // Get existing emails and employee numbers in this tenant
  const existingUsers = await prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    select: { email: true, employeeNumber: true },
  });

  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const existingEmpNumbers = new Set(
    existingUsers.filter((u) => u.employeeNumber).map((u) => u.employeeNumber!.toLowerCase())
  );

  // Get existing departments
  const departments = await prisma.department.findMany({
    where: { tenantId },
    select: { name: true, code: true },
  });
  const deptNames = new Set(departments.map((d) => d.name.toLowerCase()));
  const deptCodes = new Set(departments.map((d) => d.code.toLowerCase()));

  // Track emails within this upload batch (for duplicate detection within file)
  const batchEmails = new Set<string>();
  const batchEmpNumbers = new Set<string>();

  let newUserCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2
    let rowValid = true;

    // Required fields
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

    // Email format
    if (row.email && !EMAIL_REGEX.test(row.email.trim())) {
      errors.push({ row: rowNum, field: 'email', message: `Invalid email format: ${row.email}` });
      rowValid = false;
    }

    // Duplicate email in DB
    if (row.email && existingEmails.has(row.email.trim().toLowerCase())) {
      errors.push({ row: rowNum, field: 'email', message: `Email already exists in organization: ${row.email}` });
      rowValid = false;
    }

    // Duplicate email within batch
    if (row.email) {
      const lowerEmail = row.email.trim().toLowerCase();
      if (batchEmails.has(lowerEmail)) {
        errors.push({ row: rowNum, field: 'email', message: `Duplicate email in upload file: ${row.email}` });
        rowValid = false;
      }
      batchEmails.add(lowerEmail);
    }

    // Employee number uniqueness
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

    // Level validation
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

    // Department check
    if (row.department) {
      const deptLower = row.department.trim().toLowerCase();
      if (!deptNames.has(deptLower) && !deptCodes.has(deptLower)) {
        errors.push({ row: rowNum, field: 'department', message: `Department not found: ${row.department}. Create it first.` });
        rowValid = false;
      }
    }

    // Hire date validation
    if (row.hireDate) {
      const d = new Date(row.hireDate);
      if (isNaN(d.getTime())) {
        errors.push({ row: rowNum, field: 'hireDate', message: `Invalid date format: ${row.hireDate}` });
        rowValid = false;
      }
    }

    if (rowValid) {
      newUserCount++;
      validRows.push(row);
    }
  }

  // License limit check (cumulative)
  if (activeCount + newUserCount > effectiveLimit) {
    errors.push({
      row: 0,
      field: 'license',
      message: `License limit exceeded. Active: ${activeCount}, New: ${newUserCount}, Limit: ${effectiveLimit}. ` +
        `Can only add ${Math.max(0, effectiveLimit - activeCount)} more user(s).`,
    });
    return { valid: false, validRows: [], errors };
  }

  return {
    valid: errors.length === 0,
    validRows,
    errors,
  };
}
