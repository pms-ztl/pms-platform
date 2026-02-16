import { prisma } from '@pms/database';

class AdminConfigService {
  // ── Review Templates ──
  async listTemplates(tenantId: string) {
    return prisma.reviewTemplate.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(tenantId: string, id: string) {
    return prisma.reviewTemplate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async createTemplate(tenantId: string, input: any) {
    return prisma.reviewTemplate.create({
      data: { tenantId, name: input.name, description: input.description, isDefault: input.isDefault || false, sections: input.sections || [] },
    });
  }

  async updateTemplate(tenantId: string, id: string, input: any) {
    return prisma.reviewTemplate.update({
      where: { id },
      data: input,
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    return prisma.reviewTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Competency Frameworks ──
  async listFrameworks(tenantId: string) {
    return prisma.competencyFramework.findMany({
      where: { tenantId, deletedAt: null },
      include: { competencies: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFramework(tenantId: string, id: string) {
    return prisma.competencyFramework.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { competencies: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createFramework(tenantId: string, input: any) {
    return prisma.competencyFramework.create({
      data: { tenantId, name: input.name, description: input.description, isDefault: input.isDefault || false },
    });
  }

  async updateFramework(tenantId: string, id: string, input: any) {
    return prisma.competencyFramework.update({
      where: { id },
      data: input,
    });
  }

  async deleteFramework(tenantId: string, id: string) {
    return prisma.competencyFramework.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Competencies (within a framework) ──
  async listCompetencies(frameworkId: string) {
    return prisma.competency.findMany({
      where: { frameworkId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCompetency(frameworkId: string, input: any) {
    return prisma.competency.create({
      data: {
        frameworkId,
        parentId: input.parentId,
        name: input.name,
        description: input.description,
        category: input.category,
        levelDescriptions: input.levelDescriptions || {},
        sortOrder: input.sortOrder || 0,
      },
    });
  }

  async updateCompetency(id: string, input: any) {
    return prisma.competency.update({
      where: { id },
      data: input,
    });
  }

  async deleteCompetency(id: string) {
    return prisma.competency.delete({ where: { id } });
  }

  // ── Feedback Questionnaires ──
  async listQuestionnaires(tenantId: string) {
    return prisma.feedbackQuestionnaire.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuestionnaire(tenantId: string, userId: string, input: any) {
    return prisma.feedbackQuestionnaire.create({
      data: {
        tenantId,
        createdById: userId,
        name: input.name,
        description: input.description,
        questionnaireType: input.questionnaireType || 'STANDARD',
        isTemplate: input.isTemplate || false,
        isActive: true,
        useAIAdaptation: input.useAIAdaptation || false,
        adaptationCriteria: input.adaptationCriteria,
        questions: input.questions || [],
        competencyIds: input.competencyIds || [],
      },
    });
  }

  async updateQuestionnaire(id: string, input: any) {
    return prisma.feedbackQuestionnaire.update({
      where: { id },
      data: input,
    });
  }

  async deleteQuestionnaire(id: string) {
    return prisma.feedbackQuestionnaire.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Rating Scales (stored in ReviewTemplate sections JSON) ──
  // Rating scales are managed as part of review templates
  // Each template section can define its rating scale
  async getRatingScales(tenantId: string) {
    const templates = await prisma.reviewTemplate.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, sections: true },
    });

    // Extract rating scales from template sections
    const scales: any[] = [];
    for (const t of templates) {
      const sections = t.sections as any[];
      if (Array.isArray(sections)) {
        for (const section of sections) {
          if (section.ratingScale) {
            scales.push({
              templateId: t.id,
              templateName: t.name,
              sectionName: section.name || section.title,
              ratingScale: section.ratingScale,
            });
          }
        }
      }
    }
    return scales;
  }
}

export const adminConfigService = new AdminConfigService();
