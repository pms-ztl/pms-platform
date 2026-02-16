import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { adminConfigController } from './admin-config.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// Review Templates
router.get('/templates', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listTemplates(req as AuthenticatedRequest, res, next));
router.get('/templates/:id', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.getTemplate(req as AuthenticatedRequest, res, next));
router.post('/templates', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createTemplate(req as AuthenticatedRequest, res, next));
router.put('/templates/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateTemplate(req as AuthenticatedRequest, res, next));
router.delete('/templates/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteTemplate(req as AuthenticatedRequest, res, next));

// Competency Frameworks
router.get('/frameworks', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listFrameworks(req as AuthenticatedRequest, res, next));
router.get('/frameworks/:id', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.getFramework(req as AuthenticatedRequest, res, next));
router.post('/frameworks', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createFramework(req as AuthenticatedRequest, res, next));
router.put('/frameworks/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateFramework(req as AuthenticatedRequest, res, next));
router.delete('/frameworks/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteFramework(req as AuthenticatedRequest, res, next));

// Competencies within a framework
router.get('/frameworks/:frameworkId/competencies', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listCompetencies(req as AuthenticatedRequest, res, next));
router.post('/frameworks/:frameworkId/competencies', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createCompetency(req as AuthenticatedRequest, res, next));
router.put('/competencies/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateCompetency(req as AuthenticatedRequest, res, next));
router.delete('/competencies/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteCompetency(req as AuthenticatedRequest, res, next));

// Questionnaires
router.get('/questionnaires', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listQuestionnaires(req as AuthenticatedRequest, res, next));
router.post('/questionnaires', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createQuestionnaire(req as AuthenticatedRequest, res, next));
router.put('/questionnaires/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateQuestionnaire(req as AuthenticatedRequest, res, next));
router.delete('/questionnaires/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteQuestionnaire(req as AuthenticatedRequest, res, next));

// Rating Scales
router.get('/rating-scales', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.getRatingScales(req as AuthenticatedRequest, res, next));

export { router as adminConfigRoutes };
