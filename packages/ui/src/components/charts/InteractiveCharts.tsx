/**
 * Interactive Chart Components
 *
 * Enterprise-grade, accessible charts with drill-down,
 * annotations, comparisons, and real-time updates.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';

// ============================================================================
// CHART TYPES
// ============================================================================

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  id: string;
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'scatter';
  hidden?: boolean;
  yAxisId?: string;
}

export interface ChartAnnotation {
  id: string;
  type: 'line' | 'band' | 'point' | 'text';
  position: 'x' | 'y' | 'xy';
  value: number | string | Date | [number | string | Date, number | string | Date];
  label?: string;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface ChartConfig {
  title?: string;
  subtitle?: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig | AxisConfig[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  annotations?: ChartAnnotation[];
  responsive?: boolean;
  aspectRatio?: number;
  theme?: 'light' | 'dark';
}

export interface AxisConfig {
  id?: string;
  type: 'linear' | 'logarithmic' | 'time' | 'category';
  label?: string;
  min?: number;
  max?: number;
  tickFormat?: (value: unknown) => string;
  gridLines?: boolean;
  position?: 'left' | 'right' | 'top' | 'bottom';
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  interactive?: boolean;
}

export interface TooltipConfig {
  show: boolean;
  format?: (point: ChartDataPoint, series: ChartSeries) => ReactNode;
  shared?: boolean;
  followCursor?: boolean;
}

export interface ChartInteraction {
  type: 'click' | 'hover' | 'brush' | 'zoom';
  point?: ChartDataPoint;
  series?: ChartSeries;
  range?: { start: unknown; end: unknown };
}

// ============================================================================
// BASE CHART COMPONENT
// ============================================================================

interface BaseChartProps {
  series: ChartSeries[];
  config: ChartConfig;
  loading?: boolean;
  error?: string;
  onInteraction?: (interaction: ChartInteraction) => void;
  onDrillDown?: (point: ChartDataPoint, series: ChartSeries) => void;
  className?: string;
  height?: number | string;
}

export const BaseChart: React.FC<BaseChartProps> = ({
  series,
  config,
  loading,
  error,
  onInteraction,
  onDrillDown,
  className = '',
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: ChartDataPoint;
    series: ChartSeries;
    x: number;
    y: number;
  } | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.map(s => s.id))
  );

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: typeof height === 'number' ? height : entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  // Calculate chart dimensions
  const chartDimensions = useMemo(() => {
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };

    if (config.legend?.show) {
      switch (config.legend.position) {
        case 'top':
          padding.top += 40;
          break;
        case 'bottom':
          padding.bottom += 40;
          break;
        case 'left':
          padding.left += 120;
          break;
        case 'right':
          padding.right += 120;
          break;
      }
    }

    return {
      ...padding,
      chartWidth: Math.max(0, dimensions.width - padding.left - padding.right),
      chartHeight: Math.max(0, dimensions.height - padding.top - padding.bottom),
    };
  }, [dimensions, config.legend]);

  // Calculate scales
  const scales = useMemo(() => {
    const filteredSeries = series.filter(s => visibleSeries.has(s.id));

    if (filteredSeries.length === 0 || chartDimensions.chartWidth <= 0) {
      return null;
    }

    const allPoints = filteredSeries.flatMap(s => s.data);

    // X Scale
    let xMin: number, xMax: number;
    if (config.xAxis.type === 'time') {
      const times = allPoints.map(p =>
        p.x instanceof Date ? p.x.getTime() : new Date(p.x as string).getTime()
      );
      xMin = config.xAxis.min ?? Math.min(...times);
      xMax = config.xAxis.max ?? Math.max(...times);
    } else if (config.xAxis.type === 'category') {
      xMin = 0;
      xMax = allPoints.length - 1;
    } else {
      const values = allPoints.map(p => Number(p.x));
      xMin = config.xAxis.min ?? Math.min(...values);
      xMax = config.xAxis.max ?? Math.max(...values);
    }

    // Y Scale
    const yValues = allPoints.map(p => p.y);
    const yMin = (config.yAxis as AxisConfig).min ?? Math.min(0, Math.min(...yValues));
    const yMax = (config.yAxis as AxisConfig).max ?? Math.max(...yValues) * 1.1;

    return {
      x: {
        min: xMin,
        max: xMax,
        range: xMax - xMin || 1,
        toPixel: (value: number) =>
          ((value - xMin) / (xMax - xMin || 1)) * chartDimensions.chartWidth,
        toValue: (pixel: number) =>
          (pixel / chartDimensions.chartWidth) * (xMax - xMin) + xMin,
      },
      y: {
        min: yMin,
        max: yMax,
        range: yMax - yMin || 1,
        toPixel: (value: number) =>
          chartDimensions.chartHeight - ((value - yMin) / (yMax - yMin || 1)) * chartDimensions.chartHeight,
        toValue: (pixel: number) =>
          ((chartDimensions.chartHeight - pixel) / chartDimensions.chartHeight) * (yMax - yMin) + yMin,
      },
    };
  }, [series, visibleSeries, chartDimensions, config.xAxis, config.yAxis]);

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || !scales) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = dimensions.width * dpr;
    canvasRef.current.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid
    if ((config.yAxis as AxisConfig).gridLines !== false) {
      ctx.strokeStyle = config.theme === 'dark' ? '#374151' : '#E5E7EB';
      ctx.lineWidth = 1;

      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const y = chartDimensions.top + (chartDimensions.chartHeight / yTicks) * i;
        ctx.beginPath();
        ctx.moveTo(chartDimensions.left, y);
        ctx.lineTo(chartDimensions.left + chartDimensions.chartWidth, y);
        ctx.stroke();
      }
    }

    // Draw axes
    ctx.strokeStyle = config.theme === 'dark' ? '#6B7280' : '#9CA3AF';
    ctx.lineWidth = 2;

    // Y Axis
    ctx.beginPath();
    ctx.moveTo(chartDimensions.left, chartDimensions.top);
    ctx.lineTo(chartDimensions.left, chartDimensions.top + chartDimensions.chartHeight);
    ctx.stroke();

    // X Axis
    ctx.beginPath();
    ctx.moveTo(chartDimensions.left, chartDimensions.top + chartDimensions.chartHeight);
    ctx.lineTo(chartDimensions.left + chartDimensions.chartWidth, chartDimensions.top + chartDimensions.chartHeight);
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = config.theme === 'dark' ? '#D1D5DB' : '#374151';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    // Y axis ticks
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const value = scales.y.min + (scales.y.range / yTicks) * (yTicks - i);
      const y = chartDimensions.top + (chartDimensions.chartHeight / yTicks) * i;
      ctx.textAlign = 'right';
      ctx.fillText(
        (config.yAxis as AxisConfig).tickFormat?.(value) ?? value.toFixed(1),
        chartDimensions.left - 10,
        y + 4
      );
    }

    // Draw series
    const filteredSeries = series.filter(s => visibleSeries.has(s.id));
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    filteredSeries.forEach((s, seriesIndex) => {
      const color = s.color || colors[seriesIndex % colors.length];

      if (s.type === 'bar' || (!s.type && config.xAxis.type === 'category')) {
        // Bar chart
        const barWidth = chartDimensions.chartWidth / (s.data.length * filteredSeries.length + 1) * 0.8;
        const barOffset = barWidth * seriesIndex;

        s.data.forEach((point, i) => {
          const x = chartDimensions.left + (i + 0.5) * (chartDimensions.chartWidth / s.data.length) + barOffset - (barWidth * filteredSeries.length / 2);
          const barHeight = (point.y - scales.y.min) / scales.y.range * chartDimensions.chartHeight;
          const y = chartDimensions.top + chartDimensions.chartHeight - barHeight;

          ctx.fillStyle = color;
          ctx.fillRect(x, y, barWidth, barHeight);
        });
      } else if (s.type === 'area') {
        // Area chart
        ctx.beginPath();
        ctx.moveTo(
          chartDimensions.left,
          chartDimensions.top + chartDimensions.chartHeight
        );

        s.data.forEach((point, i) => {
          const x = chartDimensions.left + scales.x.toPixel(
            config.xAxis.type === 'time'
              ? (point.x instanceof Date ? point.x.getTime() : new Date(point.x as string).getTime())
              : config.xAxis.type === 'category' ? i : Number(point.x)
          );
          const y = chartDimensions.top + scales.y.toPixel(point.y);

          if (i === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.lineTo(
          chartDimensions.left + chartDimensions.chartWidth,
          chartDimensions.top + chartDimensions.chartHeight
        );
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, chartDimensions.top, 0, chartDimensions.top + chartDimensions.chartHeight);
        gradient.addColorStop(0, `${color}40`);
        gradient.addColorStop(1, `${color}00`);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line on top
        ctx.beginPath();
        s.data.forEach((point, i) => {
          const x = chartDimensions.left + scales.x.toPixel(
            config.xAxis.type === 'time'
              ? (point.x instanceof Date ? point.x.getTime() : new Date(point.x as string).getTime())
              : config.xAxis.type === 'category' ? i : Number(point.x)
          );
          const y = chartDimensions.top + scales.y.toPixel(point.y);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Line chart (default)
        ctx.beginPath();
        s.data.forEach((point, i) => {
          const x = chartDimensions.left + scales.x.toPixel(
            config.xAxis.type === 'time'
              ? (point.x instanceof Date ? point.x.getTime() : new Date(point.x as string).getTime())
              : config.xAxis.type === 'category' ? i : Number(point.x)
          );
          const y = chartDimensions.top + scales.y.toPixel(point.y);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw points
        s.data.forEach((point, i) => {
          const x = chartDimensions.left + scales.x.toPixel(
            config.xAxis.type === 'time'
              ? (point.x instanceof Date ? point.x.getTime() : new Date(point.x as string).getTime())
              : config.xAxis.type === 'category' ? i : Number(point.x)
          );
          const y = chartDimensions.top + scales.y.toPixel(point.y);

          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    });

    // Draw annotations
    config.annotations?.forEach(annotation => {
      ctx.strokeStyle = annotation.color || '#EF4444';
      ctx.setLineDash(annotation.style === 'dashed' ? [5, 5] : annotation.style === 'dotted' ? [2, 2] : []);
      ctx.lineWidth = 2;

      if (annotation.type === 'line' && annotation.position === 'y') {
        const y = chartDimensions.top + scales.y.toPixel(annotation.value as number);
        ctx.beginPath();
        ctx.moveTo(chartDimensions.left, y);
        ctx.lineTo(chartDimensions.left + chartDimensions.chartWidth, y);
        ctx.stroke();

        if (annotation.label) {
          ctx.fillStyle = annotation.color || '#EF4444';
          ctx.font = '11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(annotation.label, chartDimensions.left + 5, y - 5);
        }
      }
    });

    ctx.setLineDash([]);
  }, [series, scales, visibleSeries, dimensions, chartDimensions, config]);

  // Handle mouse events
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !scales) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if within chart area
    if (
      x < chartDimensions.left ||
      x > chartDimensions.left + chartDimensions.chartWidth ||
      y < chartDimensions.top ||
      y > chartDimensions.top + chartDimensions.chartHeight
    ) {
      setHoveredPoint(null);
      return;
    }

    // Find nearest point
    let nearestDistance = Infinity;
    let nearest: typeof hoveredPoint = null;

    series.filter(s => visibleSeries.has(s.id)).forEach(s => {
      s.data.forEach((point, i) => {
        const px = chartDimensions.left + scales.x.toPixel(
          config.xAxis.type === 'time'
            ? (point.x instanceof Date ? point.x.getTime() : new Date(point.x as string).getTime())
            : config.xAxis.type === 'category' ? i : Number(point.x)
        );
        const py = chartDimensions.top + scales.y.toPixel(point.y);
        const distance = Math.sqrt((px - x) ** 2 + (py - y) ** 2);

        if (distance < nearestDistance && distance < 30) {
          nearestDistance = distance;
          nearest = { point, series: s, x: px, y: py };
        }
      });
    });

    setHoveredPoint(nearest);

    if (nearest) {
      onInteraction?.({ type: 'hover', point: nearest.point, series: nearest.series });
    }
  }, [scales, chartDimensions, series, visibleSeries, config.xAxis.type, onInteraction]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (hoveredPoint) {
      onInteraction?.({ type: 'click', point: hoveredPoint.point, series: hoveredPoint.series });
      onDrillDown?.(hoveredPoint.point, hoveredPoint.series);
    }
  }, [hoveredPoint, onInteraction, onDrillDown]);

  const toggleSeries = useCallback((seriesId: string) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesId)) {
        newSet.delete(seriesId);
      } else {
        newSet.add(seriesId);
      }
      return newSet;
    });
  }, []);

  if (error) {
    return (
      <div className={`chart-container chart-error ${className}`} role="alert">
        <p>Failed to load chart: {error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`chart-container ${className}`}
      style={{ height }}
      role="img"
      aria-label={config.title || 'Chart'}
    >
      {loading && (
        <div className="chart-loading" aria-live="polite">
          Loading chart data...
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
        onClick={handleClick}
      />

      {/* Tooltip */}
      {hoveredPoint && config.tooltip?.show !== false && (
        <div
          className="chart-tooltip"
          style={{
            left: hoveredPoint.x,
            top: hoveredPoint.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
          role="tooltip"
        >
          {config.tooltip?.format ? (
            config.tooltip.format(hoveredPoint.point, hoveredPoint.series)
          ) : (
            <>
              <div className="tooltip-series">{hoveredPoint.series.name}</div>
              <div className="tooltip-value">{hoveredPoint.point.y.toFixed(2)}</div>
              {hoveredPoint.point.label && (
                <div className="tooltip-label">{hoveredPoint.point.label}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Legend */}
      {config.legend?.show && (
        <div
          className={`chart-legend legend-${config.legend.position}`}
          role="list"
          aria-label="Chart legend"
        >
          {series.map((s, i) => (
            <button
              key={s.id}
              className={`legend-item ${!visibleSeries.has(s.id) ? 'hidden' : ''}`}
              onClick={() => config.legend?.interactive && toggleSeries(s.id)}
              role="listitem"
              aria-pressed={visibleSeries.has(s.id)}
            >
              <span
                className="legend-color"
                style={{ backgroundColor: s.color || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5] }}
              />
              <span className="legend-label">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TREND CHART
// ============================================================================

interface TrendChartProps {
  data: ChartSeries[];
  title?: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  comparison?: ChartSeries[];
  showProjection?: boolean;
  annotations?: ChartAnnotation[];
  onDrillDown?: (point: ChartDataPoint, series: ChartSeries) => void;
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  period,
  comparison,
  showProjection,
  annotations = [],
  onDrillDown,
  height = 300,
}) => {
  const allSeries = useMemo(() => {
    const series = [...data];

    // Add comparison series with different styling
    if (comparison) {
      comparison.forEach(s => {
        series.push({
          ...s,
          id: `${s.id}-comparison`,
          name: `${s.name} (Previous)`,
          type: 'line',
          color: `${s.color}80`, // Faded
        });
      });
    }

    // Add projection
    if (showProjection && data.length > 0) {
      const lastSeries = data[0];
      const lastPoints = lastSeries.data.slice(-3);

      if (lastPoints.length >= 2) {
        // Simple linear projection
        const slope = (lastPoints[lastPoints.length - 1].y - lastPoints[0].y) / (lastPoints.length - 1);
        const lastY = lastPoints[lastPoints.length - 1].y;

        const projectionData: ChartDataPoint[] = [
          lastPoints[lastPoints.length - 1],
          ...Array.from({ length: 3 }, (_, i) => ({
            x: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
            y: lastY + slope * (i + 1),
            label: 'Projected',
          })),
        ];

        series.push({
          id: 'projection',
          name: 'Projection',
          data: projectionData,
          type: 'line',
          color: '#9CA3AF',
        });
      }
    }

    return series;
  }, [data, comparison, showProjection]);

  const config: ChartConfig = {
    title,
    xAxis: {
      type: 'time',
      label: period,
      gridLines: true,
    },
    yAxis: {
      type: 'linear',
      gridLines: true,
    },
    legend: {
      show: allSeries.length > 1,
      position: 'bottom',
      interactive: true,
    },
    tooltip: {
      show: true,
      shared: true,
    },
    annotations,
  };

  return (
    <BaseChart
      series={allSeries}
      config={config}
      onDrillDown={onDrillDown}
      height={height}
      className="trend-chart"
    />
  );
};

// ============================================================================
// COMPARISON CHART
// ============================================================================

interface ComparisonChartProps {
  data: ChartSeries[];
  type: 'bar' | 'horizontal-bar' | 'radar' | 'boxplot';
  groupBy: string;
  benchmark?: number;
  showDifference?: boolean;
  onDrillDown?: (point: ChartDataPoint, series: ChartSeries) => void;
  height?: number;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  type,
  groupBy,
  benchmark,
  showDifference,
  onDrillDown,
  height = 300,
}) => {
  const annotations: ChartAnnotation[] = [];

  if (benchmark !== undefined) {
    annotations.push({
      id: 'benchmark',
      type: 'line',
      position: 'y',
      value: benchmark,
      label: `Benchmark: ${benchmark}`,
      color: '#EF4444',
      style: 'dashed',
    });
  }

  const seriesWithType = data.map(s => ({
    ...s,
    type: type === 'bar' || type === 'horizontal-bar' ? 'bar' as const : 'line' as const,
  }));

  const config: ChartConfig = {
    xAxis: {
      type: 'category',
      label: groupBy,
    },
    yAxis: {
      type: 'linear',
      gridLines: true,
    },
    legend: {
      show: data.length > 1,
      position: 'top',
      interactive: true,
    },
    tooltip: {
      show: true,
      format: (point, series) => (
        <div className="comparison-tooltip">
          <div className="tooltip-header">{series.name}</div>
          <div className="tooltip-value">{point.y.toFixed(2)}</div>
          {benchmark !== undefined && showDifference && (
            <div className={`tooltip-diff ${point.y >= benchmark ? 'positive' : 'negative'}`}>
              {point.y >= benchmark ? '+' : ''}{(point.y - benchmark).toFixed(2)} vs benchmark
            </div>
          )}
        </div>
      ),
    },
    annotations,
  };

  return (
    <BaseChart
      series={seriesWithType}
      config={config}
      onDrillDown={onDrillDown}
      height={height}
      className="comparison-chart"
    />
  );
};

// ============================================================================
// HEATMAP
// ============================================================================

interface HeatmapProps {
  data: {
    xLabels: string[];
    yLabels: string[];
    values: number[][];
  };
  colorScale: 'performance' | 'risk' | 'sequential' | 'diverging';
  showValues?: boolean;
  onCellClick?: (x: string, y: string, value: number) => void;
  height?: number;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  colorScale,
  showValues = true,
  onCellClick,
  height = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const colorScales = {
    performance: ['#EF4444', '#F59E0B', '#FCD34D', '#10B981', '#059669'],
    risk: ['#059669', '#10B981', '#FCD34D', '#F59E0B', '#EF4444'],
    sequential: ['#EFF6FF', '#BFDBFE', '#60A5FA', '#2563EB', '#1E40AF'],
    diverging: ['#EF4444', '#FCA5A5', '#F3F4F6', '#93C5FD', '#3B82F6'],
  };

  const colors = colorScales[colorScale];
  const allValues = data.values.flat();
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1);
    return colors[index];
  };

  const cellWidth = 100 / data.xLabels.length;
  const cellHeight = (height - 60) / data.yLabels.length;

  return (
    <div
      ref={containerRef}
      className="heatmap-container"
      style={{ height }}
      role="grid"
      aria-label="Heatmap"
    >
      {/* X axis labels */}
      <div className="heatmap-x-labels" style={{ marginLeft: '80px' }}>
        {data.xLabels.map((label, i) => (
          <div
            key={i}
            className="heatmap-x-label"
            style={{ width: `${cellWidth}%` }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="heatmap-grid" style={{ display: 'flex' }}>
        {/* Y axis labels */}
        <div className="heatmap-y-labels" style={{ width: '80px', flexShrink: 0 }}>
          {data.yLabels.map((label, i) => (
            <div
              key={i}
              className="heatmap-y-label"
              style={{ height: `${cellHeight}px` }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="heatmap-cells" style={{ flex: 1 }}>
          {data.yLabels.map((yLabel, yi) => (
            <div key={yi} className="heatmap-row" style={{ display: 'flex' }}>
              {data.xLabels.map((xLabel, xi) => {
                const value = data.values[yi]?.[xi] ?? 0;
                const isHovered = hoveredCell?.x === xi && hoveredCell?.y === yi;

                return (
                  <div
                    key={xi}
                    className={`heatmap-cell ${isHovered ? 'hovered' : ''}`}
                    style={{
                      width: `${cellWidth}%`,
                      height: `${cellHeight}px`,
                      backgroundColor: getColor(value),
                    }}
                    onMouseEnter={() => setHoveredCell({ x: xi, y: yi })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => onCellClick?.(xLabel, yLabel, value)}
                    role="gridcell"
                    aria-label={`${xLabel} - ${yLabel}: ${value}`}
                    tabIndex={0}
                    onKeyPress={e => {
                      if (e.key === 'Enter') onCellClick?.(xLabel, yLabel, value);
                    }}
                  >
                    {showValues && (
                      <span className="cell-value">{value.toFixed(1)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span>{minValue.toFixed(1)}</span>
        <div className="legend-gradient" style={{
          background: `linear-gradient(to right, ${colors.join(', ')})`,
        }} />
        <span>{maxValue.toFixed(1)}</span>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="heatmap-tooltip"
          style={{
            position: 'absolute',
            // Position would be calculated based on cell position
          }}
        >
          <div>{data.xLabels[hoveredCell.x]} / {data.yLabels[hoveredCell.y]}</div>
          <div className="tooltip-value">
            {data.values[hoveredCell.y]?.[hoveredCell.x]?.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PROGRESS RING
// ============================================================================

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  label,
  showValue = true,
  animated = true,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (animated) {
      const duration = 1000;
      const start = animatedValue;
      const end = value;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        setAnimatedValue(start + (end - start) * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedValue(value);
    }
  }, [value, animated]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / max) * circumference;

  return (
    <div
      className="progress-ring"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || `Progress: ${value}%`}
    >
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: animated ? 'none' : 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      {showValue && (
        <div className="progress-ring-value">
          <span className="value">{Math.round(animatedValue)}</span>
          <span className="unit">%</span>
        </div>
      )}
      {label && <div className="progress-ring-label">{label}</div>}
    </div>
  );
};

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  format?: 'number' | 'percentage' | 'currency' | 'decimal';
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  icon?: ReactNode;
  color?: 'default' | 'success' | 'warning' | 'error';
  sparklineData?: number[];
  onClick?: () => void;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  format = 'number',
  trend,
  trendLabel,
  icon,
  color = 'default',
  sparklineData,
  onClick,
  loading,
}) => {
  const formattedValue = useMemo(() => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(value);
      case 'decimal':
        return value.toFixed(2);
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  }, [value, format]);

  const calculatedTrend = useMemo(() => {
    if (trend) return trend;
    if (previousValue === undefined || typeof value !== 'number') return 'neutral';
    return value > previousValue ? 'up' : value < previousValue ? 'down' : 'neutral';
  }, [trend, value, previousValue]);

  const percentageChange = useMemo(() => {
    if (previousValue === undefined || previousValue === 0 || typeof value !== 'number') return null;
    return ((value - previousValue) / previousValue) * 100;
  }, [value, previousValue]);

  return (
    <div
      className={`metric-card metric-card-${color} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={e => e.key === 'Enter' && onClick?.()}
    >
      {loading ? (
        <div className="metric-card-skeleton">
          <div className="skeleton-line skeleton-lg" />
          <div className="skeleton-line skeleton-sm" />
        </div>
      ) : (
        <>
          <div className="metric-card-header">
            <span className="metric-title">{title}</span>
            {icon && <span className="metric-icon">{icon}</span>}
          </div>

          <div className="metric-value">{formattedValue}</div>

          <div className="metric-footer">
            {calculatedTrend !== 'neutral' && (
              <span className={`metric-trend trend-${calculatedTrend}`}>
                {calculatedTrend === 'up' ? '↑' : '↓'}
                {percentageChange !== null && (
                  <span className="trend-value">
                    {Math.abs(percentageChange).toFixed(1)}%
                  </span>
                )}
              </span>
            )}
            {trendLabel && (
              <span className="metric-trend-label">{trendLabel}</span>
            )}
          </div>

          {sparklineData && sparklineData.length > 0 && (
            <div className="metric-sparkline">
              <svg viewBox={`0 0 ${sparklineData.length * 10} 30`} preserveAspectRatio="none">
                <path
                  d={sparklineData.map((v, i) => {
                    const x = i * 10;
                    const y = 30 - (v / Math.max(...sparklineData)) * 28;
                    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export {
  ChartDataPoint,
  ChartSeries,
  ChartConfig,
  ChartAnnotation,
  ChartInteraction,
};
