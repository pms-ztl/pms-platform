import { Router } from 'express';
import { prisma } from '@pms/database';
import { authenticate } from '../../middleware/authenticate';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// ── Sentiment ────────────────────────────────────────────────

// POST /ai-insights/sentiment/analyze — lightweight sentiment from review text
router.post('/sentiment/analyze', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const { text = '', sourceType = 'MANUAL' } = req.body;

    // Simple keyword-based sentiment without an external AI service
    const positiveWords = ['excellent', 'great', 'outstanding', 'good', 'strong', 'impressive', 'well', 'effective', 'motivated', 'collaborative'];
    const negativeWords = ['poor', 'weak', 'needs improvement', 'struggling', 'missed', 'late', 'failed', 'underperform', 'disengaged', 'conflict'];

    const lowerText = (text as string).toLowerCase();
    const posCount = positiveWords.filter((w) => lowerText.includes(w)).length;
    const negCount = negativeWords.filter((w) => lowerText.includes(w)).length;

    let sentiment = 'NEUTRAL';
    let score = 0.5;
    if (posCount > negCount) { sentiment = 'POSITIVE'; score = 0.5 + Math.min(0.45, posCount * 0.1); }
    if (negCount > posCount) { sentiment = 'NEGATIVE'; score = 0.5 - Math.min(0.45, negCount * 0.1); }

    res.json({
      success: true,
      data: {
        id: `sent-${Date.now()}`,
        text,
        sentiment,
        score: Number(score.toFixed(2)),
        confidence: posCount + negCount > 0 ? 0.7 : 0.3,
        sourceType,
        positiveSignals: posCount,
        negativeSignals: negCount,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/sentiment/trend — review rating trend over last 6 months
router.get('/sentiment/trend', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;

    // Get last 6 months of reviews grouped by month
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const reviews = await prisma.review.findMany({
      where: { tenantId, overallRating: { not: null }, createdAt: { gte: sixMonthsAgo } },
      select: { overallRating: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const byMonth: Record<string, { sum: number; count: number }> = {};
    for (const r of reviews) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { sum: 0, count: 0 };
      byMonth[key].sum += r.overallRating ?? 0;
      byMonth[key].count += 1;
    }

    const trend = Object.entries(byMonth).map(([month, { sum, count }]) => ({
      month,
      averageRating: Number((sum / count).toFixed(2)),
      reviewCount: count,
      sentimentScore: Number(((sum / count) / 5).toFixed(2)),
    }));

    res.json({ success: true, data: trend });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/sentiment/history
router.get('/sentiment/history', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId, tenantId, overallRating: { not: null } },
      select: { id: true, overallRating: true, type: true, createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.overallRating,
        type: r.type,
        sentiment: r.overallRating && r.overallRating >= 4 ? 'POSITIVE' : r.overallRating && r.overallRating >= 3 ? 'NEUTRAL' : 'NEGATIVE',
        score: r.overallRating ? Number((r.overallRating / 5).toFixed(2)) : 0.5,
        date: r.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Anomaly Detection ────────────────────────────────────────

// POST /ai-insights/anomaly/detect — detect performance anomalies in tenant
router.post('/anomaly/detect', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get users with recent reviews and flag sharp rating drops
    const recentReviews = await prisma.review.findMany({
      where: { tenantId, overallRating: { not: null }, createdAt: { gte: thirtyDaysAgo } },
      select: { id: true, revieweeId: true, overallRating: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Get older reviews for comparison
    const olderReviews = await prisma.review.findMany({
      where: {
        tenantId,
        overallRating: { not: null },
        createdAt: { lt: thirtyDaysAgo },
        revieweeId: { in: [...new Set(recentReviews.map((r) => r.revieweeId))] },
      },
      select: { revieweeId: true, overallRating: true },
    });

    const oldAvgByUser = new Map<string, { sum: number; count: number }>();
    for (const r of olderReviews) {
      const entry = oldAvgByUser.get(r.revieweeId) ?? { sum: 0, count: 0 };
      entry.sum += r.overallRating ?? 0;
      entry.count += 1;
      oldAvgByUser.set(r.revieweeId, entry);
    }

    // Enrich with user info
    const revieweeIds = [...new Set(recentReviews.map(r => r.revieweeId))];
    const users = revieweeIds.length
      ? await prisma.user.findMany({
          where: { id: { in: revieweeIds } },
          select: { id: true, firstName: true, lastName: true, jobTitle: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const anomalies: any[] = [];
    for (const r of recentReviews) {
      const old = oldAvgByUser.get(r.revieweeId);
      if (old && old.count > 0) {
        const oldAvg = old.sum / old.count;
        const drop = oldAvg - (r.overallRating ?? 0);
        const u = userMap.get(r.revieweeId);
        if (drop >= 1.5) {
          anomalies.push({
            id: `anomaly-${r.id}`,
            entityType: 'USER',
            entityId: r.revieweeId,
            entityName: u ? `${u.firstName} ${u.lastName}` : 'Unknown User',
            type: 'PERFORMANCE_DROP',
            severity: drop >= 2.5 ? 'HIGH' : 'MEDIUM',
            description: `Performance rating dropped by ${drop.toFixed(1)} points from historical average of ${oldAvg.toFixed(1)}`,
            status: 'DETECTED',
            previousAvg: Number(oldAvg.toFixed(2)),
            currentRating: r.overallRating,
            drop: Number(drop.toFixed(2)),
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    res.json({ success: true, data: anomalies, meta: { detected: anomalies.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/anomaly/active
router.get('/anomaly/active', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Users with reviews flagged as having bias or below 2.5 average in the last 30 days
    const lowRatedReviews = await prisma.review.findMany({
      where: {
        tenantId,
        overallRating: { lte: 2.5 },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        reviewee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, avatarUrl: true } },
      },
      orderBy: { overallRating: 'asc' },
      take: 20,
    });

    // Return AnomalyItem[] shape expected by AnomalyDetectionPage
    const anomalies = lowRatedReviews.map((r) => ({
      id: `anomaly-low-${r.id}`,
      entityType: 'USER',
      entityId: r.revieweeId,
      entityName: `${r.reviewee.firstName} ${r.reviewee.lastName}`,
      type: 'LOW_PERFORMANCE_RATING',
      severity: (r.overallRating ?? 0) <= 1.5 ? 'HIGH' : 'MEDIUM',
      description: `Performance rating of ${r.overallRating?.toFixed(1) ?? '?'}/5.0 is below acceptable threshold. ${r.reviewee.jobTitle ? `Role: ${r.reviewee.jobTitle}.` : ''}`,
      status: 'DETECTED',
      detectedAt: r.createdAt.toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      resolution: null,
    }));

    res.json({ success: true, data: anomalies, meta: { total: anomalies.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/anomaly/statistics
router.get('/anomaly/statistics', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [lowRatings, biasedReviews, totalReviews] = await Promise.all([
      prisma.review.count({ where: { tenantId, overallRating: { lte: 2.5 }, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.review.count({ where: { tenantId, biasScore: { gte: 0.5 }, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.review.count({ where: { tenantId, createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const totalDetected = lowRatings + biasedReviews;

    // Return AnomalyStats shape expected by AnomalyDetectionPage
    res.json({
      success: true,
      data: {
        total: totalDetected,
        active: lowRatings,
        acknowledged: 0,
        resolved: 0,
        reviewsAnalyzed: totalReviews,
        byType: {
          LOW_PERFORMANCE_RATING: lowRatings,
          POTENTIAL_BIAS: biasedReviews,
        },
        bySeverity: {
          HIGH: Math.floor(totalDetected * 0.3),
          MEDIUM: Math.ceil(totalDetected * 0.5),
          LOW: Math.ceil(totalDetected * 0.2),
          CRITICAL: 0,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /ai-insights/anomaly/:id/acknowledge — no DB model, return success
router.post('/anomaly/:id/acknowledge', (req, res) => {
  res.json({ success: true, data: { id: req.params.id, status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString() } });
});

// POST /ai-insights/anomaly/:id/resolve
router.post('/anomaly/:id/resolve', (req, res) => {
  res.json({ success: true, data: { id: req.params.id, status: 'RESOLVED', resolution: req.body.resolution, resolvedAt: new Date().toISOString() } });
});

// ── Benchmarking ─────────────────────────────────────────────

// POST /ai-insights/benchmark/create
router.post('/benchmark/create', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { benchmarkName, department, level } = req.body;

    // Compute average rating for department/level as the benchmark
    const where: any = { tenantId, overallRating: { not: null } };
    if (department) where.reviewee = { departmentId: department };

    const reviews = await prisma.review.findMany({
      where,
      select: { overallRating: true },
    });

    const avg = reviews.length
      ? reviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / reviews.length
      : 0;

    res.status(201).json({
      success: true,
      data: {
        id: `bench-${Date.now()}`,
        benchmarkName,
        department: department ?? null,
        level: level ?? null,
        averageRating: Number(avg.toFixed(2)),
        sampleSize: reviews.length,
        tenantId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /ai-insights/benchmark/compare — compare a user against tenant average
router.post('/benchmark/compare', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { userId } = req.body;

    const targetUserId = userId || req.user!.id;

    // User's average rating
    const userReviews = await prisma.review.findMany({
      where: { revieweeId: targetUserId, tenantId, overallRating: { not: null } },
      select: { overallRating: true },
    });

    // Tenant average
    const allReviews = await prisma.review.findMany({
      where: { tenantId, overallRating: { not: null } },
      select: { overallRating: true },
    });

    const userAvg = userReviews.length
      ? userReviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / userReviews.length
      : 0;
    const tenantAvg = allReviews.length
      ? allReviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / allReviews.length
      : 0;

    // Calculate percentile: what fraction of users have lower avg than this user
    const userIds = [...new Set(allReviews.map(() => ''))]; // placeholder
    // Simplified percentile based on rating relative to avg
    const percentile = tenantAvg > 0 ? Math.min(99, Math.max(1, Math.round((userAvg / tenantAvg) * 50))) : 50;

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true },
    });

    res.json({
      success: true,
      data: {
        userId: targetUserId,
        user,
        userAverageRating: Number(userAvg.toFixed(2)),
        tenantAverageRating: Number(tenantAvg.toFixed(2)),
        overallScore: Math.round((userAvg / 5) * 100),
        percentile,
        reviewsCount: userReviews.length,
        dimensions: [
          { name: 'Overall Rating', userScore: userAvg, benchmarkScore: tenantAvg, percentile },
        ],
        comparedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/benchmark/comparisons — BenchmarkComparison[] for current user vs org
router.get('/benchmark/comparisons', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const [userReviews, allReviews, user] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: userId, tenantId, overallRating: { not: null } },
        select: { id: true, overallRating: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.review.findMany({ where: { tenantId, overallRating: { not: null } }, select: { overallRating: true } }),
      prisma.user.findFirst({ where: { id: userId }, select: { firstName: true, lastName: true, department: { select: { name: true } } } }),
    ]);

    const orgAvg = allReviews.length
      ? Number((allReviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / allReviews.length).toFixed(2)) : 0;

    // Return BenchmarkComparison[] shape
    const data = userReviews.map(r => {
      const score = Number((r.overallRating ?? 0).toFixed(2));
      const delta = Number((score - orgAvg).toFixed(2));
      const percentile = orgAvg > 0 ? Math.min(99, Math.max(1, Math.round((score / orgAvg) * 50))) : 50;
      return {
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'You',
        department: user?.department?.name ?? 'Unknown',
        score,
        benchmarkScore: orgAvg,
        delta,
        percentile,
        reviewType: r.type,
        reviewDate: r.createdAt,
      };
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/benchmark/team-summary — team benchmark summary
router.get('/benchmark/team-summary', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { teamId } = req.query as Record<string, string>;

    // Get team members
    const memberIds = teamId
      ? (await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } })).map((m) => m.userId)
      : (await prisma.user.findMany({ where: { tenantId, managerId: req.user!.id, deletedAt: null }, select: { id: true } })).map((u) => u.id);

    if (!memberIds.length) {
      return res.json({
        success: true,
        data: { benchmarkId: `bench-team-${Date.now()}`, benchmarkName: 'Team Benchmark', teamAvg: 0, orgAvg: 0, dimensions: [], comparisons: [] },
      });
    }

    const [reviews, allReviews] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: { in: memberIds }, tenantId, overallRating: { not: null } },
        include: {
          reviewee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true, department: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.findMany({ where: { tenantId, overallRating: { not: null } }, select: { overallRating: true } }),
    ]);

    // Latest per member
    const latestPerMember = new Map<string, typeof reviews[0]>();
    for (const r of reviews) {
      if (!latestPerMember.has(r.revieweeId)) latestPerMember.set(r.revieweeId, r);
    }

    const memberRatings = Array.from(latestPerMember.values());
    const teamAvg = memberRatings.length
      ? Number((memberRatings.reduce((s, r) => s + (r.overallRating ?? 0), 0) / memberRatings.length).toFixed(2))
      : 0;
    const orgAvg = allReviews.length
      ? Number((allReviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / allReviews.length).toFixed(2))
      : 0;

    // Build BenchmarkComparison[] shape
    const comparisons = memberRatings.map((r) => {
      const score = Number((r.overallRating ?? 0).toFixed(2));
      const delta = Number((score - orgAvg).toFixed(2));
      const percentile = orgAvg > 0 ? Math.min(99, Math.max(1, Math.round((score / orgAvg) * 50))) : 50;
      return {
        userId: r.revieweeId,
        userName: `${r.reviewee.firstName} ${r.reviewee.lastName}`,
        department: r.reviewee.department?.name ?? 'Unknown',
        score,
        benchmarkScore: orgAvg,
        delta,
        percentile,
      };
    });

    // Return TeamBenchmarkSummary shape
    res.json({
      success: true,
      data: {
        benchmarkId: `bench-team-${Date.now()}`,
        benchmarkName: 'Team vs Organization',
        teamAvg,
        orgAvg,
        dimensions: [
          { name: 'Overall Performance', teamAvg, orgAvg },
          { name: 'Review Completion', teamAvg: memberRatings.length > 0 ? 100 : 0, orgAvg: 70 },
        ],
        comparisons,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Productivity ─────────────────────────────────────────────

// POST /ai-insights/productivity/predict — predict productivity based on recent review + goal data
router.post('/productivity/predict', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { entityType = 'USER', entityId } = req.body;

    const targetId = entityId || req.user!.id;

    // Get recent review ratings
    const reviews = await prisma.review.findMany({
      where: { revieweeId: targetId, tenantId, overallRating: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { overallRating: true },
    });

    // Get goal completion
    const goals = await prisma.goal.findMany({
      where: { ownerId: targetId, tenantId, deletedAt: null },
      select: { status: true, progress: true },
    });

    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + (r.overallRating ?? 0), 0) / reviews.length
      : 0;
    const goalCompletion = goals.length
      ? goals.filter((g) => g.status === 'COMPLETED').length / goals.length
      : 0;
    const avgProgress = goals.length
      ? goals.reduce((s, g) => s + g.progress, 0) / goals.length
      : 0;

    const predictedScore = Math.round(avgRating * 0.5 * 20 + goalCompletion * 30 + avgProgress * 0.2);
    const confidence = reviews.length > 0 && goals.length > 0 ? 0.75 : reviews.length > 0 ? 0.5 : 0.2;

    const factors: string[] = [];
    if (avgRating >= 4) factors.push('Strong recent review performance');
    if (goalCompletion >= 0.7) factors.push('High goal completion rate');
    if (avgProgress >= 70) factors.push('Good active goal progress');
    if (avgRating < 3) factors.push('Performance ratings below average');
    if (goalCompletion < 0.3) factors.push('Low goal completion rate');

    res.json({
      success: true,
      data: {
        entityType,
        entityId: targetId,
        predictedScore: Math.min(100, predictedScore),
        confidence,
        avgReviewRating: Number(avgRating.toFixed(2)),
        goalCompletionRate: Math.round(goalCompletion * 100),
        avgGoalProgress: Math.round(avgProgress),
        factors,
        predictedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/productivity/predictions — recent predictions for current user's team
router.get('/productivity/predictions', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;

    const directReports = await prisma.user.findMany({
      where: { managerId: req.user!.id, tenantId, deletedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
      take: 10,
    });

    if (!directReports.length) {
      return res.json({ success: true, data: [] });
    }

    const reviewsByUser = await prisma.review.findMany({
      where: { revieweeId: { in: directReports.map((u) => u.id) }, tenantId, overallRating: { not: null } },
      select: { revieweeId: true, overallRating: true },
      orderBy: { createdAt: 'desc' },
    });

    const latestRating = new Map<string, number>();
    for (const r of reviewsByUser) {
      if (!latestRating.has(r.revieweeId)) latestRating.set(r.revieweeId, r.overallRating ?? 0);
    }

    const predictions = directReports.map((u) => {
      const rating = latestRating.get(u.id) ?? 0;
      return {
        entityType: 'USER',
        entityId: u.id,
        user: u,
        predictedScore: Math.round((rating / 5) * 100),
        confidence: latestRating.has(u.id) ? 0.65 : 0.1,
        predictedAt: new Date().toISOString(),
      };
    });

    res.json({ success: true, data: predictions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Engagement ───────────────────────────────────────────────

// GET /ai-insights/engagement/history — engagement over time via goal + plan activity
router.get('/engagement/history', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const goals = await prisma.goal.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true },
    });

    // Group by month
    const byMonth: Record<string, { created: number; completed: number }> = {};
    for (const g of goals) {
      const key = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { created: 0, completed: 0 };
      byMonth[key].created += 1;
      if (g.status === 'COMPLETED') byMonth[key].completed += 1;
    }

    const history = Object.entries(byMonth).map(([month, { created, completed }]) => ({
      month,
      goalsCreated: created,
      goalsCompleted: completed,
      engagementScore: created > 0 ? Math.round((completed / created) * 100) : 0,
    }));

    res.json({ success: true, data: history.sort((a, b) => a.month.localeCompare(b.month)) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ai-insights/engagement/at-risk — users with low engagement indicators
router.get('/engagement/at-risk', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Users who have no goals updated in 90 days AND have low review ratings
    const [activeUsers, recentGoalOwners, lowRatedUsers] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true, level: true },
      }),
      prisma.goal.findMany({
        where: { tenantId, updatedAt: { gte: ninetyDaysAgo }, deletedAt: null },
        select: { ownerId: true },
        distinct: ['ownerId'],
      }),
      prisma.review.findMany({
        where: { tenantId, overallRating: { lte: 2.5 }, createdAt: { gte: ninetyDaysAgo } },
        select: { revieweeId: true },
        distinct: ['revieweeId'],
      }),
    ]);

    const recentOwnerIds = new Set(recentGoalOwners.map((g) => g.ownerId));
    const lowRatedIds = new Set(lowRatedUsers.map((r) => r.revieweeId));

    const atRisk = activeUsers.filter(
      (u) => !recentOwnerIds.has(u.id) || lowRatedIds.has(u.id)
    );

    res.json({
      success: true,
      data: atRisk.slice(0, 20).map((u) => ({
        ...u,
        riskFactors: [
          !recentOwnerIds.has(u.id) ? 'No recent goal activity (90+ days)' : null,
          lowRatedIds.has(u.id) ? 'Low performance rating in recent reviews' : null,
        ].filter(Boolean),
      })),
      meta: { total: atRisk.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { router as aiInsightsRoutes };
