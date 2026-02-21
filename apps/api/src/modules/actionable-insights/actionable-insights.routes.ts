import { Router } from 'express';
import { prisma } from '@pms/database';
import { authenticate } from '../../middleware/authenticate';
import type { AuthenticatedRequest } from '../../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = Router();

router.use(authenticate);

// ── Promotion ────────────────────────────────────────────────

// POST /actionable-insights/promotion/recommend — score a user for promotion
router.post('/promotion/recommend', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { userId, targetRole } = req.body;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true, createdAt: true, managerId: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Get reviews for performance score
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId, tenantId, overallRating: { not: null }, status: 'FINALIZED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { overallRating: true, strengths: true, areasForGrowth: true, createdAt: true },
    });

    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / reviews.length
      : 0;
    const performanceScore = Math.round((avgRating / 5) * 100);

    // Goal completion rate
    const goals = await prisma.goal.findMany({
      where: { ownerId: userId, tenantId, deletedAt: null },
      select: { status: true },
    });
    const completedGoals = goals.filter((g) => g.status === 'COMPLETED').length;
    const potentialScore = goals.length ? Math.round((completedGoals / goals.length) * 100) : 0;

    // Tenure score (months at company / 24 months = 100% cap)
    const tenureMonths = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const tenureScore = Math.min(100, Math.round((tenureMonths / 24) * 100));

    // Development plan progress
    const devPlans = await prisma.developmentPlan.findMany({
      where: { userId, tenantId, status: { not: 'CANCELLED' } },
      select: { progressPercentage: true, status: true },
    });
    const engagementScore = devPlans.length
      ? Math.round(
          devPlans.reduce((s, p) => s + Number(p.progressPercentage), 0) / devPlans.length
        )
      : 0;

    const overallScore = Math.round(
      performanceScore * 0.35 +
        potentialScore * 0.25 +
        tenureScore * 0.15 +
        engagementScore * 0.15 +
        50 * 0.1 // base leadership/skills placeholder
    );

    const strengths = [...new Set(reviews.flatMap((r) => r.strengths))].slice(0, 5);
    const developmentAreas = [...new Set(reviews.flatMap((r) => r.areasForGrowth))].slice(0, 5);

    let recommendation = 'Insufficient data for recommendation';
    if (reviews.length > 0) {
      if (overallScore >= 80) recommendation = 'Strongly Recommended for Promotion';
      else if (overallScore >= 65) recommendation = 'Recommended for Promotion';
      else if (overallScore >= 50) recommendation = 'Consider for Promotion with Development Plan';
      else recommendation = 'Not Ready for Promotion at This Time';
    }

    res.json({
      success: true,
      data: {
        id: `promo-${Date.now()}`,
        userId,
        user: { id: user.id, name: `${user.firstName} ${user.lastName}`, jobTitle: user.jobTitle, level: user.level },
        targetRole: targetRole ?? null,
        status: 'PENDING',
        overallScore,
        performanceScore,
        potentialScore,
        skillsMatchScore: 60, // placeholder without skill matrix comparison
        leadershipScore: user.managerId ? 40 : 55,
        tenureScore,
        engagementScore,
        reviewsConsidered: reviews.length,
        strengths,
        developmentAreas,
        recommendation,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /actionable-insights/promotion/user/:userId — get promotion recommendations for a user
router.get('/promotion/user/:userId', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { userId } = req.params;

    // Return recent promotion history from audit logs (simplified: return review summary)
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId, tenantId, status: 'FINALIZED' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, overallRating: true, calibratedRating: true, createdAt: true, type: true },
    });

    res.json({ success: true, data: reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /actionable-insights/promotion/:id/approve
router.post('/promotion/:id/approve', (req, res) => {
  res.json({ success: true, data: { id: req.params.id, status: 'APPROVED', approvedAt: new Date().toISOString() } });
});

// POST /actionable-insights/promotion/:id/reject
router.post('/promotion/:id/reject', (req, res) => {
  res.json({ success: true, data: { id: req.params.id, status: 'REJECTED', rejectionReason: req.body.rejectionReason } });
});

// ── Succession ───────────────────────────────────────────────

// POST /actionable-insights/succession/create
router.post('/succession/create', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { positionTitle, currentIncumbentId, criticality = 'MEDIUM', successorIds = [] } = req.body;

    // Build successor profiles from actual user data
    const successors = successorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: successorIds }, tenantId },
          select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true },
        })
      : [];

    res.status(201).json({
      success: true,
      data: {
        id: `sp-${Date.now()}`,
        positionTitle,
        currentIncumbentId: currentIncumbentId ?? null,
        criticality,
        successors: successors.map((s) => ({ ...s, readinessScore: 0, readinessLevel: 'DEVELOPING' })),
        status: 'ACTIVE',
        tenantId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /actionable-insights/succession/plans — list development plans of type LEADERSHIP as succession candidates
router.get('/succession/plans', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;

    const leadershipPlans = await prisma.developmentPlan.findMany({
      where: { tenantId, planType: 'LEADERSHIP', status: { not: 'CANCELLED' } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true, avatarUrl: true } },
      },
      orderBy: { progressPercentage: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: leadershipPlans.map((p) => ({
        id: p.id,
        planName: p.planName,
        targetRole: p.targetRole,
        status: p.status,
        progress: Number(p.progressPercentage),
        user: p.user,
        careerGoal: p.careerGoal,
        startDate: p.startDate,
        targetCompletionDate: p.targetCompletionDate,
      })),
      meta: { total: leadershipPlans.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Development ──────────────────────────────────────────────

// POST /actionable-insights/development/generate — create a development plan
router.post('/development/generate', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { userId, planType = 'CAREER_GROWTH', careerGoal, targetRole, duration = 6 } = req.body;

    const targetUserId = userId || req.user!.id;

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      select: { id: true, level: true, jobTitle: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const plan = await prisma.developmentPlan.create({
      data: {
        tenantId,
        userId: targetUserId,
        planName: `${planType.replace(/_/g, ' ')} Plan`,
        planType,
        duration: Number(duration),
        startDate: new Date(),
        targetCompletionDate: new Date(Date.now() + Number(duration) * 30 * 24 * 60 * 60 * 1000),
        careerGoal: careerGoal || 'Professional growth and development',
        targetRole: targetRole ?? null,
        currentLevel: user.level?.toString() ?? 'L1',
        status: 'DRAFT',
        generatedBy: 'MANUAL',
      },
    });

    // Return GeneratedDevPlan shape expected by AIDevPlanPage
    res.json({
      success: true,
      data: {
        id: plan.id,
        userId: plan.userId,
        planName: plan.planName,
        planType: plan.planType,
        duration: plan.duration,
        careerGoal: plan.careerGoal,
        targetRole: plan.targetRole ?? null,
        currentLevel: user.level?.toString() ?? 'L1',
        status: plan.status,
        progressPercentage: 0,
        totalActivities: 0,
        strengthsAssessed: [],
        developmentAreas: [],
        skillGapAnalysis: {},
        competencyGaps: {},
        activities: [],
        milestones: [],
        successMetrics: [],
        budget: null,
        startDate: plan.startDate,
        targetCompletionDate: plan.targetCompletionDate,
        createdAt: plan.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /actionable-insights/development/user/:userId — get development plans for a user
router.get('/development/user/:userId', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.params.userId === 'me' ? req.user!.id : req.params.userId;

    const plans = await prisma.developmentPlan.findMany({
      where: { userId, tenantId, status: { not: 'CANCELLED' } },
      include: {
        activities_rel: {
          select: { id: true, title: true, activityType: true, status: true, dueDate: true, progressPercentage: true, estimatedHours: true, priority: true },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    // Return GeneratedDevPlan[] shape expected by AIDevPlanPage
    res.json({
      success: true,
      data: plans.map((p) => ({
        id: p.id,
        userId: p.userId,
        planName: p.planName,
        planType: p.planType,
        duration: p.duration,
        careerGoal: p.careerGoal,
        targetRole: p.targetRole ?? null,
        currentLevel: p.currentLevel,
        status: p.status,
        progressPercentage: Number(p.progressPercentage),
        totalActivities: p.totalActivities,
        strengthsAssessed: p.strengthsAssessed ?? [],
        developmentAreas: p.developmentAreas ?? [],
        skillGapAnalysis: typeof p.skillGapAnalysis === 'object' ? (p.skillGapAnalysis as any) : {},
        competencyGaps: typeof p.competencyGaps === 'object' ? (p.competencyGaps as any) : {},
        activities: p.activities_rel.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.activityType,
          activityType: a.activityType,
          status: a.status,
          dueDate: a.dueDate,
          estimatedHours: a.estimatedHours ? Number(a.estimatedHours) : null,
          priority: a.priority,
          progressPercentage: Number(a.progressPercentage),
        })),
        milestones: Array.isArray(p.milestones) ? (p.milestones as any[]) : [],
        successMetrics: Array.isArray(p.successMetrics) ? (p.successMetrics as any[]) : [],
        budget: p.budget ? Number(p.budget) : null,
        startDate: p.startDate,
        targetCompletionDate: p.targetCompletionDate,
        createdAt: p.createdAt,
      })),
      meta: { total: plans.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /actionable-insights/development/:planId/progress — update plan progress
router.put('/development/:planId/progress', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { planId } = req.params;
    const { progressPercentage, notes } = req.body;

    const plan = await prisma.developmentPlan.findFirst({ where: { id: planId, tenantId } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    const updated = await prisma.developmentPlan.update({
      where: { id: planId },
      data: {
        progressPercentage: progressPercentage ?? plan.progressPercentage,
        notes: notes ?? plan.notes,
        status: Number(progressPercentage) >= 100 ? 'COMPLETED' : 'ACTIVE',
        completedAt: Number(progressPercentage) >= 100 ? new Date() : null,
      },
    });

    res.json({
      success: true,
      data: { id: updated.id, status: updated.status, progress: Number(updated.progressPercentage) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /actionable-insights/development/:planId/complete
router.post('/development/:planId/complete', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { planId } = req.params;

    const plan = await prisma.developmentPlan.findFirst({ where: { id: planId, tenantId } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    const updated = await prisma.developmentPlan.update({
      where: { id: planId },
      data: { status: 'COMPLETED', progressPercentage: 100, completedAt: new Date() },
    });

    res.json({ success: true, data: { id: updated.id, status: updated.status, completedAt: updated.completedAt } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Team Optimization ────────────────────────────────────────

// POST /actionable-insights/team/optimize
router.post('/team/optimize', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { teamId, optimizationType = 'SKILLS_BALANCE' } = req.body;

    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId, tenantId, deletedAt: null },
        include: {
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true } },
            },
          },
          _count: { select: { goals: true, members: true } },
        },
      });

      if (team) {
        const memberCount = team._count.members;
        const recommendations: string[] = [];
        if (memberCount < 3) recommendations.push('Team is understaffed — consider adding 2-3 more members');
        if (memberCount > 12) recommendations.push('Team is oversized — consider splitting into sub-teams');

        return res.json({
          success: true,
          data: {
            optimizationType,
            teamId,
            teamName: team.name,
            memberCount,
            recommendations,
            score: Math.max(40, 100 - Math.abs(memberCount - 6) * 8),
            analysis: recommendations.length
              ? recommendations.join('. ')
              : 'Team composition looks healthy.',
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        optimizationType,
        recommendations: [],
        score: 0,
        analysis: 'Provide a teamId to get optimization recommendations.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /actionable-insights/team/:teamId/analyze
router.get('/team/:teamId/analyze', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { teamId } = req.params;

    if (!UUID_RE.test(teamId)) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, tenantId, deletedAt: null },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true } },
          },
        },
        goals: {
          where: { deletedAt: null },
          select: { status: true, priority: true, progress: true },
        },
      },
    });

    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const levelDist: Record<string, number> = {};
    for (const m of team.members) {
      const lvl = m.user.level?.toString() ?? 'Unknown';
      levelDist[lvl] = (levelDist[lvl] ?? 0) + 1;
    }

    const completedGoals = team.goals.filter((g) => g.status === 'COMPLETED').length;

    res.json({
      success: true,
      data: {
        teamId,
        teamName: team.name,
        memberCount: team.members.length,
        members: team.members.map((m) => ({
          id: m.userId,
          name: `${m.user.firstName} ${m.user.lastName}`,
          role: m.role,
          level: m.user.level,
          jobTitle: m.user.jobTitle,
          allocation: m.allocation,
        })),
        levelDistribution: levelDist,
        goalCompletionRate: team.goals.length
          ? Math.round((completedGoals / team.goals.length) * 100)
          : 0,
        gaps: team.members.length < 3 ? ['Insufficient team members for effective collaboration'] : [],
        strengths: team.members.length >= 3 ? ['Team has adequate size for collaboration'] : [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Organizational Health ────────────────────────────────────

// GET /actionable-insights/health/calculate — compute org health (OrgHealthMetrics shape)
router.get('/health/calculate', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, archivedUsers, reviews, goals, devPlans, lowRatedRecent] = await Promise.all([
      prisma.user.count({ where: { tenantId, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, deletedAt: null, isActive: true } }),
      prisma.user.count({ where: { tenantId, deletedAt: { not: null } } }),
      prisma.review.findMany({
        where: { tenantId, overallRating: { not: null }, createdAt: { gte: thirtyDaysAgo } },
        select: { overallRating: true, strengths: true, areasForGrowth: true },
      }),
      prisma.goal.findMany({ where: { tenantId, deletedAt: null }, select: { status: true } }),
      prisma.developmentPlan.findMany({
        where: { tenantId, status: { not: 'CANCELLED' } },
        select: { progressPercentage: true, status: true },
      }),
      prisma.user.count({
        where: { tenantId, deletedAt: null, isActive: true,
          reviewsAsReviewee: { some: { overallRating: { lte: 2.5 }, createdAt: { gte: ninetyDaysAgo } } } },
      }),
    ]);

    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / reviews.length : 0;
    const performanceScore = Math.round((avgRating / 5) * 100);

    const engagementScore = totalUsers
      ? Math.min(100, Math.round(((activeUsers + devPlans.filter(p => p.status === 'ACTIVE').length) / (totalUsers * 2)) * 100))
      : 0;

    const retentionRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100;
    const turnoverRate = totalUsers > 0 ? Math.round((archivedUsers / Math.max(totalUsers, 1)) * 100) : 0;

    const activePlans = devPlans.filter(p => p.status === 'ACTIVE' || p.status === 'COMPLETED');
    const developmentScore = activePlans.length
      ? Math.round(activePlans.reduce((s, p) => s + Number(p.progressPercentage), 0) / activePlans.length) : 0;

    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
    const cultureScore = goals.length ? Math.round((completedGoals / goals.length) * 100) : 0;

    const overallHealthScore = Math.round(
      performanceScore * 0.30 + engagementScore * 0.20 + retentionRate * 0.20 +
      developmentScore * 0.15 + cultureScore * 0.15
    );

    let healthLevel = 'FAIR';
    if (overallHealthScore >= 85) healthLevel = 'EXCELLENT';
    else if (overallHealthScore >= 70) healthLevel = 'GOOD';
    else if (overallHealthScore >= 50) healthLevel = 'FAIR';
    else if (overallHealthScore >= 30) healthLevel = 'POOR';
    else healthLevel = 'CRITICAL';

    const allStrengths = reviews.flatMap(r => r.strengths);
    const allConcerns = reviews.flatMap(r => r.areasForGrowth);
    const strengths = [...new Set(allStrengths)].slice(0, 5);
    const concerns = [...new Set(allConcerns)].slice(0, 5);

    const recommendations: Array<{ category: string; description: string }> = [];
    if (performanceScore < 60) recommendations.push({ category: 'Performance', description: 'Focus on performance improvement — review ratings are below target' });
    if (developmentScore < 40) recommendations.push({ category: 'Development', description: 'Invest in development plans to improve employee growth trajectory' });
    if (retentionRate < 80) recommendations.push({ category: 'Retention', description: 'Address retention risk — a significant portion of users are inactive' });
    if (cultureScore < 50) recommendations.push({ category: 'Culture', description: 'Goal completion rate is low — revisit goal-setting practices' });
    if (engagementScore < 50) recommendations.push({ category: 'Engagement', description: 'Employee engagement is below optimal — increase development and recognition programs' });

    res.json({
      success: true,
      data: {
        overallHealthScore,
        healthLevel,
        performanceScore,
        engagementScore,
        cultureScore,
        leadershipScore: performanceScore,
        collaborationScore: Math.round((engagementScore + cultureScore) / 2),
        innovationScore: developmentScore,
        wellbeingScore: retentionRate,
        headcount: activeUsers,
        turnoverRate,
        retentionRate,
        eNPS: Math.round((performanceScore - 50) * 2), // synthetic eNPS proxy
        atRiskEmployees: lowRatedRecent,
        burnoutRiskCount: Math.round(lowRatedRecent * 0.4),
        flightRiskCount: Math.round(lowRatedRecent * 0.6),
        avgSentimentScore: Number((avgRating / 5).toFixed(2)),
        strengths,
        concerns,
        recommendations,
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /actionable-insights/health/culture-diagnostic (CultureDiagnostic shape)
router.post('/health/culture-diagnostic', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [reviews, goals, devPlans, totalUsers, activeUsers] = await Promise.all([
      prisma.review.findMany({
        where: { tenantId, createdAt: { gte: ninetyDaysAgo }, overallRating: { not: null } },
        select: { overallRating: true, strengths: true, areasForGrowth: true },
      }),
      prisma.goal.findMany({ where: { tenantId, deletedAt: null }, select: { status: true, type: true } }),
      prisma.developmentPlan.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.user.count({ where: { tenantId, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, deletedAt: null, isActive: true } }),
    ]);

    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / reviews.length : 0;
    const performanceScore = Math.round((avgRating / 5) * 100);

    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
    const executionScore = goals.length ? Math.round((completedGoals / goals.length) * 100) : 0;

    const growthScore = totalUsers ? Math.min(100, Math.round((devPlans / totalUsers) * 100)) : 0;
    const retentionScore = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 100;
    const teamGoals = goals.filter(g => g.type === 'TEAM' || g.type === 'DEPARTMENT');
    const collaborationScore = teamGoals.length
      ? Math.round(teamGoals.filter(g => g.status === 'COMPLETED').length / teamGoals.length * 100) : 50;

    const allStrengths = reviews.flatMap(r => r.strengths);
    const allAreas = reviews.flatMap(r => r.areasForGrowth);
    const culturalStrengths = [...new Set(allStrengths)].slice(0, 5);
    const culturalWeaknesses = [...new Set(allAreas)].slice(0, 5);

    // Map scores onto OCAI culture type scores (0-100 scale)
    const clanCulture = Math.round((collaborationScore + retentionScore) / 2);
    const adhocracyCulture = Math.round((growthScore + performanceScore * 0.5) / 1.5);
    const marketCulture = Math.round((executionScore + performanceScore) / 2);
    const hierarchyCulture = Math.round((retentionScore * 0.7 + 30));

    // Ensure 4 culture types sum to reasonable totals (OCAI style)
    const total = clanCulture + adhocracyCulture + marketCulture + hierarchyCulture;
    const normalize = (v: number) => Math.round((v / Math.max(total, 1)) * 100);

    res.json({
      success: true,
      data: {
        id: `culture-${Date.now()}`,
        clanCulture: normalize(clanCulture),
        adhocracyCulture: normalize(adhocracyCulture),
        marketCulture: normalize(marketCulture),
        hierarchyCulture: normalize(hierarchyCulture),
        psychologicalSafety: Math.round((performanceScore + collaborationScore) / 2),
        trustLevel: retentionScore,
        transparency: Math.min(100, Math.round(executionScore * 0.8 + 20)),
        accountability: executionScore,
        innovation: growthScore,
        culturalStrengths,
        culturalWeaknesses,
        reviewsAnalyzed: reviews.length,
        diagnosticDate: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { router as actionableInsightsRoutes };
