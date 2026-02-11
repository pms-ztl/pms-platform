/**
 * Compensation Routes
 *
 * API routes for compensation decision management.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { compensationController } from './compensation.controller';

const router = Router();

router.use(authenticate);

// Core CRUD
router.post('/', compensationController.create.bind(compensationController));
router.get('/', compensationController.list.bind(compensationController));
router.get('/budget-summary', compensationController.getBudgetSummary.bind(compensationController));
router.get('/:decisionId', compensationController.get.bind(compensationController));
router.patch('/:decisionId', compensationController.update.bind(compensationController));

// Workflow
router.post('/:decisionId/submit', compensationController.submit.bind(compensationController));
router.post('/:decisionId/approve', compensationController.approve.bind(compensationController));
router.post('/:decisionId/reject', compensationController.reject.bind(compensationController));
router.post('/:decisionId/implement', compensationController.implement.bind(compensationController));

// Evidence linking
router.post('/link-evidence', compensationController.linkEvidence.bind(compensationController));
router.delete('/:decisionId/evidence/:evidenceId', compensationController.unlinkEvidence.bind(compensationController));

export const compensationRoutes = router;
