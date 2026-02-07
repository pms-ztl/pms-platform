import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger';
import { format as formatDate } from 'date-fns';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

interface ExportParams {
  reportId: string;
  format: ExportFormat;
  reportData: any;
  includeCharts?: boolean;
}

/**
 * Report Export Service
 *
 * Handles PDF, Excel, and CSV export of generated reports with
 * professional formatting and visualizations.
 */
export class ReportExportService {
  private readonly exportsDir: string;

  constructor() {
    this.exportsDir = process.env.REPORTS_EXPORT_DIR || join(process.cwd(), 'exports', 'reports');
  }

  /**
   * Ensure exports directory exists
   */
  private async ensureExportsDir(): Promise<void> {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create exports directory', { error });
      throw error;
    }
  }

  /**
   * Generate filename for export
   */
  private generateFilename(reportId: string, exportFormat: ExportFormat): string {
    const timestamp = formatDate(new Date(), 'yyyyMMdd_HHmmss');
    return `report_${reportId}_${timestamp}.${exportFormat}`;
  }

  /**
   * Export report to PDF
   */
  async exportToPDF(params: ExportParams): Promise<string> {
    const { reportId, reportData } = params;

    logger.info('Exporting report to PDF', { reportId });

    await this.ensureExportsDir();

    const filename = this.generateFilename(reportId, 'pdf');
    const filepath = join(this.exportsDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: reportData.title,
            Author: 'PMS Platform',
            Subject: 'Performance Report',
            CreationDate: new Date(),
          },
        });

        const stream = createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text(reportData.title, { align: 'center' });

        doc.moveDown();

        // Summary section
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#34495e')
          .text(reportData.summary, { align: 'justify' });

        doc.moveDown(2);

        // Key Insights section
        if (reportData.insights && reportData.insights.length > 0) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text('Key Insights');

          doc.moveDown(0.5);

          reportData.insights.forEach((insight: string) => {
            doc
              .fontSize(11)
              .font('Helvetica')
              .fillColor('#34495e')
              .text(`• ${insight}`, { indent: 20 });
            doc.moveDown(0.3);
          });

          doc.moveDown();
        }

        // Performance Metrics section
        if (reportData.data) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text('Performance Metrics');

          doc.moveDown(0.5);

          // Handle different report types
          if (reportData.data.currentWeek) {
            this.addMetricsTable(doc, 'Current Week', reportData.data.currentWeek);
          }

          if (reportData.data.currentMonth) {
            this.addMetricsTable(doc, 'Current Month', reportData.data.currentMonth);
          }

          if (reportData.data.currentQuarter) {
            this.addMetricsTable(doc, 'Current Quarter', reportData.data.currentQuarter);
          }

          if (reportData.data.currentYear) {
            this.addMetricsTable(doc, 'Current Year', reportData.data.currentYear);
          }

          doc.moveDown();
        }

        // Comparisons section
        if (reportData.comparisons) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text('Period Comparisons');

          doc.moveDown(0.5);

          this.addComparisonsSection(doc, reportData.comparisons);

          doc.moveDown();
        }

        // Recommendations section
        if (reportData.recommendations && reportData.recommendations.length > 0) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text('Recommendations');

          doc.moveDown(0.5);

          reportData.recommendations.forEach((recommendation: string, index: number) => {
            doc
              .fontSize(11)
              .font('Helvetica')
              .fillColor('#34495e')
              .text(`${index + 1}. ${recommendation}`, { indent: 20, align: 'justify' });
            doc.moveDown(0.3);
          });
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(9)
            .fillColor('#7f8c8d')
            .text(
              `Generated by PMS Platform on ${format(new Date(), 'MMM dd, yyyy HH:mm')} | Page ${i + 1} of ${pageCount}`,
              50,
              doc.page.height - 30,
              { align: 'center' }
            );
        }

        doc.end();

        stream.on('finish', () => {
          logger.info('PDF export completed', { reportId, filepath });
          resolve(filepath);
        });

        stream.on('error', (error) => {
          logger.error('PDF export failed', { reportId, error });
          reject(error);
        });
      } catch (error) {
        logger.error('PDF generation error', { reportId, error });
        reject(error);
      }
    });
  }

  /**
   * Add metrics table to PDF
   */
  private addMetricsTable(doc: PDFKit.PDFDocument, title: string, metrics: any): void {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text(title);

    doc.moveDown(0.3);

    const metricsToDisplay = [
      { label: 'Total Goals', value: metrics.totalGoals },
      { label: 'Completed Goals', value: metrics.completedGoals },
      { label: 'Goal Completion Rate', value: `${metrics.goalCompletionRate?.toFixed(1) || 0}%` },
      { label: 'Average Goal Progress', value: `${metrics.avgGoalProgress?.toFixed(1) || 0}%` },
      { label: 'On Track Goals', value: metrics.onTrackGoals },
      { label: 'At Risk Goals', value: metrics.atRiskGoals },
      { label: 'Average Productivity', value: metrics.avgProductivity?.toFixed(2) || 'N/A' },
      { label: 'Average Quality', value: metrics.avgQuality?.toFixed(2) || 'N/A' },
      { label: 'Average Collaboration', value: metrics.avgCollaboration?.toFixed(2) || 'N/A' },
      { label: 'Wellbeing Score', value: metrics.avgWellbeingScore?.toFixed(2) || 'N/A' },
    ];

    const tableTop = doc.y;
    const leftColumn = 70;
    const rightColumn = 300;
    let yPosition = tableTop;

    metricsToDisplay.forEach((metric) => {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#34495e')
        .text(metric.label, leftColumn, yPosition)
        .font('Helvetica-Bold')
        .text(String(metric.value), rightColumn, yPosition, { align: 'right' });

      yPosition += 18;
    });

    doc.y = yPosition + 10;
  }

  /**
   * Add comparisons section to PDF
   */
  private addComparisonsSection(doc: PDFKit.PDFDocument, comparisons: any): void {
    const comparisonTypes = ['qoq', 'mom', 'wow', 'yoy'];

    comparisonTypes.forEach((type) => {
      if (comparisons[type]) {
        const typeLabel = {
          qoq: 'Quarter-over-Quarter',
          mom: 'Month-over-Month',
          wow: 'Week-over-Week',
          yoy: 'Year-over-Year',
        }[type];

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#2c3e50')
          .text(typeLabel);

        doc.moveDown(0.3);

        Object.entries(comparisons[type]).forEach(([metric, data]: [string, any]) => {
          const arrow = data.changePercent > 0 ? '↑' : data.changePercent < 0 ? '↓' : '→';
          const color = data.changePercent > 0 ? '#27ae60' : data.changePercent < 0 ? '#e74c3c' : '#95a5a6';

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#34495e')
            .text(`${metric}: `, { continued: true })
            .fillColor(color)
            .text(`${arrow} ${Math.abs(data.changePercent).toFixed(1)}%`);

          doc.moveDown(0.2);
        });

        doc.moveDown();
      }
    });
  }

  /**
   * Export report to Excel
   */
  async exportToExcel(params: ExportParams): Promise<string> {
    const { reportId, reportData } = params;

    logger.info('Exporting report to Excel', { reportId });

    await this.ensureExportsDir();

    const filename = this.generateFilename(reportId, 'excel');
    const filepath = join(this.exportsDir, filename);

    const workbook = new ExcelJS.Workbook();

    // Metadata
    workbook.creator = 'PMS Platform';
    workbook.created = new Date();
    workbook.title = reportData.title;

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');

    summarySheet.mergeCells('A1:E1');
    summarySheet.getCell('A1').value = reportData.title;
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.mergeCells('A2:E2');
    summarySheet.getCell('A2').value = reportData.summary;
    summarySheet.getCell('A2').alignment = { wrapText: true };

    summarySheet.addRow([]);

    // Key Insights
    if (reportData.insights && reportData.insights.length > 0) {
      summarySheet.addRow(['Key Insights']);
      summarySheet.getRow(summarySheet.lastRow.number).font = { bold: true, size: 12 };

      reportData.insights.forEach((insight: string) => {
        summarySheet.addRow(['', insight]);
      });

      summarySheet.addRow([]);
    }

    // Recommendations
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      summarySheet.addRow(['Recommendations']);
      summarySheet.getRow(summarySheet.lastRow.number).font = { bold: true, size: 12 };

      reportData.recommendations.forEach((rec: string, index: number) => {
        summarySheet.addRow(['', `${index + 1}. ${rec}`]);
      });
    }

    // Format summary sheet
    summarySheet.columns = [
      { width: 5 },
      { width: 40 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    // Metrics sheet
    if (reportData.data) {
      const metricsSheet = workbook.addWorksheet('Metrics');

      // Headers
      metricsSheet.addRow(['Metric', 'Value', 'Status']);
      metricsSheet.getRow(1).font = { bold: true };
      metricsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add metrics data
      const metricsData = reportData.data.currentWeek ||
        reportData.data.currentMonth ||
        reportData.data.currentQuarter ||
        reportData.data.currentYear;

      if (metricsData) {
        this.addMetricsToSheet(metricsSheet, metricsData);
      }

      // Format columns
      metricsSheet.columns = [
        { width: 30 },
        { width: 15 },
        { width: 15 },
      ];
    }

    // Trends sheet
    if (reportData.trends) {
      const trendsSheet = workbook.addWorksheet('Trends');

      trendsSheet.addRow(['Metric', 'Trend Direction', 'Trend Strength', 'Change %', 'Forecast']);
      trendsSheet.getRow(1).font = { bold: true };
      trendsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      Object.entries(reportData.trends).forEach(([metric, trend]: [string, any]) => {
        trendsSheet.addRow([
          metric,
          trend.trendDirection,
          `${trend.trendStrength}%`,
          `${trend.changePercentage?.toFixed(2) || 0}%`,
          trend.forecastedValue?.toFixed(2) || 'N/A',
        ]);
      });

      trendsSheet.columns = [
        { width: 25 },
        { width: 15 },
        { width: 15 },
        { width: 12 },
        { width: 12 },
      ];
    }

    // Comparisons sheet
    if (reportData.comparisons) {
      const comparisonsSheet = workbook.addWorksheet('Comparisons');

      comparisonsSheet.addRow(['Comparison Type', 'Metric', 'Current', 'Previous', 'Change', 'Change %']);
      comparisonsSheet.getRow(1).font = { bold: true };
      comparisonsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      this.addComparisonsToSheet(comparisonsSheet, reportData.comparisons);

      comparisonsSheet.columns = [
        { width: 20 },
        { width: 25 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];
    }

    await workbook.xlsx.writeFile(filepath);

    logger.info('Excel export completed', { reportId, filepath });

    return filepath;
  }

  /**
   * Add metrics to Excel sheet
   */
  private addMetricsToSheet(sheet: ExcelJS.Worksheet, metrics: any): void {
    const metricsArray = [
      { name: 'Total Goals', value: metrics.totalGoals },
      { name: 'Completed Goals', value: metrics.completedGoals },
      { name: 'In Progress Goals', value: metrics.inProgressGoals },
      { name: 'Goal Completion Rate', value: `${metrics.goalCompletionRate?.toFixed(2) || 0}%` },
      { name: 'Average Goal Progress', value: `${metrics.avgGoalProgress?.toFixed(2) || 0}%` },
      { name: 'On Track Goals', value: metrics.onTrackGoals },
      { name: 'At Risk Goals', value: metrics.atRiskGoals },
      { name: 'Overdue Goals', value: metrics.overdueGoals },
      { name: 'Total Reviews', value: metrics.totalReviews },
      { name: 'Completed Reviews', value: metrics.completedReviews },
      { name: 'Average Review Rating', value: metrics.avgReviewRating?.toFixed(2) || 'N/A' },
      { name: 'Average Productivity', value: metrics.avgProductivity?.toFixed(2) || 'N/A' },
      { name: 'Average Quality', value: metrics.avgQuality?.toFixed(2) || 'N/A' },
      { name: 'Average Collaboration', value: metrics.avgCollaboration?.toFixed(2) || 'N/A' },
      { name: 'Performance Score', value: metrics.performanceScore?.toFixed(2) || 'N/A' },
      { name: 'Wellbeing Score', value: metrics.avgWellbeingScore?.toFixed(2) || 'N/A' },
      { name: 'Average Workload Hours', value: metrics.avgWorkloadHours?.toFixed(2) || 'N/A' },
      { name: 'Total Feedback', value: metrics.totalFeedback },
      { name: 'Positive Feedback', value: metrics.positiveFeedback },
      { name: 'Constructive Feedback', value: metrics.constructiveFeedback },
    ];

    metricsArray.forEach((metric) => {
      const status = this.getMetricStatus(metric.name, metric.value);
      sheet.addRow([metric.name, metric.value, status]);
    });
  }

  /**
   * Get status for metric (for color coding)
   */
  private getMetricStatus(name: string, value: any): string {
    if (name.includes('Completion Rate') || name.includes('Progress')) {
      const numValue = parseFloat(String(value));
      if (numValue >= 80) return 'Excellent';
      if (numValue >= 60) return 'Good';
      if (numValue >= 40) return 'Fair';
      return 'Needs Improvement';
    }

    if (name.includes('At Risk') || name.includes('Overdue')) {
      const numValue = parseInt(String(value));
      if (numValue === 0) return 'Excellent';
      if (numValue <= 2) return 'Good';
      if (numValue <= 5) return 'Fair';
      return 'Needs Attention';
    }

    return 'N/A';
  }

  /**
   * Add comparisons to Excel sheet
   */
  private addComparisonsToSheet(sheet: ExcelJS.Worksheet, comparisons: any): void {
    const comparisonTypes = ['wow', 'mom', 'qoq', 'yoy'];

    comparisonTypes.forEach((type) => {
      if (comparisons[type]) {
        const typeLabel = {
          wow: 'Week-over-Week',
          mom: 'Month-over-Month',
          qoq: 'Quarter-over-Quarter',
          yoy: 'Year-over-Year',
        }[type];

        Object.entries(comparisons[type]).forEach(([metric, data]: [string, any]) => {
          sheet.addRow([
            typeLabel,
            metric,
            data.current,
            data.previous,
            data.change?.toFixed(2) || 0,
            `${data.changePercent?.toFixed(2) || 0}%`,
          ]);
        });
      }
    });
  }

  /**
   * Export report to CSV
   */
  async exportToCSV(params: ExportParams): Promise<string> {
    const { reportId, reportData } = params;

    logger.info('Exporting report to CSV', { reportId });

    await this.ensureExportsDir();

    const filename = this.generateFilename(reportId, 'csv');
    const filepath = join(this.exportsDir, filename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report Data');

    // Add report header
    worksheet.addRow(['Report Title', reportData.title]);
    worksheet.addRow(['Summary', reportData.summary]);
    worksheet.addRow([]);

    // Add metrics
    if (reportData.data) {
      const metricsData = reportData.data.currentWeek ||
        reportData.data.currentMonth ||
        reportData.data.currentQuarter ||
        reportData.data.currentYear;

      if (metricsData) {
        worksheet.addRow(['Metric', 'Value']);

        Object.entries(metricsData).forEach(([key, value]) => {
          worksheet.addRow([key, value]);
        });

        worksheet.addRow([]);
      }
    }

    // Add insights
    if (reportData.insights && reportData.insights.length > 0) {
      worksheet.addRow(['Key Insights']);
      reportData.insights.forEach((insight: string) => {
        worksheet.addRow([insight]);
      });
      worksheet.addRow([]);
    }

    // Add recommendations
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      worksheet.addRow(['Recommendations']);
      reportData.recommendations.forEach((rec: string) => {
        worksheet.addRow([rec]);
      });
    }

    await workbook.csv.writeFile(filepath);

    logger.info('CSV export completed', { reportId, filepath });

    return filepath;
  }

  /**
   * Export report in specified format
   */
  async exportReport(params: ExportParams): Promise<string> {
    const { format } = params;

    switch (format) {
      case 'pdf':
        return this.exportToPDF(params);

      case 'excel':
        return this.exportToExcel(params);

      case 'csv':
        return this.exportToCSV(params);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get public URL for exported report (would integrate with S3/storage service)
   */
  async getReportUrl(filepath: string): Promise<string> {
    // In production, upload to S3 and return public URL
    // For now, return local path
    return filepath;
  }
}

export const reportExportService = new ReportExportService();
