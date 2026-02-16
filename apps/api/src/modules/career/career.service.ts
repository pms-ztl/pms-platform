import { prisma } from '@pms/database';
import { MS_PER_DAY } from '../../utils/constants';

class CareerService {
  /**
   * Build career path data for a user: current position, previous roles, next roles, lateral moves
   */
  async getCareerPath(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        departmentId: true,
        hireDate: true,
        department: { select: { name: true } },
      },
    });

    if (!user) throw new Error('User not found');

    // Get user's skills from technical assessments
    const skills = await prisma.technicalSkillAssessment.findMany({
      where: { userId, tenantId, deletedAt: null },
      select: {
        skillName: true,
        skillLevel: true,
        finalScore: true,
      },
      take: 10,
      orderBy: { finalScore: 'desc' },
    });

    // Get latest review for performance score
    const latestReview = await prisma.review.findFirst({
      where: { revieweeId: userId, tenantId, deletedAt: null, overallRating: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { overallRating: true },
    });

    const LEVEL_MAP: Record<string, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };

    const tenure = user.hireDate
      ? `${Math.floor((Date.now() - new Date(user.hireDate).getTime()) / (365.25 * MS_PER_DAY))}y ${Math.floor(((Date.now() - new Date(user.hireDate).getTime()) / (30.44 * MS_PER_DAY)) % 12)}m`
      : 'N/A';

    // Get career paths for the tenant
    const careerPaths = await prisma.careerPath.findMany({
      where: { tenantId, isActive: true },
    });

    // Build next roles and lateral moves from career paths
    const currentJobTitle = user.jobTitle || 'Employee';
    const currentDept = user.department?.name || 'General';

    // Determine user level from skills
    const avgSkillLevel = skills.length > 0
      ? skills.reduce((s, sk) => s + (LEVEL_MAP[sk.skillLevel] || 1), 0) / skills.length
      : 1;
    const userLevel = Math.round(avgSkillLevel);

    // Build next roles from career paths data
    const nextRoles = careerPaths.slice(0, 3).map((cp, i) => {
      const roles = (cp.roles as any[]) || [];
      const nextRole = roles.find((r: any) => r.level > userLevel) || roles[0];
      return {
        id: cp.id,
        title: nextRole?.title || cp.pathName,
        level: (nextRole?.level || userLevel) + 1,
        department: cp.department || currentDept,
        requiredSkills: Object.keys((cp.skillRequirements as Record<string, any>) || {}).slice(0, 5),
        avgTimeToReach: cp.averageDuration ? `${Math.round(cp.averageDuration / 12)}y` : '1-2y',
        description: cp.pathDescription,
      };
    });

    // If no career paths, generate generic ones
    if (nextRoles.length === 0) {
      nextRoles.push(
        { id: 'next-1', title: `Senior ${currentJobTitle}`, level: userLevel + 1, department: currentDept, requiredSkills: skills.slice(0, 3).map(s => s.skillName), avgTimeToReach: '1-2y', description: 'Natural progression' },
        { id: 'next-2', title: `Lead ${currentJobTitle}`, level: userLevel + 2, department: currentDept, requiredSkills: skills.slice(0, 4).map(s => s.skillName).concat(['Leadership']), avgTimeToReach: '2-3y', description: 'Technical leadership track' },
      );
    }

    return {
      currentPosition: {
        title: currentJobTitle,
        level: userLevel,
        department: currentDept,
        tenure,
        skills: skills.map(s => ({
          name: s.skillName,
          level: LEVEL_MAP[s.skillLevel] || 1,
          maxLevel: 4,
        })),
        performanceScore: latestReview?.overallRating ? Number(latestReview.overallRating) : 3.0,
      },
      previousRoles: [],
      nextRoles,
      lateralMoves: [],
    };
  }

  /**
   * Get growth requirements for a specific role
   */
  async getGrowthRequirements(tenantId: string, roleId: string) {
    // Try to find career path
    const careerPath = await prisma.careerPath.findFirst({
      where: { id: roleId, tenantId },
    });

    if (careerPath) {
      const skillReqs = (careerPath.skillRequirements as Record<string, number>) || {};
      const compReqs = (careerPath.competencyRequirements as Record<string, number>) || {};

      return {
        roleId,
        competencies: Object.entries(compReqs).map(([name, required]) => ({
          name,
          current: Math.max(1, (required as number) - 1),
          required: required as number,
        })),
        skillGaps: Object.keys(skillReqs).slice(0, 5),
        activities: [
          { title: 'Complete relevant training courses', type: 'TRAINING', duration: '3 months' },
          { title: 'Take on stretch assignments', type: 'PROJECT', duration: '6 months' },
          { title: 'Seek mentorship', type: 'MENTORING', duration: 'Ongoing' },
        ],
        estimatedTimeline: careerPath.averageDuration ? `${Math.round(careerPath.averageDuration / 12)} years` : '1-2 years',
        mentors: [],
      };
    }

    // Return generic requirements
    return {
      roleId,
      competencies: [
        { name: 'Technical Expertise', current: 2, required: 4 },
        { name: 'Leadership', current: 1, required: 3 },
        { name: 'Communication', current: 3, required: 4 },
      ],
      skillGaps: ['Advanced Problem Solving', 'Strategic Planning'],
      activities: [
        { title: 'Complete relevant training courses', type: 'TRAINING', duration: '3 months' },
        { title: 'Lead a team project', type: 'PROJECT', duration: '6 months' },
        { title: 'Find a senior mentor', type: 'MENTORING', duration: 'Ongoing' },
      ],
      estimatedTimeline: '1-2 years',
      mentors: [],
    };
  }

  /**
   * Get all available roles in the organization
   */
  async getRoles(tenantId: string) {
    // Get unique job titles from users
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { jobTitle: true, departmentId: true, department: { select: { name: true } } },
      distinct: ['jobTitle'],
    });

    // Also get roles from career paths
    const careerPaths = await prisma.careerPath.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, pathName: true, department: true, pathDescription: true, skillRequirements: true, roles: true },
    });

    const roles: Array<{ id: string; title: string; department: string; levelRange: string; description: string; requiredSkills: string[] }> = [];

    // Add from career paths
    for (const cp of careerPaths) {
      const cpRoles = (cp.roles as any[]) || [];
      for (const r of cpRoles) {
        roles.push({
          id: `${cp.id}-${r.title || r.level}`,
          title: r.title || cp.pathName,
          department: cp.department || 'General',
          levelRange: `Level ${r.level || 1}`,
          description: r.description || cp.pathDescription || '',
          requiredSkills: r.requiredSkills || Object.keys((cp.skillRequirements as Record<string, any>) || {}).slice(0, 5),
        });
      }
    }

    // Add from user job titles if not already present
    for (const u of users) {
      if (u.jobTitle && !roles.find(r => r.title === u.jobTitle)) {
        roles.push({
          id: `role-${u.jobTitle.replace(/\s+/g, '-').toLowerCase()}`,
          title: u.jobTitle,
          department: u.department?.name || 'General',
          levelRange: 'Various',
          description: '',
          requiredSkills: [],
        });
      }
    }

    return roles;
  }

  /**
   * Get career goals for a user
   */
  async getCareerGoals(tenantId: string, userId: string) {
    // Use development plans as career goals
    const plans = await prisma.developmentPlan.findMany({
      where: { userId, tenantId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: {
        id: true,
        targetRole: true,
        targetCompletionDate: true,
        progressPercentage: true,
        milestones: true,
        planName: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return plans.map(p => ({
      id: p.id,
      targetRole: p.targetRole || p.planName,
      targetDate: p.targetCompletionDate.toISOString(),
      progress: Number(p.progressPercentage),
      milestones: ((p.milestones as any[]) || []).map((m: any) => ({
        label: m.title || m.label || 'Milestone',
        completed: m.completed || m.status === 'COMPLETED',
      })),
    }));
  }
}

export const careerService = new CareerService();
