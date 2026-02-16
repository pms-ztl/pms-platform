import { prisma } from '@pms/database';

class SkillsService {
  // ─── Skill Categories ───────────────────────────────────────────────

  async listCategories(tenantId: string) {
    return prisma.skillCategory.findMany({
      where: { tenantId, deletedAt: null },
      include: { children: true, parent: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, data: {
    name: string;
    description?: string;
    parentCategoryId?: string;
    categoryType?: string;
  }) {
    return prisma.skillCategory.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        categoryType: data.categoryType || 'TECHNICAL',
        parentId: data.parentCategoryId,
      },
    });
  }

  async updateCategory(tenantId: string, id: string, data: {
    name?: string;
    description?: string;
    parentCategoryId?: string;
    categoryType?: string;
  }) {
    return prisma.skillCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.categoryType !== undefined && { categoryType: data.categoryType }),
        ...(data.parentCategoryId !== undefined && { parentId: data.parentCategoryId }),
      },
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    return prisma.skillCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findCategoryIdByName(tenantId: string, name: string): Promise<string | undefined> {
    const category = await prisma.skillCategory.findFirst({
      where: { tenantId, name, deletedAt: null },
      select: { id: true },
    });
    return category?.id;
  }

  // ─── Skill Assessments ──────────────────────────────────────────────

  async listAssessments(tenantId: string, params: {
    userId?: string;
    skillCategoryId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, deletedAt: null };
    if (params.userId) where.userId = params.userId;
    if (params.skillCategoryId) where.skillCategoryId = params.skillCategoryId;
    if (params.status) where.skillLevel = params.status;

    const [data, total] = await Promise.all([
      prisma.technicalSkillAssessment.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, department: true },
          },
          skillCategory: true,
        },
        orderBy: { lastAssessedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.technicalSkillAssessment.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createAssessment(tenantId: string, data: {
    userId: string;
    skillCategoryId: string;
    skillName: string;
    currentLevel?: string;
    targetLevel?: string;
    selfRating?: number;
    managerRating?: number;
    evidenceNotes?: string;
    assessmentDate?: string;
    assessmentCycleId?: string;
  }) {
    const selfAssessment = data.selfRating != null ? data.selfRating : null;
    const managerAssessment = data.managerRating != null ? data.managerRating : null;

    // Compute a simple final score from available ratings
    const scores = [selfAssessment, managerAssessment].filter((s): s is number => s != null);
    const finalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return prisma.technicalSkillAssessment.create({
      data: {
        tenantId,
        userId: data.userId,
        skillCategoryId: data.skillCategoryId,
        skillName: data.skillName,
        skillLevel: data.currentLevel || 'BEGINNER',
        selfAssessment,
        managerAssessment,
        finalScore,
        improvementPlan: data.evidenceNotes,
        lastAssessedAt: data.assessmentDate ? new Date(data.assessmentDate) : new Date(),
        assessmentCycleId: data.assessmentCycleId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        skillCategory: true,
      },
    });
  }

  async updateAssessment(tenantId: string, id: string, data: {
    skillName?: string;
    currentLevel?: string;
    targetLevel?: string;
    selfRating?: number;
    managerRating?: number;
    evidenceNotes?: string;
    assessmentDate?: string;
  }) {
    const updateData: any = {};
    if (data.skillName !== undefined) updateData.skillName = data.skillName;
    if (data.currentLevel !== undefined) updateData.skillLevel = data.currentLevel;
    if (data.selfRating !== undefined) updateData.selfAssessment = data.selfRating;
    if (data.managerRating !== undefined) updateData.managerAssessment = data.managerRating;
    if (data.evidenceNotes !== undefined) updateData.improvementPlan = data.evidenceNotes;
    if (data.assessmentDate !== undefined) updateData.lastAssessedAt = new Date(data.assessmentDate);

    // Recompute final score if ratings changed
    if (data.selfRating !== undefined || data.managerRating !== undefined) {
      const existing = await prisma.technicalSkillAssessment.findFirst({ where: { id, tenantId } });
      if (existing) {
        const self = data.selfRating !== undefined ? data.selfRating : Number(existing.selfAssessment || 0);
        const manager = data.managerRating !== undefined ? data.managerRating : Number(existing.managerAssessment || 0);
        const scores = [self, manager].filter((s) => s > 0);
        updateData.finalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      }
    }

    return prisma.technicalSkillAssessment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        skillCategory: true,
      },
    });
  }

  // ─── Skill Matrix Views ─────────────────────────────────────────────

  async getUserSkillMatrix(tenantId: string, userId: string) {
    const assessments = await prisma.technicalSkillAssessment.findMany({
      where: { tenantId, userId, deletedAt: null },
      include: {
        skillCategory: true,
        progressHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { skillName: 'asc' },
    });

    // Group by category
    const categoryMap = new Map<string, { category: any; skills: any[] }>();
    for (const assessment of assessments) {
      const catId = assessment.skillCategoryId;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category: assessment.skillCategory,
          skills: [],
        });
      }
      categoryMap.get(catId)!.skills.push({
        id: assessment.id,
        skillName: assessment.skillName,
        skillLevel: assessment.skillLevel,
        selfAssessment: assessment.selfAssessment ? Number(assessment.selfAssessment) : null,
        managerAssessment: assessment.managerAssessment ? Number(assessment.managerAssessment) : null,
        finalScore: Number(assessment.finalScore),
        lastAssessedAt: assessment.lastAssessedAt,
        improvementPlan: assessment.improvementPlan,
        progressHistory: assessment.progressHistory || [],
      });
    }

    const matrix = Array.from(categoryMap.values());

    // Compute summary stats
    const allScores = assessments.map((a) => Number(a.finalScore));
    const avgScore = allScores.length > 0 ? allScores.reduce((s, v) => s + v, 0) / allScores.length : 0;

    return {
      userId,
      totalSkills: assessments.length,
      averageScore: Math.round(avgScore * 100) / 100,
      categories: matrix,
    };
  }

  async getTeamSkillMatrix(tenantId: string, managerId: string) {
    // Get direct reports
    const directReports = await prisma.user.findMany({
      where: { tenantId, managerId, isActive: true, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
    });

    const userIds = directReports.map((u) => u.id);

    // Get all assessments for team members
    const assessments = await prisma.technicalSkillAssessment.findMany({
      where: { tenantId, userId: { in: userIds }, deletedAt: null },
      include: { skillCategory: true },
      orderBy: { skillName: 'asc' },
    });

    // Build per-member summaries
    const memberSummaries = directReports.map((member) => {
      const memberAssessments = assessments.filter((a) => a.userId === member.id);
      const scores = memberAssessments.map((a) => Number(a.finalScore));
      const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;

      // Category breakdown
      const catMap = new Map<string, { name: string; avgScore: number; count: number }>();
      for (const a of memberAssessments) {
        const existing = catMap.get(a.skillCategoryId);
        if (existing) {
          existing.avgScore = (existing.avgScore * existing.count + Number(a.finalScore)) / (existing.count + 1);
          existing.count++;
        } else {
          catMap.set(a.skillCategoryId, {
            name: a.skillCategory.name,
            avgScore: Number(a.finalScore),
            count: 1,
          });
        }
      }

      return {
        user: member,
        totalSkills: memberAssessments.length,
        averageScore: Math.round(avgScore * 100) / 100,
        categories: Array.from(catMap.values()).map((c) => ({
          name: c.name,
          averageScore: Math.round(c.avgScore * 100) / 100,
          skillCount: c.count,
        })),
      };
    });

    // Team-wide category averages
    const teamCatMap = new Map<string, { name: string; totalScore: number; count: number }>();
    for (const a of assessments) {
      const existing = teamCatMap.get(a.skillCategoryId);
      if (existing) {
        existing.totalScore += Number(a.finalScore);
        existing.count++;
      } else {
        teamCatMap.set(a.skillCategoryId, {
          name: a.skillCategory.name,
          totalScore: Number(a.finalScore),
          count: 1,
        });
      }
    }

    const teamCategoryAverages = Array.from(teamCatMap.values()).map((c) => ({
      category: c.name,
      averageScore: Math.round((c.totalScore / c.count) * 100) / 100,
      assessmentCount: c.count,
    }));

    return {
      managerId,
      teamSize: directReports.length,
      members: memberSummaries,
      teamCategoryAverages,
    };
  }

  // ─── Progress Tracking ──────────────────────────────────────────────

  async addProgressEntry(tenantId: string, assessmentId: string, data: {
    previousScore: number;
    newScore: number;
    changeReason?: string;
    notes?: string;
    assessedBy?: string;
  }) {
    // Verify the assessment belongs to this tenant
    const assessment = await prisma.technicalSkillAssessment.findFirst({
      where: { id: assessmentId, tenantId },
    });
    if (!assessment) throw new Error('Assessment not found');

    const entry = await prisma.skillProgressHistory.create({
      data: {
        assessmentId,
        previousScore: data.previousScore,
        newScore: data.newScore,
        changeReason: data.changeReason,
        notes: data.notes,
        assessedBy: data.assessedBy,
      },
    });

    // Update the assessment's final score to the new score
    await prisma.technicalSkillAssessment.update({
      where: { id: assessmentId },
      data: { finalScore: data.newScore, lastAssessedAt: new Date() },
    });

    return entry;
  }

  // ─── Skill Gap Analysis ─────────────────────────────────────────────

  async getSkillGaps(tenantId: string, params: {
    departmentId?: string;
    jobTitle?: string;
    skillCategoryId?: string;
  } = {}) {
    // Build user filter based on department/role
    const userWhere: any = { tenantId, isActive: true, deletedAt: null };
    if (params.departmentId) userWhere.departmentId = params.departmentId;
    if (params.jobTitle) userWhere.jobTitle = { contains: params.jobTitle, mode: 'insensitive' };

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, firstName: true, lastName: true, jobTitle: true, department: true },
    });

    const userIds = users.map((u) => u.id);

    const assessmentWhere: any = { tenantId, userId: { in: userIds }, deletedAt: null };
    if (params.skillCategoryId) assessmentWhere.skillCategoryId = params.skillCategoryId;

    const assessments = await prisma.technicalSkillAssessment.findMany({
      where: assessmentWhere,
      include: {
        skillCategory: true,
        user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, department: true } },
      },
    });

    // Identify gaps: skills where finalScore < a threshold (e.g. 3.0 on a 5-point scale)
    // or where skillLevel is BEGINNER/INTERMEDIATE vs expected ADVANCED/EXPERT
    const levelRanking: Record<string, number> = {
      BEGINNER: 1,
      INTERMEDIATE: 2,
      ADVANCED: 3,
      EXPERT: 4,
    };

    const gaps = assessments
      .filter((a) => {
        const score = Number(a.finalScore);
        const levelRank = levelRanking[a.skillLevel] || 1;
        // Gap: low score or low skill level
        return score < 3.0 || levelRank < 3;
      })
      .map((a) => ({
        assessmentId: a.id,
        user: a.user,
        skillName: a.skillName,
        category: a.skillCategory.name,
        currentLevel: a.skillLevel,
        finalScore: Number(a.finalScore),
        gapSeverity: Number(a.finalScore) < 2.0 ? 'CRITICAL' : Number(a.finalScore) < 3.0 ? 'MODERATE' : 'MINOR',
      }));

    // Summary by category
    const categorySummary = new Map<string, { category: string; gapCount: number; avgScore: number; totalScore: number }>();
    for (const g of gaps) {
      const existing = categorySummary.get(g.category);
      if (existing) {
        existing.gapCount++;
        existing.totalScore += g.finalScore;
        existing.avgScore = existing.totalScore / existing.gapCount;
      } else {
        categorySummary.set(g.category, {
          category: g.category,
          gapCount: 1,
          avgScore: g.finalScore,
          totalScore: g.finalScore,
        });
      }
    }

    return {
      totalGaps: gaps.length,
      gaps: gaps.sort((a, b) => a.finalScore - b.finalScore),
      categorySummary: Array.from(categorySummary.values()).map(({ totalScore, ...rest }) => ({
        ...rest,
        avgScore: Math.round(rest.avgScore * 100) / 100,
      })),
    };
  }

  // ─── Org Skill Heatmap ──────────────────────────────────────────────

  async getOrgSkillHeatmap(tenantId: string) {
    // Get all departments
    const departments = await prisma.department.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { id: true, name: true },
    });

    // Get all skill categories
    const categories = await prisma.skillCategory.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
    });

    // Get all assessments with user department info
    const assessments = await prisma.technicalSkillAssessment.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        user: { select: { id: true, departmentId: true } },
        skillCategory: { select: { id: true, name: true } },
      },
    });

    // Build heatmap: department x category -> avg score
    const heatmap: Array<{
      departmentId: string;
      departmentName: string;
      categoryId: string;
      categoryName: string;
      averageScore: number;
      assessmentCount: number;
    }> = [];

    for (const dept of departments) {
      for (const cat of categories) {
        const matching = assessments.filter(
          (a) => a.user.departmentId === dept.id && a.skillCategoryId === cat.id
        );

        if (matching.length > 0) {
          const avgScore = matching.reduce((sum, a) => sum + Number(a.finalScore), 0) / matching.length;
          heatmap.push({
            departmentId: dept.id,
            departmentName: dept.name,
            categoryId: cat.id,
            categoryName: cat.name,
            averageScore: Math.round(avgScore * 100) / 100,
            assessmentCount: matching.length,
          });
        } else {
          heatmap.push({
            departmentId: dept.id,
            departmentName: dept.name,
            categoryId: cat.id,
            categoryName: cat.name,
            averageScore: 0,
            assessmentCount: 0,
          });
        }
      }
    }

    return {
      departments: departments.map((d) => ({ id: d.id, name: d.name })),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      heatmap,
    };
  }

  // ─── Assessment Request ──────────────────────────────────────────────

  async requestManagerAssessment(tenantId: string, userId: string, assessmentId: string) {
    // Verify the assessment belongs to this user and tenant
    const assessment = await prisma.technicalSkillAssessment.findFirst({
      where: { id: assessmentId, tenantId, userId },
      include: { skillCategory: true },
    });
    if (!assessment) throw new Error('Assessment not found');

    // Find the user's manager
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, firstName: true, lastName: true, managerId: true },
    });
    if (!user?.managerId) throw new Error('No manager assigned');

    // Create a notification for the manager
    try {
      await prisma.notification.create({
        data: {
          tenantId,
          userId: user.managerId,
          type: 'SKILL_ASSESSMENT_REQUEST',
          title: 'Skill Assessment Request',
          body: `${user.firstName} ${user.lastName} has requested a manager assessment for "${assessment.skillName}"`,
          data: {
            assessmentId: assessment.id,
            requestedBy: userId,
            skillName: assessment.skillName,
            category: assessment.skillCategory?.name,
          } as any,
          channel: 'in_app',
        },
      });
    } catch {
      // Notification creation is best-effort; don't fail the request
    }

    return { success: true };
  }
}

export const skillsService = new SkillsService();
