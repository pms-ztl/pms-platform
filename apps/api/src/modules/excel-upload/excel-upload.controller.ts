import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../../types';
import { excelUploadService } from './excel-upload.service';
import { AuthorizationError, ValidationError } from '../../utils/errors';
import { prisma } from '@pms/database';

/**
 * Check if the user is authorized to perform Excel uploads.
 * Must be: Admin, Manager role, or designated manager for this tenant.
 */
async function checkUploadAccess(req: AuthenticatedRequest): Promise<void> {
  const user = req.user!;
  const roles = user.roles.map((r) => r.toLowerCase());

  const isAdmin = roles.some((r) =>
    ['super admin', 'tenant admin', 'admin', 'hr admin'].includes(r)
  );
  const isManager = roles.some((r) => ['manager'].includes(r));

  if (isAdmin || isManager) return;

  // Check if user is the designated manager
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { designatedManagerId: true },
  });

  if (tenant?.designatedManagerId === user.id) return;

  throw new AuthorizationError(
    'Only admins, managers, or the designated upload manager can perform Excel uploads'
  );
}

export async function downloadTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const workbook = await excelUploadService.generateTemplate(user.tenantId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=employee_upload_template.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

export async function uploadExcel(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    await checkUploadAccess(authReq);

    const user = authReq.user!;

    if (!req.file) {
      throw new ValidationError('No file uploaded. Please upload an Excel (.xlsx) or CSV file.');
    }

    const result = await excelUploadService.processUpload(
      user.tenantId,
      user.id,
      req.file.originalname,
      req.file.buffer,
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getUploadHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { page, limit } = req.query;

    const result = await excelUploadService.getUploadHistory(
      user.tenantId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getUploadErrors(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { id } = req.params;

    const result = await excelUploadService.getUploadErrors(id, user.tenantId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
