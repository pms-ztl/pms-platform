import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';
import { dataAggregationService } from '../reporting/data-aggregation.service';

export interface TransformOptions {
  groupBy?: string;
  aggregateBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  filters?: Record<string, any>;
}

/**
 * Data Transformer Service
 *
 * Transforms raw data into formats suitable for different chart types
 */
export class DataTransformerService {
  /**
   * Transform data for line/area charts
   */
  transformForLineChart(data: any[], xField: string, yFields: string[]): any {
    return {
      labels: data.map(item => item[xField]),
      datasets: yFields.map(field => ({
        label: this.formatLabel(field),
        data: data.map(item => item[field]),
      })),
    };
  }

  /**
   * Transform data for bar charts
   */
  transformForBarChart(data: any[], labelField: string, valueField: string): any {
    return {
      labels: data.map(item => item[labelField]),
      datasets: [{
        label: this.formatLabel(valueField),
        data: data.map(item => item[valueField]),
      }],
    };
  }

  /**
   * Transform data for radar charts
   */
  transformForRadarChart(data: any[], categories: string[], valueFields: string[]): any {
    return {
      labels: categories,
      datasets: valueFields.map(field => ({
        label: this.formatLabel(field),
        data: categories.map(category => {
          const item = data.find(d => d.category === category);
          return item ? item[field] : 0;
        }),
      })),
    };
  }

  /**
   * Transform data for pie/donut charts
   */
  transformForPieChart(data: any[], labelField: string, valueField: string): any {
    return {
      labels: data.map(item => item[labelField]),
      datasets: [{
        data: data.map(item => item[valueField]),
      }],
    };
  }

  /**
   * Transform data for heatmap
   */
  transformForHeatmap(data: any[], xField: string, yField: string, valueField: string): any {
    const xValues = [...new Set(data.map(item => item[xField]))].sort();
    const yValues = [...new Set(data.map(item => item[yField]))].sort();

    const heatmapData = yValues.map(y => ({
      y,
      data: xValues.map(x => {
        const item = data.find(d => d[xField] === x && d[yField] === y);
        return item ? item[valueField] : null;
      }),
    }));

    return {
      xAxis: xValues,
      yAxis: yValues,
      data: heatmapData,
    };
  }

  /**
   * Transform data for calendar heatmap
   */
  transformForCalendarHeatmap(data: any[], dateField: string, valueField: string): any {
    const calendarData = data.map(item => ({
      date: item[dateField],
      value: item[valueField],
    }));

    return {
      data: calendarData,
      min: Math.min(...data.map(item => item[valueField])),
      max: Math.max(...data.map(item => item[valueField])),
    };
  }

  /**
   * Transform data for Gantt chart
   */
  transformForGanttChart(data: any[]): any {
    return data.map(item => ({
      id: item.id,
      name: item.name,
      start: new Date(item.startDate),
      end: new Date(item.endDate),
      progress: item.progress || 0,
      dependencies: item.dependencies || [],
      resource: item.assignee || null,
      status: item.status,
    }));
  }

