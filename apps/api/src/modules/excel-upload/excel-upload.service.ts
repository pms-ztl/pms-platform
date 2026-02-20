import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '@pms/database';
import { emailService } from '../../services/email';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { auditLogger, logger } from '../../utils/logger';
import { MS_PER_HOUR } from '../../utils/constants';
import { validateExcelRows, type ExcelRowData } from './excel-upload.validator';
import { ExcelValidationAgent, type AIAnalysisResult } from '../ai/agents/excel-validation.agent';

type RoleRecord = { id: string; name: string; category: string | null };

const SALT_ROUNDS = 12;
const PASSWORD_SET_TOKEN_EXPIRY_HOURS = 72;

// ── Progress Tracking (in-memory) ────────────────────────

export interface UploadProgress {
  stage: 'parsing' | 'validating' | 'ai_analyzing' | 'complete' | 'error';
  progress: number; // 0-100
  processed?: number;
  total?: number;
  message?: string;
}

const uploadProgress = new Map<string, UploadProgress>();
const PROGRESS_TTL_MS = 5 * 60 * 1000; // Clean up progress after 5 minutes

export function getUploadProgress(uploadId: string): UploadProgress | null {
  return uploadProgress.get(uploadId) ?? null;
}

function setProgress(uploadId: string, progress: UploadProgress) {
  uploadProgress.set(uploadId, progress);
  // Auto-cleanup after TTL
  if (progress.stage === 'complete' || progress.stage === 'error') {
    setTimeout(() => uploadProgress.delete(uploadId), PROGRESS_TTL_MS);
  }
}

// ── Service ──────────────────────────────────────────────

export class ExcelUploadService {
  private aiAgent: ExcelValidationAgent;

  constructor() {
    this.aiAgent = new ExcelValidationAgent();
  }

