/**
 * AI Routes — all AI endpoints under /api/v1/ai
 */

import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { aiAccessGuard } from '../../middleware/ai-access-guard';
import { asyncHandler } from '../../utils/async-handler';
import { aiController } from './ai.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

// All AI routes require authentication + AI access
router.use(authenticate);
router.use(aiAccessGuard);

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
router.patch('/conversations/:id', asyncHandler((req, res, next) =>
  aiController.renameConversation(req as AuthenticatedRequest, res, next),
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

// Agentic Tasks
router.get('/tasks', asyncHandler((req, res, next) =>
  aiController.listTasks(req as AuthenticatedRequest, res, next),
));
router.get('/tasks/:id', asyncHandler((req, res, next) =>
  aiController.getTask(req as AuthenticatedRequest, res, next),
));
router.post('/tasks/:id/cancel', asyncHandler((req, res, next) =>
  aiController.cancelTask(req as AuthenticatedRequest, res, next),
));

// Agentic Approvals
router.get('/actions/pending', asyncHandler((req, res, next) =>
  aiController.getPendingApprovals(req as AuthenticatedRequest, res, next),
));
router.post('/actions/:id/approve', asyncHandler((req, res, next) =>
  aiController.approveAction(req as AuthenticatedRequest, res, next),
));
router.post('/actions/:id/reject', asyncHandler((req, res, next) =>
  aiController.rejectAction(req as AuthenticatedRequest, res, next),
));

// Multi-Agent Coordination
router.post('/chat/coordinate', asyncHandler((req, res, next) =>
  aiController.coordinateChat(req as AuthenticatedRequest, res, next),
));

// Live Agent Activity
router.get('/agents/active', asyncHandler((req, res, next) =>
  aiController.getActiveAgents(req as AuthenticatedRequest, res, next),
));

export { router as aiRoutes };
