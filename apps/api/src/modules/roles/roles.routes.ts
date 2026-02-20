import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import * as ctrl from './roles.controller';

const router = Router();
router.use(authenticate);

// Read access: Tenant Admin + HR Admin
router.get('/', requireRoles('Tenant Admin', 'HR Admin'), ctrl.listRoles);
router.get('/permissions-catalog', requireRoles('Tenant Admin', 'HR Admin'), ctrl.getPermissionsCatalog);
router.get('/compare', requireRoles('Tenant Admin', 'HR Admin'), ctrl.compareRoles);
router.get('/:id', requireRoles('Tenant Admin', 'HR Admin'), ctrl.getRole);

// Write access: Tenant Admin only
router.post('/', requireRoles('Tenant Admin'), ctrl.createRole);
router.post('/:id/clone', requireRoles('Tenant Admin'), ctrl.cloneRole);
router.put('/:id', requireRoles('Tenant Admin'), ctrl.updateRole);
router.delete('/:id', requireRoles('Tenant Admin'), ctrl.deleteRole);

export { router as rolesRoutes };
