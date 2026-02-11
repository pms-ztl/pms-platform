// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../types';
import { reportGenerationService, ReportType } from '../../services/reporting/report-generation.service';
import { jobQueueService } from '../../services/reporting/job-queue.service';
import { reportSchedulerService } from '../../services/reporting/report-scheduler.service';
import { reportExportService, ExportFormat } from '../../services/reporting/report-export.service';
import { reportCacheService } from '../../services/reporting/report-cache.service';
import { AggregationType } from '../../services/reporting/data-aggregation.service';
import { prisma } from '@pms/database';

// Validation schemas
const generateReportSchema = z.object({
  reportType: z.string().min(1),
  aggregationType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  exportFormats: z.array(z.enum(['pdf', 'excel', 'csv'])).optional(),
  recipients: z.array(z.string().email()).optional(),
  async: z.boolean().optional(),
});

// Map frontend report type labels to backend ReportType enum
const REPORT_TYPE_MAP: Record<string, ReportType> = {
  PERFORMANCE_SUMMARY: 'WEEKLY_SUMMARY',
  '360_DEGREE_FEEDBACK': 'QUARTERLY_REVIEW',
  TEAM_ANALYTICS: 'COMPARATIVE_ANALYSIS',
  COMPENSATION_ANALYSIS: 'QUARTERLY_REVIEW',
  DEVELOPMENT_PROGRESS: 'MONTHLY_CARD',
  GOAL_ACHIEVEMENT: 'MONTHLY_CARD',
  PIP_STATUS: 'MONTHLY_CARD',
  COMPLIANCE_STATUS: 'QUARTERLY_REVIEW',
  // Direct matches (backward compatibility)
  WEEKLY_SUMMARY: 'WEEKLY_SUMMARY',
  MONTHLY_CARD: 'MONTHLY_CARD',
  QUARTERLY_REVIEW: 'QUARTERLY_REVIEW',
  YEARLY_INDEX: 'YEARLY_INDEX',
  COMPARATIVE_ANALYSIS: 'COMPARATIVE_ANALYSIS',
};

// Map frontend scope labels to backend AggregationType
const AGGREGATION_TYPE_MAP: Record<string, string> = {
  INDIVIDUAL: 'user',
  TEAM: 'team',
  DEPARTMENT: 'department',
  ORGANIZATION: 'tenant',
  // Direct matches (backward compatibility)
  user: 'user',
  team: 'team',
  department: 'department',
  business_unit: 'business_unit',
  tenant: 'tenant',
};

