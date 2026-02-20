import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { rolesService } from './roles.service';

export async function listRoles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const roles = await rolesService.listRoles(req.tenantId!);
    res.json({ success: true, data: roles });
  } catch (error) { next(error); }
}

export async function getPermissionsCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const catalog = rolesService.getPermissionsCatalog();
    res.json({ success: true, data: catalog });
  } catch (error) { next(error); }
}

export async function getRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const role = await rolesService.getRole(req.tenantId!, req.params.id);
    res.json({ success: true, data: role });
  } catch (error) { next(error); }
}

export async function createRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, description, permissions, category } = req.body;
    if (!name || !permissions || !Array.isArray(permissions)) {
      res.status(400).json({ error: 'name and permissions (array) are required' });
      return;
    }
    const role = await rolesService.createRole(req.tenantId!, req.user!.id, { name, description, permissions, category });
    res.status(201).json({ success: true, data: role });
  } catch (error: any) {
    if (error.message?.includes('already exists')) { res.status(409).json({ error: error.message }); return; }
    next(error);
  }
}

export async function updateRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, description, permissions, category } = req.body;
    const role = await rolesService.updateRole(req.tenantId!, req.user!.id, req.params.id, { name, description, permissions, category });
    res.json({ success: true, data: role });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('already exists')) { res.status(409).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function cloneRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const role = await rolesService.cloneRole(req.tenantId!, req.user!.id, req.params.id);
    res.status(201).json({ success: true, data: role });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ error: error.message }); return; }
    next(error);
  }
}

export async function compareRoles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const role1 = req.query.role1 as string;
    const role2 = req.query.role2 as string;
    if (!role1 || !role2) {
      res.status(400).json({ error: 'role1 and role2 query parameters are required' });
      return;
    }
    const diff = await rolesService.compareRoles(req.tenantId!, role1, role2);
    res.json({ success: true, data: diff });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ error: error.message }); return; }
    next(error);
  }
}

export async function deleteRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const fallbackRoleId = req.query.fallbackRoleId as string | undefined;
    await rolesService.deleteRole(req.tenantId!, req.user!.id, req.params.id, fallbackRoleId);
    res.json({ success: true, data: { message: 'Role deleted successfully' } });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ error: error.message }); return; }
    if (error.message?.includes('cannot be deleted') || error.message?.includes('Cannot delete')) {
      res.status(400).json({ error: error.message }); return;
    }
    next(error);
  }
}
