/**
 * Promotion Routes
 *
 * API routes for promotion decision management.
 */

import { Router } from 'express';
import { promotionController } from './promotion.controller';

const router = Router();

// Core CRUD
router.post('/', promotionController.create.bind(promotionController));
router.get('/', promotionController.list.bind(promotionController));
router.get('/summary', promotionController.getSummary.bind(promotionController));
router.get('/:decisionId', promotionController.get.bind(promotionController));
router.patch('/:decisionId', promotionController.update.bind(promotionController));

// Workflow
router.post('/:decisionId/start-review', promotionController.startReview.bind(promotionController));
router.post('/:decisionId/approve', promotionController.approve.bind(promotionController));
router.post('/:decisionId/reject', promotionController.reject.bind(promotionController));
router.post('/:decisionId/defer', promotionController.defer.bind(promotionController));
router.post('/:decisionId/implement', promotionController.implement.bind(promotionController));

// Evidence linking
router.post('/link-evidence', promotionController.linkEvidence.bind(promotionController));
router.delete('/:decisionId/evidence/:evidenceId', promotionController.unlinkEvidence.bind(promotionController));

export const promotionRoutes = router;
