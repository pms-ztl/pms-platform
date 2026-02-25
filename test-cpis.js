const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const { calculateCPIS } = require('./packages/core/dist/math-engine');

(async () => {
  const users = await p.user.findMany({
    where: { tenantId: 'cbd87cec-52e8-406d-9fae-5a43a6449c73', isActive: true, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, hireDate: true, level: true, tenantId: true },
  });

  for (const u of users) {
    const goals = await p.goal.findMany({
      where: { ownerId: u.id, deletedAt: null, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { id: true, progress: true, weight: true, priority: true, type: true, status: true, dueDate: true, completedAt: true, alignments: { select: { id: true } }, progressUpdates: { select: { newProgress: true, previousProgress: true, createdAt: true }, orderBy: { createdAt: 'asc' } } },
    });
    const reviews = await p.review.findMany({
      where: { revieweeId: u.id, deletedAt: null, overallRating: { not: null } },
      select: { overallRating: true, type: true, reviewerId: true, biasScore: true },
    });
    const feedbacks = await p.feedback.findMany({
      where: { toUserId: u.id, deletedAt: null },
      select: { sentimentScore: true, type: true, createdAt: true, skillTags: true, valueTags: true },
      orderBy: { createdAt: 'asc' },
    });
    const fbGiven = await p.feedback.count({ where: { fromUserId: u.id, tenantId: u.tenantId, deletedAt: null } });
    const oneOnOnes = await p.oneOnOne.count({ where: { tenantId: u.tenantId, deletedAt: null, status: 'COMPLETED', OR: [{ managerId: u.id }, { employeeId: u.id }] } });
    const recGiven = await p.feedback.count({ where: { fromUserId: u.id, tenantId: u.tenantId, deletedAt: null, type: { in: ['RECOGNITION', 'PRAISE'] } } });

    const now = new Date();
    const tenure = u.hireDate ? (now.getTime() - new Date(u.hireDate).getTime()) / (365.25 * 86400000) : 1;

    const input = {
      goals: goals.map(g => ({ id: g.id, progress: g.progress, weight: g.weight, priority: g.priority || 'MEDIUM', type: g.type, status: g.status, daysLate: 0, complexity: 4, alignmentDepth: g.alignments.length })),
      reviews: reviews.map(r => ({ rating: r.overallRating, type: r.type, reviewerTrust: 50 })),
      feedbacks: feedbacks.filter(f => f.sentimentScore !== null).map((f, i, a) => ({ sentimentScore: f.sentimentScore, type: f.type, recency: a.length > 1 ? i / (a.length - 1) : 1, hasSkillTags: false, hasValueTags: false })),
      collaboration: { crossFunctionalGoals: goals.filter(g => g.alignments.length > 0).length, feedbackGivenCount: fbGiven, feedbackReceivedCount: feedbacks.length, oneOnOneCount: oneOnOnes, recognitionsGiven: recGiven, teamGoalContributions: goals.filter(g => g.type !== 'INDIVIDUAL').length },
      consistency: { onTimeDeliveryRate: 0.75, goalVelocityVariance: 5, streakDays: 0, reviewRatingStdDev: 1, missedDeadlines: 0, totalDeadlines: 0 },
      growth: { historicalScores: [], skillProgressions: 0, trainingsCompleted: 0, developmentPlanProgress: 0, promotionReadiness: 0 },
      evidence: { totalEvidence: 0, verifiedEvidence: 0, avgImpactScore: 0, avgQualityScore: 0, evidenceTypes: 0 },
      initiative: { innovationContributions: 0, mentoringSessions: 0, knowledgeSharing: 0, processImprovements: 0, voluntaryGoals: 0 },
      tenureYears: Math.max(0.1, tenure),
      level: u.level || 3,
    };

    const collabSum = input.collaboration.crossFunctionalGoals + input.collaboration.feedbackGivenCount + input.collaboration.feedbackReceivedCount + input.collaboration.oneOnOneCount + input.collaboration.recognitionsGiven + input.collaboration.teamGoalContributions;
    console.log(`  [DEBUG] collab: crossFunc=${input.collaboration.crossFunctionalGoals} fbGiven=${input.collaboration.feedbackGivenCount} fbRecv=${input.collaboration.feedbackReceivedCount} 1on1=${input.collaboration.oneOnOneCount} rec=${input.collaboration.recognitionsGiven} teamGoals=${input.collaboration.teamGoalContributions} TOTAL=${collabSum}`);
    console.log(`  [DEBUG] tenure=${tenure.toFixed(2)} years, goals=${goals.length}, reviews=${reviews.length}, feedbacks=${feedbacks.length}`);
    const r = calculateCPIS(input);
    console.log(`${u.firstName} ${u.lastName} | Score: ${r.score} | Grade: ${r.grade} | Stars: ${r.starRating} | Rank: ${r.rankLabel}`);
    r.dimensions.forEach(d => console.log(`  ${d.code} raw:${d.rawScore} wt:${d.weightedScore} grade:${d.grade}`));
    console.log();
  }
  process.exit(0);
})();
