import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { skillsController } from './skills.controller';

const router = Router();

router.use(authenticate);

// Skill Categories
router.get('/categories', (req, res, next) => skillsController.listCategories(req as any, res, next));
router.post('/categories', authorize({ resource: 'skills', action: 'create', scope: 'all' }), (req, res, next) => skillsController.createCategory(req as any, res, next));
router.put('/categories/:id', authorize({ resource: 'skills', action: 'update', scope: 'all' }), (req, res, next) => skillsController.updateCategory(req as any, res, next));
router.delete('/categories/:id', authorize({ resource: 'skills', action: 'delete', scope: 'all' }), (req, res, next) => skillsController.deleteCategory(req as any, res, next));

// Skill Assessments
router.get('/assessments', (req, res, next) => skillsController.listAssessments(req as any, res, next));
router.post('/assessments', authorize({ resource: 'skills', action: 'create', scope: 'team' }), (req, res, next) => skillsController.createAssessment(req as any, res, next));
router.put('/assessments/:id', (req, res, next) => skillsController.updateAssessment(req as any, res, next));
router.post('/assessments/:id/progress', (req, res, next) => skillsController.addProgressEntry(req as any, res, next));

// Skill Matrix
router.get('/matrix/user/:userId', (req, res, next) => skillsController.getUserSkillMatrix(req as any, res, next));
router.get('/matrix/team', authorize({ resource: 'skills', action: 'read', scope: 'team' }), (req, res, next) => skillsController.getTeamSkillMatrix(req as any, res, next));

// Analytics
router.get('/gaps', authorize({ resource: 'skills', action: 'read', scope: 'all' }), (req, res, next) => skillsController.getSkillGaps(req as any, res, next));
router.get('/heatmap', authorize({ resource: 'skills', action: 'read', scope: 'all' }), (req, res, next) => skillsController.getOrgSkillHeatmap(req as any, res, next));

export { router as skillsRoutes };
