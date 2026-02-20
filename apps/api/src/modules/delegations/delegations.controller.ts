import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { delegationsService } from './delegations.service';

const createDelegationSchema = z.object({
  delegatorId: z.string().uuid(),
  delegateId: z.string().uuid(),
  type: z.enum(['ACTING_MANAGER', 'PROXY_APPROVER', 'REVIEW_DELEGATE', 'FULL_DELEGATION']),
  scope: z.record(z.unknown()).optional(),
  reason: z.string().max(2000).optional(),
  startDate: z.string().min(1, 'startDate is required'),
  endDate: z.string().optional(),
});

const rejectRevokeSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export async function listDelegations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { status, type, userId } = req.query as {
      status?: string;
      type?: string;
      userId?: string;
    };

    const delegations = await delegationsService.listDelegations(tenantId, {
      status,
      type,
      userId,
    });

    res.json({ success: true, data: delegations });
  } catch (error) {
    next(error);
  }
}

export async function getDelegation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const delegation = await delegationsService.getDelegation(tenantId, id);

    res.json({ success: true, data: delegation });
  } catch (error) {
    next(error);
  }
}

export async function createDelegation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const creatorId = req.user!.id;

    const parsed = createDelegationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid delegation input', {
        errors: parsed.error.format(),
      });
    }

    const delegation = await delegationsService.createDelegation(
      tenantId,
      creatorId,
      parsed.data as any
    );

    res.status(201).json({ success: true, data: delegation });
  } catch (error) {
    next(error);
  }
}

export async function approveDelegation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const approverId = req.user!.id;
    const { id } = req.params;

    const delegation = await delegationsService.approveDelegation(
      tenantId,
      approverId,
      id
    );

    res.json({ success: true, data: delegation });
  } catch (error) {
    next(error);
  }
}

export async function rejectDelegation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const rejecterId = req.user!.id;
    const { id } = req.params;

    const parsed = rejectRevokeSchema.safeParse(req.body);
    const reason = parsed.success ? parsed.data.reason : undefined;

    const delegation = await delegationsService.rejectDelegation(
      tenantId,
      rejecterId,
      id,
      reason
    );

    res.json({ success: true, data: delegation });
  } catch (error) {
    next(error);
  }
}

export async function revokeDelegation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const revokerId = req.user!.id;
    const { id } = req.params;

    const parsed = rejectRevokeSchema.safeParse(req.body);
    const reason = parsed.success ? parsed.data.reason : undefined;

    const delegation = await delegationsService.revokeDelegation(
      tenantId,
      revokerId,
      id,
      reason
    );

    res.json({ success: true, data: delegation });
  } catch (error) {
    next(error);
  }
}

export async function getDelegationAudit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const auditEvents = await delegationsService.getDelegationAudit(
      tenantId,
      id
    );

    res.json({ success: true, data: auditEvents });
  } catch (error) {
    next(error);
  }
}
