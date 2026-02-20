import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { upgradeRequestsService } from './upgrade-requests.service';

// --- Tenant-side handlers ---

export async function listByTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await upgradeRequestsService.listByTenant(req.tenantId!, page, limit);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function createRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { requestedPlan, requestedLicenseCount, requestedMaxLevel, reason } = req.body;
    if (!requestedPlan) {
      res.status(400).json({ success: false, error: { message: 'requestedPlan is required' } });
      return;
    }
    const request = await upgradeRequestsService.createRequest(req.tenantId!, req.user!.id, {
      requestedPlan, requestedLicenseCount, requestedMaxLevel, reason,
    });
    res.status(201).json({ success: true, data: request });
  } catch (error: any) {
    if (error.message?.includes('higher than') || error.message?.includes('pending upgrade')) {
      res.status(400).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

export async function cancelRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await upgradeRequestsService.cancelRequest(req.tenantId!, req.params.id, req.user!.id);
    res.json({ success: true, data: { message: 'Upgrade request cancelled' } });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Only pending') || error.message?.includes('Only the requester')) {
      res.status(400).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

// --- Super Admin handlers ---

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await upgradeRequestsService.listAll({ status, page, limit });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getPendingCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await upgradeRequestsService.getPendingCount();
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
}

export async function approveRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body;
    const reviewerId = (req as AuthenticatedRequest).user!.id;
    await upgradeRequestsService.approveRequest(req.params.id, reviewerId, notes);
    res.json({ success: true, data: { message: 'Upgrade request approved and plan updated' } });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Only pending')) { res.status(400).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function rejectRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body;
    if (!notes) { res.status(400).json({ success: false, error: { message: 'notes are required when rejecting' } }); return; }
    const reviewerId = (req as AuthenticatedRequest).user!.id;
    await upgradeRequestsService.rejectRequest(req.params.id, reviewerId, notes);
    res.json({ success: true, data: { message: 'Upgrade request rejected' } });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Only pending')) { res.status(400).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}
