import { Router } from 'express';
import { prisma } from '@pms/database';
import { authenticate } from '../../middleware/authenticate';
import type { AuthenticatedRequest } from '../../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = Router();

router.use(authenticate);

// GET /teams/my — teams where the current user is a member (before /:id)
router.get('/my', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const memberships = await prisma.teamMember.findMany({
      where: { userId, team: { tenantId, deletedAt: null, isActive: true } },
      include: {
        team: {
          include: {
            lead: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            department: { select: { id: true, name: true } },
            _count: { select: { members: true, goals: true } },
          },
        },
      },
      orderBy: { team: { name: 'asc' } },
    });

    const data = memberships.map((m) => ({
      ...m.team,
      memberRole: m.role,
      allocation: m.allocation,
      isPrimary: m.isPrimary,
    }));

    res.json({ success: true, data, meta: { total: data.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /teams — list all teams in tenant
router.get('/', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { page = '1', limit = '20', type, departmentId, search } = req.query as Record<string, string>;

    const where: any = { tenantId, deletedAt: null, isActive: true };
    if (type) where.type = type;
    if (departmentId) where.departmentId = departmentId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          department: { select: { id: true, name: true } },
          _count: { select: { members: true, goals: true } },
        },
        orderBy: { name: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.team.count({ where }),
    ]);

    res.json({
      success: true,
      data: teams,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /teams/:id — single team with members
router.get('/:id', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    if (!UUID_RE.test(id)) return res.status(404).json({ success: false, error: 'Team not found' });

    const team = await prisma.team.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, jobTitle: true } },
        department: { select: { id: true, name: true } },
        businessUnit: { select: { id: true, name: true } },
        parentTeam: { select: { id: true, name: true, code: true } },
        childTeams: { select: { id: true, name: true, code: true, type: true } },
        members: {
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true, email: true,
                avatarUrl: true, jobTitle: true, level: true,
              },
            },
          },
        },
        _count: { select: { goals: true, members: true, milestones: true } },
      },
    });

    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    res.json({ success: true, data: team });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /teams/:id/members
router.get('/:id/members', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { id: teamId } = req.params;

    if (!UUID_RE.test(teamId)) return res.status(404).json({ success: false, error: 'Team not found' });
    const team = await prisma.team.findFirst({ where: { id: teamId, tenantId, deletedAt: null } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            avatarUrl: true, jobTitle: true, level: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { user: { firstName: 'asc' } }],
    });

    res.json({ success: true, data: members, meta: { total: members.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /teams/:id/goals
router.get('/:id/goals', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { id: teamId } = req.params;
    const { status } = req.query as Record<string, string>;

    if (!UUID_RE.test(teamId)) return res.status(404).json({ success: false, error: 'Team not found' });
    const team = await prisma.team.findFirst({ where: { id: teamId, tenantId, deletedAt: null } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const where: any = { teamId, tenantId, deletedAt: null };
    if (status) where.status = status;

    const goals = await prisma.goal.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json({ success: true, data: goals, meta: { total: goals.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /teams/:id/analytics
router.get('/:id/analytics', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const { id: teamId } = req.params;

    if (!UUID_RE.test(teamId)) return res.status(404).json({ success: false, error: 'Team not found' });
    const team = await prisma.team.findFirst({
      where: { id: teamId, tenantId, deletedAt: null },
      include: { _count: { select: { members: true, goals: true } } },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const memberIds = (
      await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } })
    ).map((m) => m.userId);

    const goals = await prisma.goal.findMany({
      where: { teamId, tenantId, deletedAt: null },
      select: { status: true, progress: true, priority: true },
    });

    const completedGoals = goals.filter((g) => g.status === 'COMPLETED').length;
    const goalCompletionRate = goals.length ? Math.round((completedGoals / goals.length) * 100) : 0;
    const avgGoalProgress = goals.length
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0;

    const reviews = memberIds.length
      ? await prisma.review.findMany({
          where: { revieweeId: { in: memberIds }, tenantId, overallRating: { not: null } },
          select: { revieweeId: true, overallRating: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const latestByMember = new Map<string, number>();
    for (const r of reviews) {
      if (!latestByMember.has(r.revieweeId) && r.overallRating != null) {
        latestByMember.set(r.revieweeId, r.overallRating);
      }
    }
    const ratingValues = Array.from(latestByMember.values());
    const averagePerformance = ratingValues.length
      ? Number((ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: {
        teamId,
        teamName: team.name,
        memberCount: team._count.members,
        totalGoals: team._count.goals,
        completedGoals,
        goalCompletionRate,
        avgGoalProgress,
        averagePerformance,
        membersWithReviews: ratingValues.length,
        goalsByStatus: {
          DRAFT: goals.filter((g) => g.status === 'DRAFT').length,
          ACTIVE: goals.filter((g) => g.status === 'ACTIVE').length,
          COMPLETED: goals.filter((g) => g.status === 'COMPLETED').length,
          ON_HOLD: goals.filter((g) => g.status === 'ON_HOLD').length,
          CANCELLED: goals.filter((g) => g.status === 'CANCELLED').length,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { router as teamsRoutes };
