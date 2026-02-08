import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { adminConfigController } from './admin-config.controller';

const router = Router();

router.use(authenticate);

// Review Templates
router.get('/templates', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listTemplates(req as any, res, next));
router.get('/templates/:id', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.getTemplate(req as any, res, next));
router.post('/templates', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createTemplate(req as any, res, next));
router.put('/templates/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateTemplate(req as any, res, next));
router.delete('/templates/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteTemplate(req as any, res, next));

// Competency Frameworks
router.get('/frameworks', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listFrameworks(req as any, res, next));
router.get('/frameworks/:id', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.getFramework(req as any, res, next));
router.post('/frameworks', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createFramework(req as any, res, next));
router.put('/frameworks/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateFramework(req as any, res, next));
router.delete('/frameworks/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteFramework(req as any, res, next));

// Competencies within a framework
router.get('/frameworks/:frameworkId/competencies', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listCompetencies(req as any, res, next));
router.post('/frameworks/:frameworkId/competencies', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createCompetency(req as any, res, next));
router.put('/competencies/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateCompetency(req as any, res, next));
router.delete('/competencies/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteCompetency(req as any, res, next));

// Questionnaires
router.get('/questionnaires', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.listQuestionnaires(req as any, res, next));
router.post('/questionnaires', authorize({ resource: 'admin', action: 'create', scope: 'all' }), (req, res, next) => adminConfigController.createQuestionnaire(req as any, res, next));
router.put('/questionnaires/:id', authorize({ resource: 'admin', action: 'update', scope: 'all' }), (req, res, next) => adminConfigController.updateQuestionnaire(req as any, res, next));
router.delete('/questionnaires/:id', authorize({ resource: 'admin', action: 'delete', scope: 'all' }), (req, res, next) => adminConfigController.deleteQuestionnaire(req as any, res, next));

// Rating Scales
router.get('/rating-scales', authorize({ resource: 'admin', action: 'read', scope: 'all' }), (req, res, next) => adminConfigController.getRatingScales(req as any, res, next));

export { router as adminConfigRoutes };
