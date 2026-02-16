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

// Professional color palette
const COLORS = {
  primary: '#1a365d',
  primaryLight: '#2b6cb0',
  secondary: '#2d3748',
  accent: '#3182ce',
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e',
  muted: '#718096',
  light: '#e2e8f0',
  lighter: '#f7fafc',
  white: '#ffffff',
  tableHeader: '#2b6cb0',
  tableHeaderText: '#ffffff',
  tableRowAlt: '#f7fafc',
  tableBorder: '#cbd5e0',
};

export class ReportExportService {
  private readonly exportsDir: string;

  constructor() {
    this.exportsDir = process.env.REPORTS_EXPORT_DIR || join(process.cwd(), 'exports', 'reports');
  }

  private async ensureExportsDir(): Promise<void> {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create exports directory', { error });
      throw error;
    }
  }

  private generateFilename(reportId: string, exportFormat: ExportFormat): string {
    const timestamp = formatDate(new Date(), 'yyyyMMdd_HHmmss');
    return `report_${reportId}_${timestamp}.${exportFormat}`;
  }

  /**
   * Draw a horizontal line across the page
   */
  private drawLine(doc: any, y: number, color: string = COLORS.light, thickness: number = 1): void {
    doc.save()
      .moveTo(50, y)
      .lineTo(doc.page.width - 50, y)
      .lineWidth(thickness)
      .strokeColor(color)
      .stroke()
      .restore();
  }

  /**
   * Draw a filled rectangle (for section headers, table headers, etc.)
   */
  private drawRect(doc: any, x: number, y: number, w: number, h: number, color: string): void {
    doc.save()
      .rect(x, y, w, h)
      .fill(color)
      .restore();
  }

  /**
   * Draw a rounded rectangle
   */
  private drawRoundedRect(doc: any, x: number, y: number, w: number, h: number, r: number, color: string): void {
    doc.save()
      .roundedRect(x, y, w, h, r)
      .fill(color)
      .restore();
  }

  /**
   * Check if we need a new page (with margin)
   */
  private checkPageBreak(doc: any, requiredSpace: number = 100): void {
    if (doc.y + requiredSpace > doc.page.height - 80) {
      doc.addPage();
      doc.y = 50;
    }
  }

  /**
   * Draw a section header with colored background
   */
  private drawSectionHeader(doc: any, title: string): void {
    this.checkPageBreak(doc, 60);
    const y = doc.y;
    this.drawRoundedRect(doc, 50, y, doc.page.width - 100, 28, 4, COLORS.primary);
    doc.fontSize(13)
      .font('Helvetica-Bold')
      .fillColor(COLORS.white)
      .text(title, 62, y + 7, { width: doc.page.width - 124 });
    doc.y = y + 38;
  }

  /**
   * Draw a KPI card (small colored box with value)
   */
  private drawKPICard(doc: any, x: number, y: number, width: number, label: string, value: string, color: string): void {
    // Card background
    this.drawRoundedRect(doc, x, y, width, 58, 6, COLORS.lighter);
    // Top accent line
    this.drawRoundedRect(doc, x, y, width, 4, 2, color);
    // Value
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(value, x + 8, y + 12, { width: width - 16, align: 'center' });
    // Label
    doc.fontSize(8)
      .font('Helvetica')
      .fillColor(COLORS.muted)
      .text(label, x + 8, y + 38, { width: width - 16, align: 'center' });
  }

  /**
   * Draw a professional metrics table with alternating rows
   */
  private drawMetricsTablePro(doc: any, title: string, metrics: Array<{ label: string; value: string | number; status?: string }>): void {
    this.checkPageBreak(doc, 40 + metrics.length * 22);

    const pageWidth = doc.page.width - 100;
    const x = 50;
    let y = doc.y;
    const labelColW = pageWidth * 0.5;
    const valueColW = pageWidth * 0.25;
    const statusColW = pageWidth * 0.25;
    const rowH = 22;

    // Sub-section title
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(COLORS.secondary)
      .text(title, x, y);
    y += 20;

    // Table header
    this.drawRect(doc, x, y, pageWidth, rowH, COLORS.tableHeader);
    doc.fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(COLORS.tableHeaderText)
      .text('Metric', x + 8, y + 6, { width: labelColW - 16 })
      .text('Value', x + labelColW + 8, y + 6, { width: valueColW - 16, align: 'right' })
      .text('Status', x + labelColW + valueColW + 8, y + 6, { width: statusColW - 16, align: 'center' });
    y += rowH;

    // Table rows
    metrics.forEach((metric, i) => {
      if (y + rowH > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }
      const bgColor = i % 2 === 0 ? COLORS.white : COLORS.tableRowAlt;
      this.drawRect(doc, x, y, pageWidth, rowH, bgColor);

      // Draw border lines
      doc.save()
        .moveTo(x, y + rowH).lineTo(x + pageWidth, y + rowH)
        .lineWidth(0.5).strokeColor(COLORS.tableBorder).stroke()
        .restore();

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor(COLORS.secondary)
        .text(metric.label, x + 8, y + 6, { width: labelColW - 16 });

      doc.font('Helvetica-Bold')
        .fillColor(COLORS.primary)
        .text(String(metric.value), x + labelColW + 8, y + 6, { width: valueColW - 16, align: 'right' });

      // Status badge
      if (metric.status && metric.status !== 'N/A') {
        const statusColor = metric.status === 'Excellent' ? COLORS.success
          : metric.status === 'Good' ? COLORS.accent
          : metric.status === 'Fair' ? COLORS.warning
          : COLORS.danger;
        const badgeW = 70;
        const badgeX = x + labelColW + valueColW + (statusColW - badgeW) / 2;
        this.drawRoundedRect(doc, badgeX, y + 3, badgeW, 16, 8, statusColor);
        doc.fontSize(7)
          .font('Helvetica-Bold')
          .fillColor(COLORS.white)
          .text(metric.status, badgeX, y + 6, { width: badgeW, align: 'center' });
      }

      y += rowH;
    });

    // Bottom border
    doc.save()
      .moveTo(x, y).lineTo(x + pageWidth, y)
      .lineWidth(1).strokeColor(COLORS.tableHeader).stroke()
      .restore();

    doc.y = y + 15;
  }

  /**
   * Export report to PDF with professional styling
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
          margins: { top: 50, bottom: 60, left: 50, right: 50 },
          bufferPages: true,
          info: {
            Title: reportData.title,
            Author: 'PMS Platform',
            Subject: 'Performance Report',
            CreationDate: new Date(),
          },
        });

        const stream = createWriteStream(filepath);
        doc.pipe(stream);

        const pageWidth = doc.page.width - 100;

        // === TITLE HEADER with accent bar ===
        this.drawRect(doc, 0, 0, doc.page.width, 6, COLORS.primary);
        doc.y = 30;
        this.drawRoundedRect(doc, 40, doc.y, doc.page.width - 80, 55, 6, COLORS.primary);
        doc.fontSize(22)
          .font('Helvetica-Bold')
          .fillColor(COLORS.white)
          .text(reportData.title, 55, doc.y + 8, { width: doc.page.width - 110, align: 'center' });

        const generatedDate = formatDate(new Date(), 'MMMM dd, yyyy HH:mm');
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor('#b0c4de')
          .text(`Generated on ${generatedDate}`, 55, doc.y + 32, { width: doc.page.width - 110, align: 'center' });

        doc.y = 100;

        // === SUMMARY ===
        doc.moveDown(0.5);
        this.drawRoundedRect(doc, 50, doc.y, pageWidth, 2, 1, COLORS.accent);
        doc.y += 8;
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor(COLORS.secondary)
          .text(reportData.summary, 50, doc.y, { align: 'justify', width: pageWidth, lineGap: 3 });
        doc.moveDown(1.5);

        // === KPI CARDS (if we have computed metrics) ===
        const metricsData = reportData.data?.currentWeek
          || reportData.data?.currentMonth
          || reportData.data?.currentQuarter
          || reportData.data?.currentYear;

        if (metricsData) {
          this.checkPageBreak(doc, 85);
          const cardY = doc.y;
          const cardW = (pageWidth - 30) / 4;

          const totalGoals = metricsData.totalGoals || 0;
          const completedGoals = metricsData.completedGoals || 0;
          const completionRate = metricsData.goalCompletionRate?.toFixed(1) || '0.0';
          const avgProgress = metricsData.avgGoalProgress?.toFixed(1) || '0.0';

          this.drawKPICard(doc, 50, cardY, cardW, 'Total Goals', String(totalGoals), COLORS.accent);
          this.drawKPICard(doc, 50 + cardW + 10, cardY, cardW, 'Completed', String(completedGoals), COLORS.success);
          this.drawKPICard(doc, 50 + (cardW + 10) * 2, cardY, cardW, 'Completion Rate', `${completionRate}%`, COLORS.primaryLight);
          this.drawKPICard(doc, 50 + (cardW + 10) * 3, cardY, cardW, 'Avg Progress', `${avgProgress}%`, COLORS.warning);

          doc.y = cardY + 72;
        }

        // === KEY INSIGHTS ===
        if (reportData.insights && reportData.insights.length > 0) {
          this.drawSectionHeader(doc, 'Key Insights');
          reportData.insights.forEach((insight: string, i: number) => {
            this.checkPageBreak(doc, 20);
            const bulletColor = i < 3 ? COLORS.accent : COLORS.muted;
            doc.save()
              .circle(64, doc.y + 5, 3)
              .fill(bulletColor)
              .restore();
            doc.fontSize(9.5)
              .font('Helvetica')
              .fillColor(COLORS.secondary)
              .text(insight, 74, doc.y, { width: pageWidth - 30, lineGap: 2 });
            doc.moveDown(0.4);
          });
          doc.moveDown(0.8);
        }

        // === PERFORMANCE METRICS TABLE ===
        if (metricsData) {
          this.drawSectionHeader(doc, 'Performance Metrics');

          // Goals metrics
          const goalMetrics = [
            { label: 'Total Goals', value: metricsData.totalGoals || 0, status: this.getMetricStatus('count', metricsData.totalGoals) },
            { label: 'Completed Goals', value: metricsData.completedGoals || 0, status: 'N/A' },
            { label: 'In Progress Goals', value: metricsData.inProgressGoals || 0, status: 'N/A' },
            { label: 'Goal Completion Rate', value: `${(metricsData.goalCompletionRate || 0).toFixed(1)}%`, status: this.getMetricStatus('Goal Completion Rate', metricsData.goalCompletionRate) },
            { label: 'Average Goal Progress', value: `${(metricsData.avgGoalProgress || 0).toFixed(1)}%`, status: this.getMetricStatus('Average Goal Progress', metricsData.avgGoalProgress) },
            { label: 'On Track Goals', value: metricsData.onTrackGoals || 0, status: 'N/A' },
            { label: 'At Risk Goals', value: metricsData.atRiskGoals || 0, status: this.getMetricStatus('At Risk', metricsData.atRiskGoals) },
            { label: 'Overdue Goals', value: metricsData.overdueGoals || 0, status: this.getMetricStatus('Overdue', metricsData.overdueGoals) },
          ];
          this.drawMetricsTablePro(doc, 'Goals', goalMetrics);

          // Performance & Reviews metrics
          const perfMetrics = [
            { label: 'Total Reviews', value: metricsData.totalReviews || 0, status: 'N/A' },
            { label: 'Completed Reviews', value: metricsData.completedReviews || 0, status: 'N/A' },
            { label: 'Avg Review Rating', value: (metricsData.avgReviewRating || 0).toFixed(2), status: this.getMetricStatus('rating', metricsData.avgReviewRating) },
            { label: 'Avg Productivity Score', value: (metricsData.avgProductivity || 0).toFixed(2), status: this.getMetricStatus('score', metricsData.avgProductivity) },
            { label: 'Avg Quality Score', value: (metricsData.avgQuality || 0).toFixed(2), status: this.getMetricStatus('score', metricsData.avgQuality) },
            { label: 'Avg Collaboration Score', value: (metricsData.avgCollaboration || 0).toFixed(2), status: this.getMetricStatus('score', metricsData.avgCollaboration) },
            { label: 'Performance Score', value: (metricsData.performanceScore || 0).toFixed(2), status: this.getMetricStatus('score', metricsData.performanceScore) },
            { label: 'Wellbeing Score', value: (metricsData.avgWellbeingScore || 0).toFixed(2), status: this.getMetricStatus('score', metricsData.avgWellbeingScore) },
          ];
          this.drawMetricsTablePro(doc, 'Performance & Reviews', perfMetrics);

          // Feedback metrics
          const feedbackMetrics = [
            { label: 'Total Feedback', value: metricsData.totalFeedback || 0, status: 'N/A' },
            { label: 'Positive Feedback', value: metricsData.positiveFeedback || 0, status: 'N/A' },
            { label: 'Constructive Feedback', value: metricsData.constructiveFeedback || 0, status: 'N/A' },
            { label: 'Avg Sentiment Score', value: (metricsData.avgSentimentScore || 0).toFixed(2), status: 'N/A' },
            { label: 'Avg Workload Hours', value: (metricsData.avgWorkloadHours || 0).toFixed(1), status: 'N/A' },
          ];
          this.drawMetricsTablePro(doc, 'Feedback & Engagement', feedbackMetrics);
        }

        // === PERIOD COMPARISONS ===
        if (reportData.comparisons) {
          this.drawSectionHeader(doc, 'Period Comparisons');
          this.addComparisonsPro(doc, reportData.comparisons, pageWidth);
          doc.moveDown(0.8);
        }

        // === RECOMMENDATIONS ===
        if (reportData.recommendations && reportData.recommendations.length > 0) {
          this.drawSectionHeader(doc, 'Recommendations');
          reportData.recommendations.forEach((rec: string, index: number) => {
            this.checkPageBreak(doc, 22);
            // Numbered badge
            const badgeX = 56;
            const badgeY = doc.y;
            this.drawRoundedRect(doc, badgeX, badgeY, 18, 18, 9, COLORS.accent);
            doc.fontSize(8)
              .font('Helvetica-Bold')
              .fillColor(COLORS.white)
              .text(String(index + 1), badgeX, badgeY + 4, { width: 18, align: 'center' });
            doc.fontSize(9.5)
              .font('Helvetica')
              .fillColor(COLORS.secondary)
              .text(rec, 82, badgeY + 2, { width: pageWidth - 40, lineGap: 2 });
            doc.moveDown(0.5);
          });
        }

        // === FOOTER on all pages ===
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          const footerY = doc.page.height - 45;
          // Footer line
          this.drawLine(doc, footerY, COLORS.light, 0.5);
          // Footer text
          doc.fontSize(8)
            .font('Helvetica')
            .fillColor(COLORS.muted)
            .text(
              'PMS Platform  |  Confidential',
              50, footerY + 8,
              { width: 200 }
            )
            .text(
              `Page ${i + 1} of ${pageCount}`,
              doc.page.width - 150, footerY + 8,
              { width: 100, align: 'right' }
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
   * Add professional comparisons section
   */
  private addComparisonsPro(doc: any, comparisons: any, pageWidth: number): void {
    const comparisonTypes = ['wow', 'mom', 'qoq', 'yoy'];
    const typeLabels: Record<string, string> = {
      wow: 'Week-over-Week',
      mom: 'Month-over-Month',
      qoq: 'Quarter-over-Quarter',
      yoy: 'Year-over-Year',
    };

    comparisonTypes.forEach((type) => {
      if (!comparisons[type]) return;

      const entries = Object.entries(comparisons[type]);
      if (entries.length === 0) return;

      this.checkPageBreak(doc, 30 + entries.length * 22);

      // Comparison type label
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(COLORS.primaryLight)
        .text(typeLabels[type] || type, 55, doc.y);
      doc.moveDown(0.3);

      const x = 55;
      let y = doc.y;

      entries.forEach(([metric, data]: [string, any]) => {
        if (y + 20 > doc.page.height - 80) {
          doc.addPage();
          y = 50;
        }

        const changePercent = data.changePercent || 0;
        const arrow = changePercent > 0 ? '+' : changePercent < 0 ? '' : '';
        const arrowSymbol = changePercent > 0 ? ' ^' : changePercent < 0 ? ' v' : ' -';
        const color = changePercent > 0 ? COLORS.success : changePercent < 0 ? COLORS.danger : COLORS.muted;

        // Metric name
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.secondary)
          .text(this.formatMetricName(metric), x, y, { continued: false, width: pageWidth * 0.45 });

        // Current vs previous
        const current = typeof data.current === 'number' ? data.current.toFixed(1) : data.current;
        const previous = typeof data.previous === 'number' ? data.previous.toFixed(1) : data.previous;
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.muted)
          .text(`${current} vs ${previous}`, x + pageWidth * 0.45, y, { width: pageWidth * 0.25 });

        // Change percent badge
        const badgeText = `${arrow}${changePercent.toFixed(1)}%`;
        const badgeW = 55;
        const badgeX = x + pageWidth * 0.75;
        this.drawRoundedRect(doc, badgeX, y - 2, badgeW, 16, 8, color);
        doc.fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(COLORS.white)
          .text(badgeText, badgeX, y + 1, { width: badgeW, align: 'center' });

        y += 22;
      });

      doc.y = y + 8;
    });
  }

  /**
   * Format camelCase metric name to display name
   */
  private formatMetricName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .replace(/avg /i, 'Avg ')
      .trim();
  }

  /**
   * Get status label for a metric value
   */
  private getMetricStatus(name: string, value: any): string {
    if (name.includes('Completion Rate') || name.includes('Progress')) {
      const numValue = parseFloat(String(value));
      if (isNaN(numValue)) return 'N/A';
      if (numValue >= 80) return 'Excellent';
      if (numValue >= 60) return 'Good';
      if (numValue >= 40) return 'Fair';
      return 'Needs Improvement';
    }

    if (name.includes('At Risk') || name.includes('Overdue')) {
      const numValue = parseInt(String(value));
      if (isNaN(numValue) || numValue === 0) return 'Excellent';
      if (numValue <= 2) return 'Good';
      if (numValue <= 5) return 'Fair';
      return 'Needs Attention';
    }

    if (name === 'rating' || name === 'score') {
      const numValue = parseFloat(String(value));
      if (isNaN(numValue) || numValue === 0) return 'N/A';
      if (numValue >= 8) return 'Excellent';
      if (numValue >= 6) return 'Good';
      if (numValue >= 4) return 'Fair';
      return 'Needs Improvement';
    }

    if (name === 'count') {
      const numValue = parseInt(String(value));
      if (isNaN(numValue) || numValue === 0) return 'N/A';
      return 'N/A';
    }

    return 'N/A';
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
    workbook.creator = 'PMS Platform';
    workbook.created = new Date();
    workbook.title = reportData.title;

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.mergeCells('A1:E1');
    summarySheet.getCell('A1').value = reportData.title;
    summarySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF1a365d' } };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf7fafc' } };

    summarySheet.mergeCells('A2:E2');
    summarySheet.getCell('A2').value = reportData.summary;
    summarySheet.getCell('A2').alignment = { wrapText: true };

    summarySheet.addRow([]);

    if (reportData.insights && reportData.insights.length > 0) {
      const insightRow = summarySheet.addRow(['Key Insights']);
      insightRow.font = { bold: true, size: 12, color: { argb: 'FF2b6cb0' } };
      reportData.insights.forEach((insight: string) => {
        summarySheet.addRow(['', insight]);
      });
      summarySheet.addRow([]);
    }

    if (reportData.recommendations && reportData.recommendations.length > 0) {
      const recRow = summarySheet.addRow(['Recommendations']);
      recRow.font = { bold: true, size: 12, color: { argb: 'FF2b6cb0' } };
      reportData.recommendations.forEach((rec: string, index: number) => {
        summarySheet.addRow(['', `${index + 1}. ${rec}`]);
      });
    }

    summarySheet.columns = [
      { width: 5 },
      { width: 50 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    // Metrics sheet
    if (reportData.data) {
      const metricsSheet = workbook.addWorksheet('Metrics');

      const headerRow = metricsSheet.addRow(['Metric', 'Value', 'Status']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2b6cb0' } };
      headerRow.alignment = { horizontal: 'center' };

      const metricsData = reportData.data.currentWeek ||
        reportData.data.currentMonth ||
        reportData.data.currentQuarter ||
        reportData.data.currentYear;

      if (metricsData) {
        this.addMetricsToSheet(metricsSheet, metricsData);
      }

      metricsSheet.columns = [
        { width: 30 },
        { width: 18 },
        { width: 18 },
      ];
    }

    // Trends sheet
    if (reportData.trends) {
      const trendsSheet = workbook.addWorksheet('Trends');
      const headerRow = trendsSheet.addRow(['Metric', 'Trend Direction', 'Trend Strength', 'Change %', 'Forecast']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2b6cb0' } };

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
      const headerRow = comparisonsSheet.addRow(['Comparison Type', 'Metric', 'Current', 'Previous', 'Change', 'Change %']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2b6cb0' } };

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

  private addMetricsToSheet(sheet: ExcelJS.Worksheet, metrics: any): void {
    const metricsArray = [
      { name: 'Total Goals', value: metrics.totalGoals || 0 },
      { name: 'Completed Goals', value: metrics.completedGoals || 0 },
      { name: 'In Progress Goals', value: metrics.inProgressGoals || 0 },
      { name: 'Goal Completion Rate', value: `${(metrics.goalCompletionRate || 0).toFixed(2)}%` },
      { name: 'Average Goal Progress', value: `${(metrics.avgGoalProgress || 0).toFixed(2)}%` },
      { name: 'On Track Goals', value: metrics.onTrackGoals || 0 },
      { name: 'At Risk Goals', value: metrics.atRiskGoals || 0 },
      { name: 'Overdue Goals', value: metrics.overdueGoals || 0 },
      { name: 'Total Reviews', value: metrics.totalReviews || 0 },
      { name: 'Completed Reviews', value: metrics.completedReviews || 0 },
      { name: 'Average Review Rating', value: (metrics.avgReviewRating || 0).toFixed(2) },
      { name: 'Average Productivity', value: (metrics.avgProductivity || 0).toFixed(2) },
      { name: 'Average Quality', value: (metrics.avgQuality || 0).toFixed(2) },
      { name: 'Average Collaboration', value: (metrics.avgCollaboration || 0).toFixed(2) },
      { name: 'Performance Score', value: (metrics.performanceScore || 0).toFixed(2) },
      { name: 'Wellbeing Score', value: (metrics.avgWellbeingScore || 0).toFixed(2) },
      { name: 'Average Workload Hours', value: (metrics.avgWorkloadHours || 0).toFixed(1) },
      { name: 'Total Feedback', value: metrics.totalFeedback || 0 },
      { name: 'Positive Feedback', value: metrics.positiveFeedback || 0 },
      { name: 'Constructive Feedback', value: metrics.constructiveFeedback || 0 },
    ];

    metricsArray.forEach((metric, i) => {
      const status = this.getMetricStatus(metric.name, metric.value);
      const row = sheet.addRow([metric.name, metric.value, status]);
      if (i % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf7fafc' } };
      }
    });
  }

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

    worksheet.addRow(['Report Title', reportData.title]);
    worksheet.addRow(['Summary', reportData.summary]);
    worksheet.addRow([]);

    if (reportData.data) {
      const metricsData = reportData.data.currentWeek ||
        reportData.data.currentMonth ||
        reportData.data.currentQuarter ||
        reportData.data.currentYear;

      if (metricsData) {
        worksheet.addRow(['Metric', 'Value']);
        Object.entries(metricsData).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            worksheet.addRow([key, value]);
          }
        });
        worksheet.addRow([]);
      }
    }

    if (reportData.insights && reportData.insights.length > 0) {
      worksheet.addRow(['Key Insights']);
      reportData.insights.forEach((insight: string) => {
        worksheet.addRow([insight]);
      });
      worksheet.addRow([]);
    }

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

  async getReportUrl(filepath: string, reportId?: string, format?: string): Promise<string> {
    if (reportId && format) {
      return `/api/v1/reports/${reportId}/download?format=${format}`;
    }
    return filepath;
  }
}

export const reportExportService = new ReportExportService();
