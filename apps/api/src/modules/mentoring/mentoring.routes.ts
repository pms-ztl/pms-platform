import { Router } from 'express';
import { prisma } from '@pms/database';
import { authenticate } from '../../middleware/authenticate';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// GET /mentoring/matches — potential mentor candidates with compatibility scores
router.get('/matches', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const currentUser = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { level: true, department: { select: { name: true } } },
    });

    // Potential mentors: senior users (higher level or L5+) excluding self
    const potentialMentors = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        id: { not: userId },
        level: { gte: 5 },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        level: true,
        createdAt: true,
        department: { select: { name: true } },
      },
      orderBy: { level: 'desc' },
      take: 20,
    });

    const userLevel = currentUser?.level ?? 1;
    const userDept = currentUser?.department?.name ?? '';

    const matches = potentialMentors.map((mentor) => {
      const deptMatch = mentor.department?.name === userDept;
      const levelDiff = (mentor.level ?? 5) - userLevel;
      const compatibilityBase = Math.min(95, 50 + levelDiff * 8 + (deptMatch ? 15 : 0));
      const compatibilityScore = Math.max(30, compatibilityBase - Math.floor(Math.random() * 10));

      const yearsExperience = Math.max(
        1,
        new Date().getFullYear() - new Date(mentor.createdAt).getFullYear() + (mentor.level ?? 5) - 1,
      );

      // Derive skill sets from job title keywords
      const titleWords = (mentor.jobTitle ?? '').toLowerCase().split(/\s+/);
      const sharedSkills: string[] = [];
      const complementarySkills: string[] = [];
      if (titleWords.some((w) => ['senior', 'lead', 'principal'].includes(w))) {
        sharedSkills.push('Technical Leadership');
      }
      if (titleWords.some((w) => ['engineer', 'developer', 'architect'].includes(w))) {
        sharedSkills.push('Software Engineering');
        complementarySkills.push('System Design');
      }
      if (titleWords.some((w) => ['manager', 'director', 'head'].includes(w))) {
        complementarySkills.push('People Management', 'Strategic Planning');
      }
      if (sharedSkills.length === 0) sharedSkills.push('Professional Development');
      if (complementarySkills.length === 0) complementarySkills.push('Career Growth');

      return {
        id: mentor.id,
        firstName: mentor.firstName,
        lastName: mentor.lastName,
        jobTitle: mentor.jobTitle ?? null,
        department: mentor.department?.name ?? null,
        avatarUrl: mentor.avatarUrl ?? null,
        compatibilityScore,
        sharedSkills,
        complementarySkills,
        yearsExperience,
      };
    });

    // Sort by compatibility score descending
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json({ success: true, data: matches, meta: { total: matches.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /mentoring/my-mentorships — flat list of active mentoring relationships
router.get('/my-mentorships', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const [asMentor, asMentee] = await Promise.all([
      prisma.developmentPlan.findMany({
        where: { tenantId, mentorAssigned: userId, status: { not: 'CANCELLED' } },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, jobTitle: true, avatarUrl: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.developmentPlan.findMany({
        where: { tenantId, userId, mentorAssigned: { not: null }, status: { not: 'CANCELLED' } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const mentorIds = asMentee.map((p) => p.mentorAssigned).filter(Boolean) as string[];
    const mentors = mentorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mentorIds } },
          select: { id: true, firstName: true, lastName: true, jobTitle: true, avatarUrl: true },
        })
      : [];
    const mentorMap = new Map(mentors.map((m) => [m.id, m]));

    const currentUser = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { firstName: true, lastName: true, jobTitle: true, avatarUrl: true },
    });

    const statusMap: Record<string, 'active' | 'completed' | 'paused'> = {
      ACTIVE: 'active',
      COMPLETED: 'completed',
      ON_HOLD: 'paused',
      DRAFT: 'paused',
    };

    const mentorships: any[] = [
      ...asMentor.map((p) => ({
        id: p.id,
        mentorId: userId,
        menteeId: p.userId,
        mentor: {
          firstName: currentUser?.firstName ?? '',
          lastName: currentUser?.lastName ?? '',
          jobTitle: currentUser?.jobTitle ?? null,
          avatarUrl: currentUser?.avatarUrl ?? null,
        },
        mentee: {
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          jobTitle: p.user.jobTitle ?? null,
          avatarUrl: p.user.avatarUrl ?? null,
        },
        status: statusMap[p.status] ?? 'active',
        startedAt: (p.startDate ?? p.createdAt).toISOString(),
        focusAreas: Array.isArray(p.developmentAreas) ? (p.developmentAreas as string[]) : [],
      })),
      ...asMentee.map((p) => {
        const mentor = p.mentorAssigned ? mentorMap.get(p.mentorAssigned) : null;
        return {
          id: p.id,
          mentorId: p.mentorAssigned ?? '',
          menteeId: userId,
          mentor: mentor
            ? {
                firstName: mentor.firstName,
                lastName: mentor.lastName,
                jobTitle: mentor.jobTitle ?? null,
                avatarUrl: mentor.avatarUrl ?? null,
              }
            : { firstName: 'Unknown', lastName: 'Mentor', jobTitle: null, avatarUrl: null },
          mentee: {
            firstName: currentUser?.firstName ?? '',
            lastName: currentUser?.lastName ?? '',
            jobTitle: currentUser?.jobTitle ?? null,
            avatarUrl: currentUser?.avatarUrl ?? null,
          },
          status: statusMap[p.status] ?? 'active',
          startedAt: (p.startDate ?? p.createdAt).toISOString(),
          focusAreas: Array.isArray(p.developmentAreas) ? (p.developmentAreas as string[]) : [],
        };
      }),
    ];

    res.json({ success: true, data: mentorships, meta: { total: mentorships.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /mentoring/learning-path — flat list of learning activities as LearningPathItem[]
router.get('/learning-path', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const activities = await prisma.developmentActivity.findMany({
      where: { tenantId, userId, status: { not: 'CANCELLED' } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const typeMap: Record<string, LearningPathType> = {
      COURSE: 'course',
      PROJECT: 'project',
      MENTORING: 'mentorship',
      CERTIFICATION: 'certification',
      READING: 'book',
      WORKSHOP: 'course',
      CONFERENCE: 'course',
      ON_THE_JOB: 'project',
      COACHING: 'mentorship',
      SELF_STUDY: 'book',
    };

    const statusMap: Record<string, LearningPathStatus> = {
      NOT_STARTED: 'not_started',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      ON_HOLD: 'not_started',
      CANCELLED: 'not_started',
    };

    const items = activities.map((a) => ({
      id: a.id,
      title: a.title,
      type: typeMap[a.activityType] ?? 'course',
      status: statusMap[a.status] ?? 'not_started',
      estimatedHours: a.estimatedHours ? Number(a.estimatedHours) : 1,
      targetSkill:
        Array.isArray(a.targetSkills) && (a.targetSkills as string[]).length > 0
          ? (a.targetSkills as string[])[0]
          : a.title,
    }));

    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /mentoring/sessions — mentoring activities (DevelopmentActivity with MENTORING type)
router.get('/sessions', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const sessions = await prisma.developmentActivity.findMany({
      where: { tenantId, userId, activityType: 'MENTORING' },
      include: {
        developmentPlan: {
          select: { id: true, planName: true, careerGoal: true, mentorAssigned: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const mentorIds = sessions
      .map((s) => s.developmentPlan.mentorAssigned)
      .filter(Boolean) as string[];
    const mentors = mentorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mentorIds } },
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, jobTitle: true },
        })
      : [];
    const mentorMap = new Map(mentors.map((m) => [m.id, m]));

    res.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        startDate: s.startDate,
        dueDate: s.dueDate,
        completionDate: s.completionDate,
        actualHours: s.actualHours ? Number(s.actualHours) : null,
        estimatedHours: s.estimatedHours ? Number(s.estimatedHours) : null,
        progress: Number(s.progressPercentage),
        rating: s.rating,
        feedback: s.feedback,
        plan: s.developmentPlan,
        mentor: s.developmentPlan.mentorAssigned
          ? mentorMap.get(s.developmentPlan.mentorAssigned) ?? null
          : null,
      })),
      meta: { total: sessions.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /mentoring/request — request a mentorship (creates a MENTORING development activity)
router.post('/request', async (request, res) => {
  const req = request as AuthenticatedRequest;
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { mentorId, focusAreas = [], message, planId } = req.body;

    if (!mentorId) {
      return res.status(400).json({ success: false, error: 'mentorId is required' });
    }

    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, tenantId },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, avatarUrl: true },
    });
    if (!mentor) return res.status(404).json({ success: false, error: 'Mentor not found' });

    const currentUser = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { firstName: true, lastName: true, jobTitle: true, avatarUrl: true },
    });

    let targetPlanId = planId;
    if (!targetPlanId) {
      const existingPlan = await prisma.developmentPlan.findFirst({
        where: { tenantId, userId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      if (existingPlan) {
        targetPlanId = existingPlan.id;
        await prisma.developmentPlan.update({
          where: { id: existingPlan.id },
          data: { mentorAssigned: mentorId },
        });
      } else {
        const newPlan = await prisma.developmentPlan.create({
          data: {
            tenantId,
            userId,
            planName: 'Mentorship Development Plan',
            planType: 'SKILL_DEVELOPMENT',
            duration: 6,
            startDate: new Date(),
            targetCompletionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            careerGoal: (focusAreas as string[]).join(', ') || 'Professional development through mentorship',
            currentLevel: req.user!.level?.toString() ?? 'L1',
            mentorAssigned: mentorId,
            status: 'ACTIVE',
            generatedBy: 'MANUAL',
          },
        });
        targetPlanId = newPlan.id;
      }
    }

    const plan = await prisma.developmentPlan.findFirst({
      where: { id: targetPlanId, tenantId },
    });

    const statusMap: Record<string, 'active' | 'completed' | 'paused'> = {
      ACTIVE: 'active',
      COMPLETED: 'completed',
      ON_HOLD: 'paused',
      DRAFT: 'paused',
    };

    // Return as Mentorship shape
    res.status(201).json({
      success: true,
      data: {
        id: targetPlanId,
        mentorId,
        menteeId: userId,
        mentor: {
          firstName: mentor.firstName,
          lastName: mentor.lastName,
          jobTitle: mentor.jobTitle ?? null,
          avatarUrl: mentor.avatarUrl ?? null,
        },
        mentee: {
          firstName: currentUser?.firstName ?? '',
          lastName: currentUser?.lastName ?? '',
          jobTitle: currentUser?.jobTitle ?? null,
          avatarUrl: currentUser?.avatarUrl ?? null,
        },
        status: plan ? (statusMap[plan.status] ?? 'active') : 'active',
        startedAt: plan?.startDate?.toISOString() ?? new Date().toISOString(),
        focusAreas: focusAreas as string[],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

type LearningPathType = 'course' | 'project' | 'mentorship' | 'certification' | 'book';
type LearningPathStatus = 'not_started' | 'in_progress' | 'completed';

export { router as mentoringRoutes };
