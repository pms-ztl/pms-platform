/**
 * Actionable Insights & Planning Routes
 * API routes for Features 46-50
 */

import { Router } from 'express';
import { ActionableInsightsController } from '../controllers/actionable-insights.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const controller = new ActionableInsightsController();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// PROMOTION & SUCCESSION RECOMMENDATIONS (Feature 46)
// ============================================================================

// Generate promotion recommendation
router.post(
  '/promotion/recommend',
  controller.generatePromotionRecommendation.bind(controller)
);

// Create succession plan
router.post(
  '/succession/create',
  controller.createSuccessionPlan.bind(controller)
);

// Get user's promotion recommendations
router.get(
  '/promotion/user/:userId',
  controller.getUserPromotionRecommendations.bind(controller)
);

// Get succession plans
router.get(
  '/succession/plans',
  controller.getSuccessionPlans.bind(controller)
);

// Approve promotion recommendation
router.post(
  '/promotion/:recommendationId/approve',
  controller.approvePromotionRecommendation.bind(controller)
);

// Reject promotion recommendation
router.post(
  '/promotion/:recommendationId/reject',
  controller.rejectPromotionRecommendation.bind(controller)
);

// ============================================================================
// DEVELOPMENT PLAN GENERATOR (Feature 47)
// ============================================================================

// Generate development plan
router.post(
  '/development/generate',
  controller.generateDevelopmentPlan.bind(controller)
);

// Get user's development plans
router.get(
  '/development/user/:userId',
  controller.getUserDevelopmentPlans.bind(controller)
);

// Update development plan progress
router.put(
  '/development/:planId/progress',
  controller.updateDevelopmentPlanProgress.bind(controller)
);

// Complete development plan
router.post(
  '/development/:planId/complete',
  controller.completeDevelopmentPlan.bind(controller)
);

// ============================================================================
// TEAM OPTIMIZATION (Feature 48)
// ============================================================================

// Optimize team composition
router.post(
  '/team/optimize',
  controller.optimizeTeamComposition.bind(controller)
);

// Analyze team composition
router.get(
  '/team/:teamId/analyze',
  controller.analyzeTeamComposition.bind(controller)
);

// ============================================================================
// PIP AUTOMATION (Feature 49)
// ============================================================================

// Generate PIP
router.post(
  '/pip/generate',
  controller.generatePIP.bind(controller)
);

// Conduct PIP check-in
router.post(
  '/pip/:pipId/checkin',
  controller.conductPIPCheckIn.bind(controller)
);

// Complete PIP
router.post(
  '/pip/:pipId/complete',
  controller.completePIP.bind(controller)
);

// ============================================================================
// ORGANIZATIONAL HEALTH (Feature 50)
// ============================================================================

// Calculate organizational health metrics
router.get(
  '/health/calculate',
  controller.calculateOrganizationalHealth.bind(controller)
);

// Conduct culture diagnostic
router.post(
  '/health/culture-diagnostic',
  controller.conductCultureDiagnostic.bind(controller)
);

export default router;
