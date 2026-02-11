/**
 * Evidence Routes
 *
 * API routes for evidence management.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { evidenceController } from './evidence.controller';

const router = Router();

router.use(authenticate);

// Core CRUD
router.post('/', evidenceController.create.bind(evidenceController));
router.get('/', evidenceController.list.bind(evidenceController));
router.get('/:evidenceId', evidenceController.get.bind(evidenceController));
router.patch('/:evidenceId', evidenceController.update.bind(evidenceController));

// Verification
router.post('/:evidenceId/verify', evidenceController.verify.bind(evidenceController));

// Linking
router.post('/link-to-review', evidenceController.linkToReview.bind(evidenceController));
router.delete('/:evidenceId/reviews/:reviewId', evidenceController.unlinkFromReview.bind(evidenceController));

// Lifecycle
router.post('/:evidenceId/archive', evidenceController.archive.bind(evidenceController));

// Bulk operations
router.post('/import', evidenceController.bulkImport.bind(evidenceController));

// Analytics
router.get('/employees/:employeeId/summary', evidenceController.getSummary.bind(evidenceController));

export const evidenceRoutes = router;
