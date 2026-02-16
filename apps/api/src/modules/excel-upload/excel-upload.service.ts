import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '@pms/database';
import { emailService } from '../../services/email';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { auditLogger, logger } from '../../utils/logger';
import { MS_PER_HOUR } from '../../utils/constants';
import { validateExcelRows, type ExcelRowData } from './excel-upload.validator';

const SALT_ROUNDS = 12;
const PASSWORD_SET_TOKEN_EXPIRY_HOURS = 72;

export class ExcelUploadService {
  /**
   * Generate an Excel template for a tenant based on their configuration.
   */
  async generateTemplate(tenantId: string): Promise<ExcelJS.Workbook> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, maxLevel: true },
    });

    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PMS Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Employee Data');

    // Define columns
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
      });
    });

    return rows;
  }

  /**
   * Process an Excel upload: validate, create users, send credential emails.
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

    // 4. Get Employee role for this tenant
    const employeeRole = await prisma.role.findFirst({
      where: { tenantId, name: 'Employee', isSystem: true },
    });

    // 5. Resolve departments and managers
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

    // 6. Bulk create users in a transaction
    let successCount = 0;
    const createdUsers: Array<{ email: string; token: string; firstName: string }> = [];

    try {
      await prisma.$transaction(async (tx) => {
        for (const row of validation.validRows) {
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

          // Assign Employee role
          if (employeeRole) {
            await tx.userRole.create({
              data: {
                userId: user.id,
                roleId: employeeRole.id,
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
      logger.error('Excel upload transaction failed', { error, uploadId: upload.id });

      await prisma.excelUpload.update({
        where: { id: upload.id },
        data: {
          status: 'FAILED',
          errorCount: 1,
          errors: [{ row: 0, field: 'system', message: 'Database error during user creation' }] as any,
        },
      });

      throw new ValidationError('Failed to create users. Transaction rolled back.');
    }

    // 7. Update upload record
    await prisma.excelUpload.update({
      where: { id: upload.id },
      data: {
        status: successCount === rows.length ? 'COMPLETED' : 'PARTIAL',
        successCount,
        errorCount: rows.length - successCount,
      },
    });

    // 8. Send credential emails (non-blocking) with manager as Reply-To
    const appUrl = process.env.APP_URL || process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5173';

    // Fetch the uploading manager's email for Reply-To header
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

    auditLogger('EXCEL_UPLOAD_COMPLETED', uploadedById, tenantId, 'excel_upload', upload.id, {
      fileName,
      totalRows: rows.length,
      successCount,
    });

    return {
      uploadId: upload.id,
      status: successCount === rows.length ? 'COMPLETED' : 'PARTIAL',
      totalRows: rows.length,
      successCount,
      errorCount: rows.length - successCount,
      errors: validation.errors,
    };
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