const scheduleReportSchema = z.object({
  reportDefinitionId: z.string().uuid(),
  cronExpression: z.string(),
  timezone: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

const updateScheduleSchema = z.object({
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Reports Controller
 *
 * Handles HTTP requests for:
 * - On-demand report generation
 * - Report scheduling
 * - Report export
 * - Report history and analytics
 */
export class ReportsController {
  /**
   * Generate a report on-demand
   * POST /api/v1/reports/generate
   */
  async generateReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;

      // Validate request body
      const validation = generateReportSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.errors,
          },
        });
        return;
      }

      const {
        reportType: rawReportType,
        aggregationType: rawAggregationType = 'tenant',
        entityId = tenantId,
        periodStart,
        periodEnd,
        exportFormats = ['pdf'],
        recipients = [],
        async = false,
      } = validation.data;

      // Map frontend values to backend enums
      const reportType = REPORT_TYPE_MAP[rawReportType] || 'QUARTERLY_REVIEW';
      const aggregationType = AGGREGATION_TYPE_MAP[rawAggregationType] || 'tenant';

      logger.info('Generating report', {
        tenantId,
        userId,
        reportType,
        rawReportType,
        aggregationType,
        async,
      });

      if (async) {
        // Add to job queue for async processing
        const job = await jobQueueService.addReportJob(
          {
            tenantId,
            reportType: reportType as ReportType,
            aggregationType: aggregationType as AggregationType,
            entityId,
            periodStart: periodStart ? new Date(periodStart) : undefined,
            periodEnd: periodEnd ? new Date(periodEnd) : undefined,
            exportFormats: exportFormats as ExportFormat[],
            recipients,
            generatedById: userId,
          },
          { priority: 5 }
        );

        res.status(202).json({
          success: true,
          data: {
            jobId: job.id,
            status: 'processing',
            message: 'Report generation started. Check status using job ID.',
          },
        });
      } else {
        // Generate synchronously
        const report = await reportGenerationService.generateReport({
          tenantId,
          reportType: reportType as ReportType,
          aggregationType: aggregationType as AggregationType,
          entityId,
          periodStart: periodStart ? new Date(periodStart) : undefined,
          periodEnd: periodEnd ? new Date(periodEnd) : undefined,
          generatedById: userId,
        });

        // Export if formats specified
        const exportUrls: Record<string, string> = {};

        for (const format of exportFormats) {
          const filepath = await reportExportService.exportReport({
            reportId: report.id,
            format: format as ExportFormat,
            reportData: {
              title: report.title,
              summary: report.summary,
              data: report.data,
              trends: report.trends,
              comparisons: report.comparisons,
              insights: report.insights,
              recommendations: report.recommendations,
            },
          });

          // Store filepath in DB (for download handler to find the file)
          await prisma.generatedReport.update({
            where: { id: report.id },
            data: { [`${format}Url`]: filepath },
          });

          // Return API download URL to the frontend
          exportUrls[format] = await reportExportService.getReportUrl(filepath, report.id, format);
        }

        res.status(200).json({
          success: true,
          data: {
            reportId: report.id,
            title: report.title,
            summary: report.summary,
            periodLabel: report.periodLabel,
            exportUrls,
            createdAt: report.createdAt,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report by ID
   * GET /api/v1/reports/:reportId
   */
  async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { reportId } = req.params;

      const report = await prisma.generatedReport.findFirst({
        where: {
          id: reportId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!report) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Report not found',
          },
        });
        return;
      }

      // Update access count
      await prisma.generatedReport.update({
        where: { id: reportId },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });

      // Transform raw filesystem paths into API download URLs
      const reportData = {
        ...report,
        pdfUrl: report.pdfUrl ? `/api/v1/reports/${report.id}/download?format=pdf` : null,
        excelUrl: report.excelUrl ? `/api/v1/reports/${report.id}/download?format=excel` : null,
        csvUrl: report.csvUrl ? `/api/v1/reports/${report.id}/download?format=csv` : null,
      };

      res.status(200).json({
        success: true,
        data: reportData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download report export file
   * GET /api/v1/reports/:reportId/download?format=pdf|excel|csv
   */
  async downloadReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { reportId } = req.params;
      const format = (req.query.format as string || 'pdf').toLowerCase();

      const report = await prisma.generatedReport.findFirst({
        where: {
          id: reportId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!report) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' },
        });
        return;
      }

      // Get the stored filepath
      const urlMap: Record<string, string | null> = {
        pdf: report.pdfUrl,
        excel: report.excelUrl,
        csv: report.csvUrl,
      };

      const filepath = urlMap[format];
      if (!filepath) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `No ${format} export available for this report` },
        });
        return;
      }

      // Check if file exists
      const { existsSync } = await import('fs');
      if (!existsSync(filepath)) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Export file not found on disk' },
        });
        return;
      }

      // Set content type and disposition
      const contentTypes: Record<string, string> = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
      };
      const extensions: Record<string, string> = {
        pdf: 'pdf',
        excel: 'xlsx',
        csv: 'csv',
      };

      const filename = `${report.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.${extensions[format] || format}`;
      res.setHeader('Content-Type', contentTypes[format] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const { createReadStream } = await import('fs');
      const stream = createReadStream(filepath);
      stream.pipe(res);

      // Update access count
      await prisma.generatedReport.update({
        where: { id: reportId },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List generated reports
   * GET /api/v1/reports
   */
  async listReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        reportType,
        periodType,
        page = '1',
        limit = '20',
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {
        tenantId,
        deletedAt: null,
      };

      if (reportType) where.reportType = reportType;
      if (periodType) where.periodType = periodType;

      const [reports, total] = await Promise.all([
        prisma.generatedReport.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            reportType: true,
            periodType: true,
            periodLabel: true,
            title: true,
            summary: true,
            generationStatus: true,
            pdfUrl: true,
            excelUrl: true,
            csvUrl: true,
            createdAt: true,
            accessCount: true,
            lastAccessedAt: true,
          },
        }),
        prisma.generatedReport.count({ where }),
      ]);

      const totalPages = Math.ceil(total / take);

      // Transform raw filesystem paths into API download URLs
      const reportsWithUrls = reports.map((r) => ({
        ...r,
        pdfUrl: r.pdfUrl ? `/api/v1/reports/${r.id}/download?format=pdf` : null,
        excelUrl: r.excelUrl ? `/api/v1/reports/${r.id}/download?format=excel` : null,
        csvUrl: r.csvUrl ? `/api/v1/reports/${r.id}/download?format=csv` : null,
      }));

      res.status(200).json({
        success: true,
        data: reportsWithUrls,
        meta: {
          total,
          page: parseInt(page as string),
          limit: take,
          totalPages,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPreviousPage: parseInt(page as string) > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule a report
   * POST /api/v1/reports/schedules
   */
  async scheduleReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const validation = scheduleReportSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.errors,
          },
        });
        return;
      }

      const schedule = await reportSchedulerService.addSchedule({
        tenantId,
        ...validation.data,
        startDate: new Date(validation.data.startDate),
        endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
      });

      res.status(201).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a schedule
   * PATCH /api/v1/reports/schedules/:scheduleId
   */
  async updateSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const validation = updateScheduleSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.errors,
          },
        });
        return;
      }

      const schedule = await reportSchedulerService.updateSchedule(scheduleId, {
        ...validation.data,
        endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
      });

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a schedule
   * DELETE /api/v1/reports/schedules/:scheduleId
   */
  async deleteSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scheduleId } = req.params;

      await reportSchedulerService.deleteSchedule(scheduleId);

      res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pause a schedule
   * POST /api/v1/reports/schedules/:scheduleId/pause
   */
  async pauseSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scheduleId } = req.params;

      await reportSchedulerService.pauseSchedule(scheduleId);

      res.status(200).json({
        success: true,
        message: 'Schedule paused successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resume a schedule
   * POST /api/v1/reports/schedules/:scheduleId/resume
   */
  async resumeSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scheduleId } = req.params;

      await reportSchedulerService.resumeSchedule(scheduleId);

      res.status(200).json({
        success: true,
        message: 'Schedule resumed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List schedules
   * GET /api/v1/reports/schedules
   */
  async listSchedules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const schedules = await reportSchedulerService.getActiveSchedules(tenantId);

      res.status(200).json({
        success: true,
        data: schedules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get schedule statistics
   * GET /api/v1/reports/schedules/:scheduleId/stats
   */
  async getScheduleStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const stats = await reportSchedulerService.getScheduleStats(scheduleId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get job status
   * GET /api/v1/reports/jobs/:jobId
   */
  async getJobStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const { queue = 'report-generation' } = req.query;

      const status = await jobQueueService.getJobStatus(jobId, queue as string);

      if (!status) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cache statistics
   * GET /api/v1/reports/cache/stats
   */
  async getCacheStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await reportCacheService.getCacheStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invalidate cache
   * POST /api/v1/reports/cache/invalidate
   */
  async invalidateCache(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { entityId, reportType } = req.body;

      if (entityId) {
        await reportCacheService.invalidateEntityCache(tenantId, entityId);
      } else if (reportType) {
        await reportCacheService.invalidateReportTypeCache(tenantId, reportType);
      } else {
        await reportCacheService.invalidateTenantCache(tenantId);
      }

      res.status(200).json({
        success: true,
        message: 'Cache invalidated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