  /**
   * Generate an Excel template for a tenant based on their configuration.
   */
  async generateTemplate(tenantId: string): Promise<ExcelJS.Workbook> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, maxLevel: true },
    });

    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    // Fetch available roles for the dropdown
    const roles = await prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const roleNames = roles.map((r) => r.name);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PMS Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Employee Data');

    // Define columns (Role added as column 10)
    sheet.columns = [
      { header: 'First Name *', key: 'firstName', width: 20 },
      { header: 'Last Name *', key: 'lastName', width: 20 },
      { header: 'Email *', key: 'email', width: 30 },
      { header: 'Employee Number', key: 'employeeNumber', width: 18 },
      { header: 'Department', key: 'department', width: 20 },
      { header: `Level (1-${tenant.maxLevel}) *`, key: 'level', width: 15 },
      { header: 'Job Title', key: 'jobTitle', width: 25 },
      { header: 'Manager Email', key: 'managerEmail', width: 30 },
      { header: 'Hire Date (YYYY-MM-DD)', key: 'hireDate', width: 22 },
      { header: 'Role', key: 'role', width: 22 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add instruction row
    sheet.addRow([
      'e.g. John',
      'e.g. Doe',
      'e.g. john.doe@company.com',
      'e.g. EMP001',
      'e.g. Engineering',
      '1',
      'e.g. Software Engineer',
      'e.g. manager@company.com',
      '2024-01-15',
      roleNames.length > 0 ? `e.g. ${roleNames[roleNames.length - 1]}` : 'e.g. Employee',
    ]);
    const instructionRow = sheet.getRow(2);
    instructionRow.font = { italic: true, color: { argb: 'FF9CA3AF' } };

    // Add level dropdown validation
    for (let i = 3; i <= 502; i++) {
      const levelCell = sheet.getCell(`F${i}`);
      levelCell.dataValidation = {
        type: 'whole',
        operator: 'between',
        formulae: [1, tenant.maxLevel],
        showErrorMessage: true,
        errorTitle: 'Invalid Level',
        error: `Level must be between 1 and ${tenant.maxLevel}`,
      };
    }

    // Add role dropdown validation (if roles exist)
    if (roleNames.length > 0) {
      const roleList = `"${roleNames.join(',')}"`;
      for (let i = 3; i <= 502; i++) {
        const roleCell = sheet.getCell(`J${i}`);
        roleCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [roleList],
          showErrorMessage: true,
          errorTitle: 'Invalid Role',
          error: `Role must be one of: ${roleNames.join(', ')}`,
        };
      }
    }

    return workbook;
  }

  /**
   * Parse an uploaded Excel file and extract row data.
   */
  async parseExcelFile(buffer: Buffer): Promise<ExcelRowData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new ValidationError('No worksheet found in uploaded file');

    const rows: ExcelRowData[] = [];

    sheet.eachRow((row, rowNumber) => {
      // Skip header row and instruction row
      if (rowNumber <= 2) return;

      const firstName = String(row.getCell(1).value ?? '').trim();
      const lastName = String(row.getCell(2).value ?? '').trim();
      const email = String(row.getCell(3).value ?? '').trim();

      // Skip completely empty rows
      if (!firstName && !lastName && !email) return;

      rows.push({
        firstName,
        lastName,
        email,
        employeeNumber: String(row.getCell(4).value ?? '').trim() || undefined,
        department: String(row.getCell(5).value ?? '').trim() || undefined,
        level: row.getCell(6).value ? Number(row.getCell(6).value) : undefined,
        jobTitle: String(row.getCell(7).value ?? '').trim() || undefined,
        managerEmail: String(row.getCell(8).value ?? '').trim() || undefined,
        hireDate: row.getCell(9).value ? String(row.getCell(9).value).trim() : undefined,
        role: String(row.getCell(10).value ?? '').trim() || undefined,
      });
    });

    return rows;
  }

  // ══════════════════════════════════════════════════════════
  // Phase A: Analyze Upload (Preview)
  // ══════════════════════════════════════════════════════════

  /**
   * Analyze an uploaded file: parse, validate, run AI analysis.
   * Returns preview data for user review before final creation.
   */
  async analyzeUpload(
    tenantId: string,
    uploadedById: string,
    fileName: string,
    buffer: Buffer,
  ) {
    // 1. Create upload record in PREVIEW state
    const upload = await prisma.excelUpload.create({
      data: {
        tenantId,
        uploadedById,
        fileName,
        totalRows: 0,
        status: 'PREVIEW',
      },
    });

    setProgress(upload.id, { stage: 'parsing', progress: 10, message: 'Parsing Excel file...' });

    try {
      // 2. Parse the file
      const rows = await this.parseExcelFile(buffer);

      if (rows.length === 0) {
        throw new ValidationError('No data rows found in the uploaded file');
      }

      await prisma.excelUpload.update({
        where: { id: upload.id },
        data: { totalRows: rows.length },
      });

      setProgress(upload.id, { stage: 'validating', progress: 30, processed: 0, total: rows.length, message: 'Validating data...' });

      // 3. Run rule-based validation
      const validation = await validateExcelRows(tenantId, rows);

      setProgress(upload.id, { stage: 'validating', progress: 50, processed: rows.length, total: rows.length, message: 'Validation complete' });

      // 4. Run AI analysis (non-blocking — if it fails, we still have rule-based results)
      setProgress(upload.id, { stage: 'ai_analyzing', progress: 60, message: 'AI analyzing data quality...' });

      let aiAnalysis: AIAnalysisResult;
      try {
        aiAnalysis = await this.aiAgent.analyzeExcelData(
          tenantId,
          uploadedById,
          rows as unknown as Record<string, unknown>[],
          validation.errors,
          validation.warnings,
          validation.suggestions,
        );
      } catch (aiErr) {
        logger.warn('AI analysis failed, proceeding with rule-based only', { error: (aiErr as Error).message });
        aiAnalysis = {
          qualityScore: -1,
          autoFixable: [],
          reviewNeeded: [],
          duplicateClusters: [],
          analysis: {
            levelDistribution: [],
            departmentDistribution: [],
            overallNotes: 'AI analysis unavailable.',
            riskFlags: [],
          },
        };
      }

      // 5. Store preview data in DB
      await prisma.excelUpload.update({
        where: { id: upload.id },
        data: {
          status: 'PREVIEW',
          errorCount: validation.errors.length,
          errors: validation.errors as any,
          previewData: rows as any,
          aiAnalysis: aiAnalysis as any,
        },
      });

      auditLogger('EXCEL_UPLOAD_ANALYZED', uploadedById, tenantId, 'excel_upload', upload.id, {
        fileName,
        totalRows: rows.length,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        suggestionCount: validation.suggestions.length + aiAnalysis.autoFixable.length,
        aiQualityScore: aiAnalysis.qualityScore,
      });

      setProgress(upload.id, { stage: 'complete', progress: 100, message: 'Analysis complete' });

      return {
        uploadId: upload.id,
        totalRows: rows.length,
        rows,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.suggestions,
          validRowCount: validation.validRows.length,
        },
        aiAnalysis,
      };
    } catch (error) {
      setProgress(upload.id, { stage: 'error', progress: 0, message: (error as Error).message });

      await prisma.excelUpload.update({
        where: { id: upload.id },
        data: {
          status: 'FAILED',
          errors: [{ row: 0, field: 'system', message: (error as Error).message }] as any,
        },
      });

      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════
  // Phase B: Confirm Upload (Create Users)
  // ══════════════════════════════════════════════════════════

  /**
   * Confirm an analyzed upload: apply accepted fixes and create users.
   */
  async confirmUpload(
    tenantId: string,
    uploadedById: string,
    uploadId: string,
    acceptedFixIds: string[],
  ) {
    // 1. Load preview from DB
    const upload = await prisma.excelUpload.findFirst({
      where: { id: uploadId, tenantId, status: 'PREVIEW' },
    });

    if (!upload) {
      throw new NotFoundError('Upload preview', uploadId);
    }

    const rows = (upload.previewData as unknown as ExcelRowData[]) ?? [];
    const aiAnalysis = (upload.aiAnalysis as unknown as AIAnalysisResult) ?? null;

    if (rows.length === 0) {
      throw new ValidationError('No rows found in preview data');
    }

    // 2. Apply accepted AI fixes to rows
    const fixedRows = this.applyFixes(rows, aiAnalysis, acceptedFixIds);

    // 3. Update status to PROCESSING
    await prisma.excelUpload.update({
      where: { id: uploadId },
      data: {
        status: 'PROCESSING',
        acceptedFixes: acceptedFixIds as any,
      },
    });

    auditLogger('EXCEL_UPLOAD_STARTED', uploadedById, tenantId, 'excel_upload', uploadId, {
      fileName: upload.fileName,
      totalRows: rows.length,
      acceptedFixes: acceptedFixIds.length,
    });

    // 4. Re-validate the fixed rows
    const validation = await validateExcelRows(tenantId, fixedRows);

    if (!validation.valid) {
      await prisma.excelUpload.update({
        where: { id: uploadId },
        data: {
          status: 'FAILED',
          errorCount: validation.errors.length,
          errors: validation.errors as any,
        },
      });

      auditLogger('EXCEL_UPLOAD_FAILED', uploadedById, tenantId, 'excel_upload', uploadId, {
        totalRows: rows.length,
        errorCount: validation.errors.length,
      });

      return {
        uploadId,
        status: 'FAILED',
        totalRows: rows.length,
        successCount: 0,
        errorCount: validation.errors.length,
        errors: validation.errors,
      };
    }

    // 5. Create users (same logic as original processUpload)
    return this.createUsersFromRows(tenantId, uploadedById, uploadId, upload.fileName, validation.validRows);
  }

  /**
   * Apply accepted AI fixes to the row data.
   */
  private applyFixes(
    rows: ExcelRowData[],
    aiAnalysis: AIAnalysisResult | null,
    acceptedFixIds: string[],
  ): ExcelRowData[] {
    if (!aiAnalysis || acceptedFixIds.length === 0) return [...rows];

    const acceptedSet = new Set(acceptedFixIds);
    const fixedRows = rows.map((r) => ({ ...r }));

    for (const fix of aiAnalysis.autoFixable) {
      if (!acceptedSet.has(fix.id)) continue;

      // Row numbers in the fix are Excel row numbers (row 3 = first data row = index 0)
      const rowIndex = fix.row - 3;
      if (rowIndex < 0 || rowIndex >= fixedRows.length) continue;

      const row = fixedRows[rowIndex];
      const field = fix.field as keyof ExcelRowData;

      if (field in row) {
        (row as any)[field] = fix.suggestedValue;
      }
    }

    return fixedRows;
  }

  /**
   * Create users from validated rows (shared between confirm and legacy processUpload).
   */
  private async createUsersFromRows(
    tenantId: string,
    uploadedById: string,
    uploadId: string,
    fileName: string,
    validRows: ExcelRowData[],
  ) {
    // Get all roles for this tenant (build lookup maps)
    const tenantRoles = await prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, category: true },
    });
    const roleByName = new Map<string, RoleRecord>();
    for (const r of tenantRoles) {
      roleByName.set(r.name.toLowerCase(), r);
    }
    const defaultRole = tenantRoles.find((r) => r.category === 'EMPLOYEE')
      ?? tenantRoles.find((r) => ['employee', 'EMPLOYEE'].includes(r.name))
      ?? null;

    // Resolve departments and managers
    const departments = await prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true },
    });
    const deptMap = new Map<string, string>();
    for (const d of departments) {
      deptMap.set(d.name.toLowerCase(), d.id);
      deptMap.set(d.code.toLowerCase(), d.id);
    }

    const existingUsers = await prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, email: true },
    });
    const emailToUserId = new Map<string, string>();
    for (const u of existingUsers) {
      emailToUserId.set(u.email.toLowerCase(), u.id);
    }

    // Bulk create users in a transaction
    let successCount = 0;
    const createdUsers: Array<{ email: string; token: string; firstName: string }> = [];

    try {
      await prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          const token = uuidv4();
          const tempPassword = uuidv4().slice(0, 16);
          const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

          const departmentId = row.department ? deptMap.get(row.department.toLowerCase()) : undefined;
          const managerId = row.managerEmail ? emailToUserId.get(row.managerEmail.toLowerCase()) : undefined;

          const user = await tx.user.create({
            data: {
              tenantId,
              email: row.email.trim().toLowerCase(),
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              passwordHash,
              employeeNumber: row.employeeNumber ?? null,
              departmentId: departmentId ?? null,
              level: row.level ?? 1,
              jobTitle: row.jobTitle ?? null,
              managerId: managerId ?? null,
              hireDate: row.hireDate ? new Date(row.hireDate) : null,
              isActive: true,
              emailVerified: false,
            },
          });

          // Assign role
          const assignedRole = row.role
            ? roleByName.get(row.role.toLowerCase()) ?? defaultRole
            : defaultRole;
          if (assignedRole) {
            await tx.userRole.create({
              data: {
                userId: user.id,
                roleId: assignedRole.id,
                grantedBy: uploadedById,
              },
            });
          }

          // Create password set token
          await tx.passwordSetToken.create({
            data: {
              userId: user.id,
              token,
              expiresAt: new Date(Date.now() + PASSWORD_SET_TOKEN_EXPIRY_HOURS * MS_PER_HOUR),
            },
          });

          createdUsers.push({
            email: user.email,
            token,
            firstName: user.firstName,
          });

          successCount++;
        }
      });
    } catch (error) {
      logger.error('Excel upload transaction failed', { error, uploadId });

      await prisma.excelUpload.update({
        where: { id: uploadId },
        data: {
          status: 'FAILED',
          errorCount: 1,
          errors: [{ row: 0, field: 'system', message: 'Database error during user creation' }] as any,
        },
      });

      throw new ValidationError('Failed to create users. Transaction rolled back.');
    }

    // Update upload record
    await prisma.excelUpload.update({
      where: { id: uploadId },
      data: {
        status: successCount === validRows.length ? 'COMPLETED' : 'PARTIAL',
        successCount,
        errorCount: validRows.length - successCount,
      },
    });

    // Send credential emails (non-blocking)
    const appUrl = process.env.APP_URL || process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5173';

    const uploadingUser = await prisma.user.findUnique({
      where: { id: uploadedById },
      select: { email: true },
    });
    const replyToEmail = uploadingUser?.email;

    for (const created of createdUsers) {
      const setPasswordUrl = `${appUrl}/set-password?token=${created.token}`;

      emailService.sendMail(
        created.email,
        'Welcome to PMS Platform - Set Your Password',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">Welcome to PMS Platform!</h2>
            <p>Hello ${created.firstName},</p>
            <p>Your account has been created on the Performance Management System. Please set your password to get started.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${setPasswordUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Set Your Password
              </a>
            </div>
            <p style="color: #6B7280; font-size: 14px;">This link expires in ${PASSWORD_SET_TOKEN_EXPIRY_HOURS} hours.</p>
            <p style="color: #6B7280; font-size: 14px;">If the button doesn't work, copy this URL: ${setPasswordUrl}</p>
          </div>
        `,
        undefined,
        replyToEmail ? { replyTo: replyToEmail } : undefined,
      ).catch((err) => {
        logger.warn('Failed to send welcome email', { email: created.email, error: err });
      });
    }

    auditLogger('EXCEL_UPLOAD_COMPLETED', uploadedById, tenantId, 'excel_upload', uploadId, {
      fileName,
      totalRows: validRows.length,
      successCount,
    });

    return {
      uploadId,
      status: successCount === validRows.length ? 'COMPLETED' : 'PARTIAL',
      totalRows: validRows.length,
      successCount,
      errorCount: validRows.length - successCount,
      errors: [],
    };
  }

  // ══════════════════════════════════════════════════════════
  // Legacy: Direct Upload (kept for backward compatibility)
  // ══════════════════════════════════════════════════════════

  /**
   * Process an Excel upload: validate, create users, send credential emails.
   * (Original single-step flow — still works for simple/quick uploads)
   */
  async processUpload(
    tenantId: string,
    uploadedById: string,
    fileName: string,
    buffer: Buffer,
  ) {
    // 1. Parse the file
    const rows = await this.parseExcelFile(buffer);

    if (rows.length === 0) {
      throw new ValidationError('No data rows found in the uploaded file');
    }

    // 2. Create upload record
    const upload = await prisma.excelUpload.create({
      data: {
        tenantId,
        uploadedById,
        fileName,
        totalRows: rows.length,
        status: 'PROCESSING',
      },
    });

    auditLogger('EXCEL_UPLOAD_STARTED', uploadedById, tenantId, 'excel_upload', upload.id, {
      fileName,
      totalRows: rows.length,
    });

    // 3. Validate all rows
    const validation = await validateExcelRows(tenantId, rows);

    if (!validation.valid) {
      await prisma.excelUpload.update({
        where: { id: upload.id },
        data: {
          status: 'FAILED',
          errorCount: validation.errors.length,
          errors: validation.errors as any,
        },
      });

      auditLogger('EXCEL_UPLOAD_FAILED', uploadedById, tenantId, 'excel_upload', upload.id, {
        fileName,
        totalRows: rows.length,
        errorCount: validation.errors.length,
      });

      return {
        uploadId: upload.id,
        status: 'FAILED',
        totalRows: rows.length,
        successCount: 0,
        errorCount: validation.errors.length,
        errors: validation.errors,
      };
    }

    // 4. Create users using shared logic
    return this.createUsersFromRows(tenantId, uploadedById, upload.id, fileName, validation.validRows);
  }

  /**
   * Get upload history for a tenant.
   */
  async getUploadHistory(tenantId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      prisma.excelUpload.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.excelUpload.count({ where: { tenantId } }),
    ]);

    return {
      data: uploads.map((u) => ({
        id: u.id,
        fileName: u.fileName,
        totalRows: u.totalRows,
        successCount: u.successCount,
        errorCount: u.errorCount,
        status: u.status,
        uploadedBy: `${u.uploadedBy.firstName} ${u.uploadedBy.lastName}`,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get errors for a specific upload.
   */
  async getUploadErrors(uploadId: string, tenantId: string) {
    const upload = await prisma.excelUpload.findFirst({
      where: { id: uploadId, tenantId },
    });

    if (!upload) throw new NotFoundError('Upload', uploadId);

    return {
      id: upload.id,
      fileName: upload.fileName,
      status: upload.status,
      errors: upload.errors,
    };
  }
}

export const excelUploadService = new ExcelUploadService();
