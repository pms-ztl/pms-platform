/**
 * Actionable Insights & Planning Controller
 * REST API endpoints for Features 46-50
 */

import { Request, Response } from 'express';
import {
  PromotionSuccessionService,
  DevelopmentPlanService,
  TeamOptimizationService,
  PIPAutomationService,
  OrganizationalHealthService
} from '../services/actionable-insights';

const promotionService = new PromotionSuccessionService();
const developmentService = new DevelopmentPlanService();
const teamOptimizationService = new TeamOptimizationService();
const pipService = new PIPAutomationService();
const orgHealthService = new OrganizationalHealthService();

export class ActionableInsightsController {
  // ============================================================================
  // PROMOTION & SUCCESSION RECOMMENDATIONS (Feature 46)
  // ============================================================================

  async generatePromotionRecommendation(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const { userId, targetRole, targetLevel, targetDepartment } = req.body;

      const recommendation = await promotionService.generatePromotionRecommendation({
        tenantId,
        userId,
        targetRole,
        targetLevel,
        targetDepartment
      });

      res.json(recommendation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createSuccessionPlan(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const { positionId, positionTitle, currentIncumbent, criticality } = req.body;

      const plan = await promotionService.createSuccessionPlan({
        tenantId,
        positionId,
        positionTitle,
        currentIncumbent,
        criticality
      });

      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserPromotionRecommendations(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const { userId } = req.params;

      const recommendations = await promotionService.getUserPromotionRecommendations(tenantId, userId);

      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSuccessionPlans(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const { criticality } = req.query;

      const plans = await promotionService.getSuccessionPlans(tenantId, {
        criticality: criticality as string
      });

      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async approvePromotionRecommendation(req: Request, res: Response) {
    try {
      const { userId } = req.user as any;
      const { recommendationId } = req.params;

      const result = await promotionService.approveRecommendation(recommendationId, userId);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async rejectPromotionRecommendation(req: Request, res: Response) {
    try {
      const { userId } = req.user as any;
      const { recommendationId } = req.params;
      const { rejectionReason } = req.body;

      const result = await promotionService.rejectRecommendation(
        recommendationId,
        userId,
        rejectionReason
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // DEVELOPMENT PLAN GENERATOR (Feature 47)
  // ============================================================================

  async generateDevelopmentPlan(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const {
        userId,
        planType,
        careerGoal,
        targetRole,
        targetLevel,
        duration
      } = req.body;

      const plan = await developmentService.generateDevelopmentPlan({
        tenantId,
        userId,
        planType,
        careerGoal,
        targetRole,
        targetLevel,
        duration
      });

      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserDevelopmentPlans(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const { userId } = req.params;

      const plans = await developmentService.getUserDevelopmentPlans(tenantId, userId);

      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateDevelopmentPlanProgress(req: Request, res: Response) {
    try {
      const { planId } = req.params;

      const result = await developmentService.updatePlanProgress(planId);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async completeDevelopmentPlan(req: Request, res: Response) {
    try {
      const { planId } = req.params;

      const result = await developmentService.completePlan(planId);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // TEAM OPTIMIZATION (Feature 48)
  // ============================================================================

  async optimizeTeamComposition(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const {
        optimizationType,
        teamName,
        department,
        teamSize,
        requiredSkills,
        requiredCompetencies,
        objectives,
        constraints,
        targetTeamId
      } = req.body;

      const optimization = await teamOptimizationService.optimizeTeamComposition({
        tenantId,
        optimizationType,
        teamName,
        department,
        teamSize,
        requiredSkills,
        requiredCompetencies,
        objectives,
        constraints,
        targetTeamId
      });

      res.json(optimization);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async analyzeTeamComposition(req: Request, res: Response) {
    try {
      const { teamId } = req.params;

      const analysis = await teamOptimizationService.analyzeTeamComposition(teamId);

      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // PIP AUTOMATION (Feature 49)
  // ============================================================================

  async generatePIP(req: Request, res: Response) {
    try {
      const { tenantId, userId: createdBy } = req.user as any;
      const {
        userId,
        pipType,
        severity,
        performanceIssues,
        duration
      } = req.body;

      const pip = await pipService.generatePIP({
        tenantId,
        userId,
        createdBy,
        pipType,
        severity,
        performanceIssues,
        duration
      });

      res.json(pip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async conductPIPCheckIn(req: Request, res: Response) {
    try {
      const { tenantId, userId: conductedBy } = req.user as any;
      const { pipId } = req.params;
      const {
        userId,
        progressSummary,
        onTrack,
        managerFeedback
      } = req.body;

      const checkIn = await pipService.conductCheckIn({
        tenantId,
        pipId,
        userId,
        conductedBy,
        progressSummary,
        onTrack,
        managerFeedback
      });

      res.json(checkIn);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async completePIP(req: Request, res: Response) {
    try {
      const { pipId } = req.params;
      const { outcome, outcomeNotes } = req.body;

      const result = await pipService.completePIP(pipId, outcome, outcomeNotes);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // ORGANIZATIONAL HEALTH (Feature 50)
  // ============================================================================

  async calculateOrganizationalHealth(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
      const { period } = req.query;

      const metrics = await orgHealthService.calculateOrganizationalHealth(
        tenantId,
        period as string
      );

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async conductCultureDiagnostic(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;

      const diagnostic = await orgHealthService.conductCultureDiagnostic(tenantId);

      res.json(diagnostic);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
