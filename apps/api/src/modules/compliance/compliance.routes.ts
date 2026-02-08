import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { complianceController } from './compliance.controller';

const router = Router();

router.use(authenticate);

// Dashboard
router.get('/dashboard', authorize({ resource: 'compliance', action: 'read', scope: 'all' }), (req, res, next) => complianceController.getDashboard(req as any, res, next));

// Policies
router.get('/policies', (req, res, next) => complianceController.listPolicies(req as any, res, next));
router.post('/policies', authorize({ resource: 'compliance', action: 'create', scope: 'all' }), (req, res, next) => complianceController.createPolicy(req as any, res, next));
router.put('/policies/:id', authorize({ resource: 'compliance', action: 'update', scope: 'all' }), (req, res, next) => complianceController.updatePolicy(req as any, res, next));
router.delete('/policies/:id', authorize({ resource: 'compliance', action: 'delete', scope: 'all' }), (req, res, next) => complianceController.deletePolicy(req as any, res, next));

// Assessments
router.get('/assessments', (req, res, next) => complianceController.listAssessments(req as any, res, next));
router.post('/assessments', authorize({ resource: 'compliance', action: 'create', scope: 'all' }), (req, res, next) => complianceController.createAssessment(req as any, res, next));
router.put('/assessments/:id', (req, res, next) => complianceController.updateAssessment(req as any, res, next));

// Violations
router.get('/violations', authorize({ resource: 'compliance', action: 'read', scope: 'all' }), (req, res, next) => complianceController.listViolations(req as any, res, next));
router.post('/violations', (req, res, next) => complianceController.createViolation(req as any, res, next));
router.put('/violations/:id', authorize({ resource: 'compliance', action: 'update', scope: 'all' }), (req, res, next) => complianceController.updateViolation(req as any, res, next));

// User compliance
router.get('/user/:userId', (req, res, next) => complianceController.getUserCompliance(req as any, res, next));

export { router as complianceRoutes };
