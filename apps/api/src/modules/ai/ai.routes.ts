/**
 * AI Routes — all AI endpoints under /api/v1/ai
 */

import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../utils/async-handler';
import { aiController } from './ai.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Chat
router.post('/chat', asyncHandler((req, res, next) => aiController.chat(req as AuthenticatedRequest, res, next)));

// Conversations
router.get('/conversations', asyncHandler((req, res, next) =>
  aiController.listConversations(req as AuthenticatedRequest, res, next),
));
router.get('/conversations/:id', asyncHandler((req, res, next) =>
  aiController.getConversation(req as AuthenticatedRequest, res, next),
));
router.delete('/conversations/:id', asyncHandler((req, res, next) =>
  aiController.archiveConversation(req as AuthenticatedRequest, res, next),
));

// Excel AI analysis
router.post('/excel/analyze', asyncHandler((req, res, next) =>
  aiController.analyzeExcel(req as AuthenticatedRequest, res, next),
));

// Insights
router.get('/insights/summary', asyncHandler((req, res, next) =>
  aiController.getInsightsSummary(req as AuthenticatedRequest, res, next),
));
router.get('/insights', asyncHandler((req, res, next) =>
  aiController.getInsights(req as AuthenticatedRequest, res, next),
));
router.put('/insights/:id/read', asyncHandler((req, res, next) =>
  aiController.markInsightRead(req as AuthenticatedRequest, res, next),
));
router.put('/insights/:id/dismiss', asyncHandler((req, res, next) =>
  aiController.dismissInsight(req as AuthenticatedRequest, res, next),
));

// Reports
router.post('/reports/generate', asyncHandler((req, res, next) =>
  aiController.generateReport(req as AuthenticatedRequest, res, next),
));

// Usage stats
router.get('/usage', asyncHandler((req, res, next) =>
  aiController.getUsage(req as AuthenticatedRequest, res, next),
));

export { router as aiRoutes };
