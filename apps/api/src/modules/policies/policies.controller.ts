import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { policiesService } from './policies.service';

// ── Validation schemas ──

const policyTypeEnum = z.enum([
  'VISIBILITY',
  'ACCESS',
  'APPROVAL',
  'NOTIFICATION',
  'DATA_RETENTION',
  'UNION_CONTRACT',
]);

const effectEnum = z.enum(['ALLOW', 'DENY']);

const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: policyTypeEnum,
  priority: z.number().int().min(0).optional(),
  conditions: z.record(z.unknown()).optional(),
  actions: z.record(z.unknown()).optional(),
  effect: effectEnum.optional(),
  targetRoles: z.array(z.string()).optional(),
  targetDepartments: z.array(z.string()).optional(),
  targetTeams: z.array(z.string()).optional(),
  targetLevels: z.array(z.number().int().min(1)).optional(),
  unionCode: z.string().max(100).optional(),
  contractType: z.string().max(100).optional(),
  effectiveFrom: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val !== undefined ? new Date(val) : undefined)),
  effectiveTo: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val !== undefined ? new Date(val) : undefined)),
});

const updatePolicySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  type: policyTypeEnum.optional(),
  priority: z.number().int().min(0).optional(),
  conditions: z.record(z.unknown()).optional(),
  actions: z.record(z.unknown()).optional(),
  effect: effectEnum.optional(),
  targetRoles: z.array(z.string()).optional(),
  targetDepartments: z.array(z.string()).optional(),
  targetTeams: z.array(z.string()).optional(),
  targetLevels: z.array(z.number().int().min(1)).optional(),
  unionCode: z.string().max(100).nullable().optional(),
  contractType: z.string().max(100).nullable().optional(),
  effectiveFrom: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((val) =>
      val !== undefined && val !== null ? new Date(val) : val
    ),
  effectiveTo: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((val) =>
      val !== undefined && val !== null ? new Date(val) : val
    ),
});

const simulatePolicySchema = z.object({
  userId: z.string().uuid(),
  resource: z.string().min(1),
  action: z.string().min(1),
});

// ── Handlers ──

export async function listPolicies(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, status } = req.query as { type?: string; status?: string };

    const policies = await policiesService.listPolicies(req.tenantId!, {
      type,
      status,
    });

    res.json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
}

export async function getPolicy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const policyId = req.params.id;

    if (!policyId) {
      throw new ValidationError('Policy ID is required');
    }

    const policy = await policiesService.getPolicy(req.tenantId!, policyId);

    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
}

export async function createPolicy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = createPolicySchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ValidationError('Invalid policy data', {
        errors: parseResult.error.format() as unknown as Record<string, unknown>,
      });
    }

    const policy = await policiesService.createPolicy(
      req.tenantId!,
      req.user!.id,
      parseResult.data as {
        name: string;
        description?: string;
        type: string;
        priority?: number;
        conditions?: Record<string, unknown>;
        actions?: Record<string, unknown>;
        effect?: string;
        targetRoles?: string[];
        targetDepartments?: string[];
        targetTeams?: string[];
        targetLevels?: number[];
        unionCode?: string;
        contractType?: string;
        effectiveFrom?: Date;
        effectiveTo?: Date;
      }
    );

    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
}

export async function updatePolicy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const policyId = req.params.id;

    if (!policyId) {
      throw new ValidationError('Policy ID is required');
    }

    const parseResult = updatePolicySchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ValidationError('Invalid policy data', {
        errors: parseResult.error.format() as unknown as Record<string, unknown>,
      });
    }

    const policy = await policiesService.updatePolicy(
      req.tenantId!,
      req.user!.id,
      policyId,
      parseResult.data as {
        name?: string;
        description?: string;
        type?: string;
        priority?: number;
        conditions?: Record<string, unknown>;
        actions?: Record<string, unknown>;
        effect?: string;
        targetRoles?: string[];
        targetDepartments?: string[];
        targetTeams?: string[];
        targetLevels?: number[];
        unionCode?: string;
        contractType?: string;
        effectiveFrom?: Date;
        effectiveTo?: Date;
      }
    );

    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
}

export async function activatePolicy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const policyId = req.params.id;

    if (!policyId) {
      throw new ValidationError('Policy ID is required');
    }

    const policy = await policiesService.activatePolicy(
      req.tenantId!,
      req.user!.id,
      policyId
    );

    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
}

export async function deactivatePolicy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const policyId = req.params.id;

    if (!policyId) {
      throw new ValidationError('Policy ID is required');
    }

    const policy = await policiesService.deactivatePolicy(
      req.tenantId!,
      req.user!.id,
      policyId
    );

    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
}

export async function deletePolicy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const policyId = req.params.id;

    if (!policyId) {
      throw new ValidationError('Policy ID is required');
    }

    await policiesService.deletePolicy(
      req.tenantId!,
      req.user!.id,
      policyId
    );

    res.json({ success: true, message: 'Policy deleted' });
  } catch (error) {
    next(error);
  }
}

export async function simulatePolicy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = simulatePolicySchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ValidationError('Invalid simulation data', {
        errors: parseResult.error.format() as unknown as Record<string, unknown>,
      });
    }

    const result = await policiesService.simulatePolicy(
      req.tenantId!,
      parseResult.data as { userId: string; resource: string; action: string }
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
