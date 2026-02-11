// @ts-nocheck
import { prisma } from '@pms/database';

class SuccessionService {
  async create(tenantId: string, input: any) {
    return prisma.successionPlan.create({
      data: { tenantId, ...input }
    });
  }

  async list(tenantId: string, filters: { criticality?: string; status?: string } = {}) {
    const where: any = { tenantId };
    if (filters.criticality) where.criticality = filters.criticality;
    if (filters.status) where.status = filters.status;
    return prisma.successionPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getById(tenantId: string, id: string) {
    return prisma.successionPlan.findFirst({ where: { id, tenantId } });
  }

  async update(tenantId: string, id: string, input: any) {
    return prisma.successionPlan.update({
      where: { id },
      data: input
    });
  }

  async delete(tenantId: string, id: string) {
    return prisma.successionPlan.delete({ where: { id } });
  }

  // Compute 9-Box Grid dynamically from ReviewSubmission ratings + development plan progress
  async getNineBoxGrid(tenantId: string) {
    // Get all users with their latest review ratings
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, department: true }
    });

    // Get latest reviews for each user (performance axis)
    const reviewSubmissions = await prisma.review.findMany({
      where: { tenantId, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      select: { revieweeId: true, overallRating: true }
    });

    // Get development plans progress (potential axis)
    const devPlans = await prisma.developmentPlan.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { userId: true, progressPercentage: true }
    });

    // Build ratings map (latest rating per user)
    const performanceMap = new Map<string, number>();
    for (const rs of reviewSubmissions) {
      if (!performanceMap.has(rs.revieweeId) && rs.overallRating) {
        performanceMap.set(rs.revieweeId, Number(rs.overallRating));
      }
    }

    // Build potential map (dev plan progress as proxy for potential)
    const potentialMap = new Map<string, number>();
    for (const dp of devPlans) {
      const existing = potentialMap.get(dp.userId);
      if (!existing || (dp.progressPercentage && Number(dp.progressPercentage) > existing)) {
        potentialMap.set(dp.userId, Number(dp.progressPercentage || 0));
      }
    }

    // Classify into 9-box grid
    // Performance: Low (0-2.5), Medium (2.5-3.75), High (3.75-5)
    // Potential: Low (0-33), Medium (33-66), High (66-100)
    const grid: Record<string, any[]> = {
      'high-low': [], 'high-medium': [], 'high-high': [],
      'medium-low': [], 'medium-medium': [], 'medium-high': [],
      'low-low': [], 'low-medium': [], 'low-high': [],
    };

    for (const user of users) {
      const performance = performanceMap.get(user.id) ?? 3.0;
      const potential = potentialMap.get(user.id) ?? 50;

      const perfLevel = performance >= 3.75 ? 'high' : performance >= 2.5 ? 'medium' : 'low';
      const potLevel = potential >= 66 ? 'high' : potential >= 33 ? 'medium' : 'low';

      const key = `${perfLevel}-${potLevel}`;
      grid[key].push({
        ...user,
        performanceRating: performance,
        potentialScore: potential,
      });
    }

    return { grid, totalEmployees: users.length };
  }

  async getSuccessorReadiness(tenantId: string, planId: string) {
    const plan = await prisma.successionPlan.findFirst({ where: { id: planId, tenantId } });
    if (!plan) throw new Error('Plan not found');

    const successors = (plan.successors as any[]) || [];
    const userIds = successors.map((s: any) => s.userId).filter(Boolean);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, jobTitle: true }
    });

    const devPlans = await prisma.developmentPlan.findMany({
      where: { userId: { in: userIds }, tenantId },
      select: { userId: true, overallProgress: true, status: true }
    });

    return successors.map((s: any) => {
      const user = users.find(u => u.id === s.userId);
      const plan = devPlans.find(d => d.userId === s.userId);
      return {
        ...s,
        user,
        developmentProgress: plan ? Number(plan.overallProgress || 0) : 0,
        developmentStatus: plan?.status || 'NONE',
      };
    });
  }
}

export const successionService = new SuccessionService();
