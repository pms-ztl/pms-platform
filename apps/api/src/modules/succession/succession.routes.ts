import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { successionController } from './succession.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// All routes require HR/Admin access
router.post('/', authorize({ resource: 'succession', action: 'create', scope: 'all' }), (req, res, next) => successionController.create(req as AuthenticatedRequest, res, next));
router.get('/', authorize({ resource: 'succession', action: 'read', scope: 'all' }), (req, res, next) => successionController.list(req as AuthenticatedRequest, res, next));
router.get('/nine-box', authorize({ resource: 'succession', action: 'read', scope: 'all' }), (req, res, next) => successionController.getNineBoxGrid(req as AuthenticatedRequest, res, next));
router.get('/:id', authorize({ resource: 'succession', action: 'read', scope: 'all' }), (req, res, next) => successionController.getById(req as AuthenticatedRequest, res, next));
router.put('/:id', authorize({ resource: 'succession', action: 'update', scope: 'all' }), (req, res, next) => successionController.update(req as AuthenticatedRequest, res, next));
router.delete('/:id', authorize({ resource: 'succession', action: 'delete', scope: 'all' }), (req, res, next) => successionController.delete(req as AuthenticatedRequest, res, next));
router.get('/:id/readiness', authorize({ resource: 'succession', action: 'read', scope: 'all' }), (req, res, next) => successionController.getSuccessorReadiness(req as AuthenticatedRequest, res, next));

export { router as successionRoutes };
