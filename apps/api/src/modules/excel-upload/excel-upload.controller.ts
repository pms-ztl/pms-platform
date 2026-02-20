import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../../types';
import { excelUploadService, getUploadProgress } from './excel-upload.service';
import { AuthorizationError, ValidationError } from '../../utils/errors';
import { prisma } from '@pms/database';

/**
 * Check if the user is authorized to perform Excel uploads.
 * Must be: Admin, Manager role (by name or category), or designated manager for this tenant.
 */
async function checkUploadAccess(req: AuthenticatedRequest): Promise<void> {
  const user = req.user!;
  const roles = user.roles.map((r) => r.toLowerCase());
  const categories = user.roleCategories ?? [];

  // Check by role name (case-insensitive)
  const adminRoleNames = ['super admin', 'tenant admin', 'admin', 'hr admin', 'super_admin', 'tenant_admin', 'hr_admin'];
  const managerRoleNames = ['manager'];
  const isAdmin = roles.some((r) => adminRoleNames.includes(r));
  const isManager = roles.some((r) => managerRoleNames.includes(r));

  if (isAdmin || isManager) return;

  // Check by role category (supports dynamic/custom roles)
  const adminCategories = ['ADMIN', 'HR'];
  const managerCategories = ['MANAGER'];
  const hasCategoryAccess = categories.some((c) =>
    [...adminCategories, ...managerCategories].includes(c)
  );

  if (hasCategoryAccess) return;

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

// ── Template ──────────────────────────────────────────────

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

// ── Legacy Upload (single-step) ──────────────────────────

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

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ── Phase A: Analyze Upload (Preview) ────────────────────

export async function analyzeUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    await checkUploadAccess(authReq);

    const user = authReq.user!;

    if (!req.file) {
      throw new ValidationError('No file uploaded. Please upload an Excel (.xlsx) or CSV file.');
    }

    const result = await excelUploadService.analyzeUpload(
      user.tenantId,
      user.id,
      req.file.originalname,
      req.file.buffer,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ── Phase B: Confirm Upload (Create Users) ───────────────

export async function confirmUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    await checkUploadAccess(authReq);

    const user = authReq.user!;
    const { id } = req.params;
    const { acceptedFixes } = req.body;

    if (!id) {
      throw new ValidationError('Upload ID is required');
    }

    const result = await excelUploadService.confirmUpload(
      user.tenantId,
      user.id,
      id,
      Array.isArray(acceptedFixes) ? acceptedFixes : [],
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ── Progress Tracking (SSE) ──────────────────────────────

export async function getProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial progress
    const sendProgress = () => {
      const progress = getUploadProgress(id);
      if (progress) {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
        if (progress.stage === 'complete' || progress.stage === 'error') {
          res.end();
          return true;
        }
      }
      return false;
    };

    // Check immediately
    if (sendProgress()) return;

    // Poll every 500ms
    const interval = setInterval(() => {
      if (sendProgress()) {
        clearInterval(interval);
      }
    }, 500);

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      res.write(`data: ${JSON.stringify({ stage: 'error', progress: 0, message: 'Progress tracking timed out' })}\n\n`);
      res.end();
    }, 120000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
      clearTimeout(timeout);
    });
  } catch (error) {
    next(error);
  }
}

// ── History & Errors ─────────────────────────────────────

export async function getUploadHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { page, limit } = req.query;

    const result = await excelUploadService.getUploadHistory(
      user.tenantId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getUploadErrors(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { id } = req.params;

    const result = await excelUploadService.getUploadErrors(id, user.tenantId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