  /**
   * Transform data for timeline
   */
  transformForTimeline(events: any[]): any {
    const sortedEvents = events.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      events: sortedEvents.map(event => ({
        id: event.id,
        date: event.date,
        title: event.title,
        description: event.description,
        category: event.category,
        icon: event.icon,
        color: event.color,
      })),
    };
  }

  /**
   * Transform data for box plot
   */
  transformForBoxPlot(data: any[], groupField: string, valueField: string): any {
    const groups = [...new Set(data.map(item => item[groupField]))];

    const boxPlotData = groups.map(group => {
      const groupData = data
        .filter(item => item[groupField] === group)
        .map(item => item[valueField])
        .sort((a, b) => a - b);

      const q1 = this.calculatePercentile(groupData, 25);
      const median = this.calculatePercentile(groupData, 50);
      const q3 = this.calculatePercentile(groupData, 75);
      const iqr = q3 - q1;
      const min = Math.max(groupData[0], q1 - 1.5 * iqr);
      const max = Math.min(groupData[groupData.length - 1], q3 + 1.5 * iqr);

      const outliers = groupData.filter(val => val < min || val > max);

      return {
        group,
        min,
        q1,
        median,
        q3,
        max,
        outliers,
        mean: groupData.reduce((a, b) => a + b, 0) / groupData.length,
      };
    });

    return boxPlotData;
  }

  /**
   * Transform data for Sankey diagram
   */
  transformForSankeyDiagram(flows: any[]): any {
    const nodes = new Set<string>();
    flows.forEach(flow => {
      nodes.add(flow.source);
      nodes.add(flow.target);
    });

    return {
      nodes: Array.from(nodes).map((name, index) => ({ id: index, name })),
      links: flows.map(flow => ({
        source: Array.from(nodes).indexOf(flow.source),
        target: Array.from(nodes).indexOf(flow.target),
        value: flow.value,
      })),
    };
  }

  /**
   * Transform data for KPI tree
   */
  transformForKPITree(kpis: any[]): any {
    const buildTree = (parentId: string | null): any[] => {
      return kpis
        .filter(kpi => kpi.parentId === parentId)
        .map(kpi => ({
          id: kpi.id,
          name: kpi.name,
          value: kpi.value,
          target: kpi.target,
          status: kpi.status,
          children: buildTree(kpi.id),
        }));
    };

    return buildTree(null);
  }

  /**
   * Transform data for burndown chart
   */
  transformForBurndownChart(data: any[]): any {
    return {
      ideal: data.map((item, index) => {
        const total = data[0].remaining;
        const perDay = total / data.length;
        return total - (perDay * index);
      }),
      actual: data.map(item => item.remaining),
      dates: data.map(item => item.date),
    };
  }

  /**
   * Transform data for leaderboard
   */
  transformForLeaderboard(entries: any[]): any {
    return entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      userName: entry.userName,
      avatar: entry.avatar,
      score: entry.score,
      previousRank: entry.previousRank,
      rankChange: entry.previousRank ? entry.previousRank - (index + 1) : 0,
      trend: this.calculateTrend(entry.previousRank, index + 1),
      badges: entry.badges || [],
      level: entry.level,
    }));
  }

  /**
   * Transform data for geographic map
   */
  transformForGeographicMap(data: any[]): any {
    return data.map(item => ({
      country: item.countryCode,
      countryName: item.countryName,
      region: item.regionCode,
      city: item.cityName,
      lat: item.latitude,
      lng: item.longitude,
      value: item.value,
      label: item.label,
      metrics: item.metrics || {},
    }));
  }

  /**
   * Aggregate data by period
   */
  async aggregateByPeriod(
    data: any[],
    dateField: string,
    valueFields: string[],
    periodType: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Promise<any[]> {
    const grouped = new Map<string, any>();

    data.forEach(item => {
      const date = new Date(item[dateField]);
      const periodKey = this.getPeriodKey(date, periodType);

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, {
          period: periodKey,
          date: date,
          count: 0,
          ...Object.fromEntries(valueFields.map(field => [field, 0])),
        });
      }

      const group = grouped.get(periodKey)!;
      group.count++;

      valueFields.forEach(field => {
        group[field] += Number(item[field]) || 0;
      });
    });

    // Calculate averages
    const result = Array.from(grouped.values()).map(group => {
      const avg: any = { ...group };
      valueFields.forEach(field => {
        avg[field] = group[field] / group.count;
      });
      return avg;
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sorted: number[], percentile: number): number {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(previousRank: number | null, currentRank: number): 'up' | 'down' | 'stable' {
    if (!previousRank) return 'stable';
    if (previousRank > currentRank) return 'up';
    if (previousRank < currentRank) return 'down';
    return 'stable';
  }

  /**
   * Get period key for grouping
   */
  private getPeriodKey(date: Date, periodType: string): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (periodType) {
      case 'day':
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'month':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      case 'year':
        return `${year}`;
      default:
        return date.toISOString();
    }
  }

  /**
   * Get week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Format label for display
   */
  private formatLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Apply filters to data
   */
  applyFilters(data: any[], filters: Record<string, any>): any[] {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined) return true;

        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }

        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          return item[key] >= value.min && item[key] <= value.max;
        }

        return item[key] === value;
      });
    });
  }

  /**
   * Sort data
   */
  sortData(data: any[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): any[] {
    return [...data].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Limit data
   */
  limitData(data: any[], limit: number): any[] {
    return data.slice(0, limit);
  }

  /**
   * Transform with options
   */
  async transform(
    data: any[],
    chartType: string,
    options: TransformOptions = {}
  ): Promise<any> {
    let processedData = [...data];

    // Apply filters
    if (options.filters) {
      processedData = this.applyFilters(processedData, options.filters);
    }

    // Apply sorting
    if (options.sortBy) {
      processedData = this.sortData(processedData, options.sortBy, options.sortOrder);
    }

    // Apply limit
    if (options.limit) {
      processedData = this.limitData(processedData, options.limit);
    }

    // Transform based on chart type
    switch (chartType) {
      case 'LINE':
      case 'AREA':
        return this.transformForLineChart(processedData, 'x', ['y']);
      case 'BAR':
        return this.transformForBarChart(processedData, 'label', 'value');
      case 'PIE':
      case 'DONUT':
        return this.transformForPieChart(processedData, 'label', 'value');
      case 'RADAR':
        return this.transformForRadarChart(processedData, ['category'], ['value']);
      case 'HEATMAP':
        return this.transformForHeatmap(processedData, 'x', 'y', 'value');
      case 'BOX_PLOT':
        return this.transformForBoxPlot(processedData, 'group', 'value');
      case 'GANTT':
        return this.transformForGanttChart(processedData);
      case 'TIMELINE':
        return this.transformForTimeline(processedData);
      case 'SANKEY':
        return this.transformForSankeyDiagram(processedData);
      case 'KPI_TREE':
        return this.transformForKPITree(processedData);
      default:
        return processedData;
    }
  }
}

export const dataTransformerService = new DataTransformerService();
