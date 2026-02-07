/**
 * Drill-Down Analytics Components
 *
 * Advanced analytics with hierarchical drill-down, comparison views,
 * time-series analysis, and contextual insights.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
  useRef,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface DrillDownLevel {
  id: string;
  label: string;
  type: 'organization' | 'department' | 'team' | 'individual' | 'goal' | 'metric' | 'time';
  parentId?: string;
  data: Record<string, unknown>;
  metadata?: {
    count?: number;
    aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
    timeRange?: { start: Date; end: Date };
  };
}

export interface DrillDownPath {
  levels: DrillDownLevel[];
  currentIndex: number;
}

export interface ComparisonConfig {
  enabled: boolean;
  items: ComparisonItem[];
  mode: 'side-by-side' | 'overlay' | 'difference' | 'percentage';
  baselineIndex?: number;
}

export interface ComparisonItem {
  id: string;
  label: string;
  color: string;
  data: TimeSeriesPoint[];
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsFilter {
  id: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between' | 'contains';
  value: unknown;
  label?: string;
}

export interface AnalyticsAggregation {
  field: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct' | 'percentile';
  percentile?: number;
  alias?: string;
}

export interface AnalyticsGroupBy {
  field: string;
  interval?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface AnalyticsQuery {
  filters: AnalyticsFilter[];
  aggregations: AnalyticsAggregation[];
  groupBy: AnalyticsGroupBy[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

export interface InsightData {
  id: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction' | 'benchmark' | 'alert';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  confidence: number;
  relatedMetrics: string[];
  suggestedActions?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DRILL-DOWN CONTEXT
// ============================================================================

interface DrillDownState {
  path: DrillDownPath;
  comparison: ComparisonConfig;
  filters: AnalyticsFilter[];
  query: AnalyticsQuery;
  insights: InsightData[];
  loading: boolean;
  error: string | null;
}

type DrillDownAction =
  | { type: 'DRILL_DOWN'; level: DrillDownLevel }
  | { type: 'DRILL_UP'; toIndex?: number }
  | { type: 'RESET' }
  | { type: 'SET_COMPARISON'; config: Partial<ComparisonConfig> }
  | { type: 'ADD_COMPARISON_ITEM'; item: ComparisonItem }
  | { type: 'REMOVE_COMPARISON_ITEM'; id: string }
  | { type: 'ADD_FILTER'; filter: AnalyticsFilter }
  | { type: 'REMOVE_FILTER'; id: string }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_QUERY'; query: Partial<AnalyticsQuery> }
  | { type: 'SET_INSIGHTS'; insights: InsightData[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null };

const initialState: DrillDownState = {
  path: { levels: [], currentIndex: -1 },
  comparison: { enabled: false, items: [], mode: 'side-by-side' },
  filters: [],
  query: { filters: [], aggregations: [], groupBy: [] },
  insights: [],
  loading: false,
  error: null,
};

function drillDownReducer(state: DrillDownState, action: DrillDownAction): DrillDownState {
  switch (action.type) {
    case 'DRILL_DOWN': {
      const newLevels = [...state.path.levels.slice(0, state.path.currentIndex + 1), action.level];
      return {
        ...state,
        path: {
          levels: newLevels,
          currentIndex: newLevels.length - 1,
        },
      };
    }
    case 'DRILL_UP': {
      const targetIndex = action.toIndex ?? state.path.currentIndex - 1;
      if (targetIndex < 0) return { ...state, path: { levels: [], currentIndex: -1 } };
      return {
        ...state,
        path: {
          ...state.path,
          currentIndex: Math.min(targetIndex, state.path.levels.length - 1),
        },
      };
    }
    case 'RESET':
      return { ...initialState };
    case 'SET_COMPARISON':
      return { ...state, comparison: { ...state.comparison, ...action.config } };
    case 'ADD_COMPARISON_ITEM':
      return {
        ...state,
        comparison: {
          ...state.comparison,
          items: [...state.comparison.items, action.item],
        },
      };
    case 'REMOVE_COMPARISON_ITEM':
      return {
        ...state,
        comparison: {
          ...state.comparison,
          items: state.comparison.items.filter(item => item.id !== action.id),
        },
      };
    case 'ADD_FILTER':
      return { ...state, filters: [...state.filters, action.filter] };
    case 'REMOVE_FILTER':
      return { ...state, filters: state.filters.filter(f => f.id !== action.id) };
    case 'CLEAR_FILTERS':
      return { ...state, filters: [] };
    case 'SET_QUERY':
      return { ...state, query: { ...state.query, ...action.query } };
    case 'SET_INSIGHTS':
      return { ...state, insights: action.insights };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    default:
      return state;
  }
}

interface DrillDownContextValue {
  state: DrillDownState;
  dispatch: React.Dispatch<DrillDownAction>;
  drillDown: (level: DrillDownLevel) => void;
  drillUp: (toIndex?: number) => void;
  reset: () => void;
  toggleComparison: () => void;
  addToComparison: (item: ComparisonItem) => void;
  removeFromComparison: (id: string) => void;
  setComparisonMode: (mode: ComparisonConfig['mode']) => void;
  addFilter: (filter: AnalyticsFilter) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
  currentLevel: DrillDownLevel | null;
  canDrillUp: boolean;
  breadcrumbs: DrillDownLevel[];
}

const DrillDownContext = createContext<DrillDownContextValue | null>(null);

export function useDrillDown(): DrillDownContextValue {
  const context = useContext(DrillDownContext);
  if (!context) {
    throw new Error('useDrillDown must be used within a DrillDownProvider');
  }
  return context;
}

// ============================================================================
// DRILL-DOWN PROVIDER
// ============================================================================

interface DrillDownProviderProps {
  children: React.ReactNode;
  initialLevel?: DrillDownLevel;
  onDrillDown?: (level: DrillDownLevel, path: DrillDownLevel[]) => void;
  onDrillUp?: (level: DrillDownLevel | null, path: DrillDownLevel[]) => void;
  fetchInsights?: (level: DrillDownLevel) => Promise<InsightData[]>;
}

export function DrillDownProvider({
  children,
  initialLevel,
  onDrillDown,
  onDrillUp,
  fetchInsights,
}: DrillDownProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(drillDownReducer, initialState);

  useEffect(() => {
    if (initialLevel && state.path.levels.length === 0) {
      dispatch({ type: 'DRILL_DOWN', level: initialLevel });
    }
  }, [initialLevel, state.path.levels.length]);

  const currentLevel = useMemo(() => {
    if (state.path.currentIndex < 0) return null;
    return state.path.levels[state.path.currentIndex] ?? null;
  }, [state.path]);

  const breadcrumbs = useMemo(() => {
    return state.path.levels.slice(0, state.path.currentIndex + 1);
  }, [state.path]);

  const canDrillUp = state.path.currentIndex > 0;

  const drillDown = useCallback((level: DrillDownLevel) => {
    dispatch({ type: 'DRILL_DOWN', level });
    onDrillDown?.(level, [...state.path.levels, level]);

    if (fetchInsights) {
      dispatch({ type: 'SET_LOADING', loading: true });
      fetchInsights(level)
        .then(insights => dispatch({ type: 'SET_INSIGHTS', insights }))
        .catch(err => dispatch({ type: 'SET_ERROR', error: err.message }))
        .finally(() => dispatch({ type: 'SET_LOADING', loading: false }));
    }
  }, [state.path.levels, onDrillDown, fetchInsights]);

  const drillUp = useCallback((toIndex?: number) => {
    dispatch({ type: 'DRILL_UP', toIndex });
    const targetIndex = toIndex ?? state.path.currentIndex - 1;
    const targetLevel = targetIndex >= 0 ? state.path.levels[targetIndex] : null;
    onDrillUp?.(targetLevel, state.path.levels.slice(0, targetIndex + 1));
  }, [state.path, onDrillUp]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const toggleComparison = useCallback(() => {
    dispatch({ type: 'SET_COMPARISON', config: { enabled: !state.comparison.enabled } });
  }, [state.comparison.enabled]);

  const addToComparison = useCallback((item: ComparisonItem) => {
    dispatch({ type: 'ADD_COMPARISON_ITEM', item });
  }, []);

  const removeFromComparison = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_COMPARISON_ITEM', id });
  }, []);

  const setComparisonMode = useCallback((mode: ComparisonConfig['mode']) => {
    dispatch({ type: 'SET_COMPARISON', config: { mode } });
  }, []);

  const addFilter = useCallback((filter: AnalyticsFilter) => {
    dispatch({ type: 'ADD_FILTER', filter });
  }, []);

  const removeFilter = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FILTER', id });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const value: DrillDownContextValue = {
    state,
    dispatch,
    drillDown,
    drillUp,
    reset,
    toggleComparison,
    addToComparison,
    removeFromComparison,
    setComparisonMode,
    addFilter,
    removeFilter,
    clearFilters,
    currentLevel,
    canDrillUp,
    breadcrumbs,
  };

  return (
    <DrillDownContext.Provider value={value}>
      {children}
    </DrillDownContext.Provider>
  );
}

// ============================================================================
// BREADCRUMB NAVIGATION
// ============================================================================

interface BreadcrumbNavigationProps {
  className?: string;
  maxVisible?: number;
  showHome?: boolean;
  homeLabel?: string;
  onHomeClick?: () => void;
}

export function BreadcrumbNavigation({
  className = '',
  maxVisible = 5,
  showHome = true,
  homeLabel = 'Overview',
  onHomeClick,
}: BreadcrumbNavigationProps): React.ReactElement {
  const { breadcrumbs, drillUp, reset } = useDrillDown();

  const visibleBreadcrumbs = useMemo(() => {
    if (breadcrumbs.length <= maxVisible) return breadcrumbs;
    return [
      breadcrumbs[0],
      { id: 'ellipsis', label: '...', type: 'organization' as const, data: {} },
      ...breadcrumbs.slice(-maxVisible + 2),
    ];
  }, [breadcrumbs, maxVisible]);

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      reset();
    }
  };

  const handleCrumbClick = (index: number) => {
    if (visibleBreadcrumbs[index].id === 'ellipsis') return;

    const actualIndex = breadcrumbs.findIndex(
      b => b.id === visibleBreadcrumbs[index].id
    );
    drillUp(actualIndex);
  };

  return (
    <nav
      className={`flex items-center gap-2 text-sm ${className}`}
      aria-label="Drill-down navigation"
    >
      {showHome && (
        <>
          <button
            onClick={handleHomeClick}
            className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            aria-label="Go to overview"
          >
            {homeLabel}
          </button>
          {breadcrumbs.length > 0 && (
            <span className="text-gray-400" aria-hidden="true">/</span>
          )}
        </>
      )}

      {visibleBreadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          {index > 0 && (
            <span className="text-gray-400" aria-hidden="true">/</span>
          )}
          {index === visibleBreadcrumbs.length - 1 ? (
            <span
              className="text-gray-900 font-medium"
              aria-current="page"
            >
              {crumb.label}
            </span>
          ) : crumb.id === 'ellipsis' ? (
            <span className="text-gray-400">...</span>
          ) : (
            <button
              onClick={() => handleCrumbClick(index)}
              className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            >
              {crumb.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ============================================================================
// DRILL-DOWN VIEW
// ============================================================================

interface DrillDownViewProps {
  className?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  showBreadcrumbs?: boolean;
  showFilters?: boolean;
  showInsights?: boolean;
}

export function DrillDownView({
  className = '',
  children,
  header,
  sidebar,
  footer,
  showBreadcrumbs = true,
  showFilters = true,
  showInsights = true,
}: DrillDownViewProps): React.ReactElement {
  const { state, currentLevel } = useDrillDown();

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      {(showBreadcrumbs || header) && (
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          {showBreadcrumbs && <BreadcrumbNavigation className="mb-2" />}
          {header}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <aside className="flex-shrink-0 w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            {sidebar}
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Active filters */}
          {showFilters && state.filters.length > 0 && (
            <ActiveFilters className="mb-4" />
          )}

          {/* Loading state */}
          {state.loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Error state */}
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{state.error}</p>
            </div>
          )}

          {/* Content */}
          {!state.loading && !state.error && children}
        </main>

        {/* Insights panel */}
        {showInsights && state.insights.length > 0 && (
          <aside className="flex-shrink-0 w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <InsightsPanel insights={state.insights} />
          </aside>
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACTIVE FILTERS
// ============================================================================

interface ActiveFiltersProps {
  className?: string;
}

export function ActiveFilters({ className = '' }: ActiveFiltersProps): React.ReactElement {
  const { state, removeFilter, clearFilters } = useDrillDown();

  const formatFilterValue = (filter: AnalyticsFilter): string => {
    if (Array.isArray(filter.value)) {
      return filter.value.join(', ');
    }
    if (filter.operator === 'between' && typeof filter.value === 'object') {
      const range = filter.value as { start: unknown; end: unknown };
      return `${range.start} - ${range.end}`;
    }
    return String(filter.value);
  };

  const getOperatorLabel = (op: AnalyticsFilter['operator']): string => {
    const labels: Record<AnalyticsFilter['operator'], string> = {
      eq: '=',
      neq: '≠',
      gt: '>',
      gte: '≥',
      lt: '<',
      lte: '≤',
      in: 'in',
      between: 'between',
      contains: 'contains',
    };
    return labels[op];
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-500">Filters:</span>

      {state.filters.map(filter => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          <span className="font-medium">{filter.label || filter.field}</span>
          <span className="text-blue-600">{getOperatorLabel(filter.operator)}</span>
          <span>{formatFilterValue(filter)}</span>
          <button
            onClick={() => removeFilter(filter.id)}
            className="ml-1 hover:text-blue-900 focus:outline-none"
            aria-label={`Remove ${filter.label || filter.field} filter`}
          >
            ×
          </button>
        </span>
      ))}

      {state.filters.length > 1 && (
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// ============================================================================
// INSIGHTS PANEL
// ============================================================================

interface InsightsPanelProps {
  insights: InsightData[];
  className?: string;
}

export function InsightsPanel({ insights, className = '' }: InsightsPanelProps): React.ReactElement {
  const getSeverityStyles = (severity: InsightData['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'success':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getTypeIcon = (type: InsightData['type']) => {
    switch (type) {
      case 'trend':
        return '📈';
      case 'anomaly':
        return '⚠️';
      case 'correlation':
        return '🔗';
      case 'prediction':
        return '🔮';
      case 'benchmark':
        return '📊';
      case 'alert':
        return '🔔';
      default:
        return '💡';
    }
  };

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Insights</h3>

      <div className="space-y-3">
        {insights.map(insight => (
          <div
            key={insight.id}
            className={`p-3 rounded-lg border-l-4 ${getSeverityStyles(insight.severity)}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl" role="img" aria-hidden="true">
                {getTypeIcon(insight.type)}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>

                {insight.confidence < 1 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${insight.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                )}

                {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Suggested Actions:
                    </p>
                    <ul className="text-xs text-gray-600 list-disc list-inside">
                      {insight.suggestedActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPARISON VIEW
// ============================================================================

interface ComparisonViewProps {
  className?: string;
  title?: string;
  height?: number;
}

export function ComparisonView({
  className = '',
  title = 'Comparison',
  height = 400,
}: ComparisonViewProps): React.ReactElement {
  const { state, removeFromComparison, setComparisonMode } = useDrillDown();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    item: ComparisonItem;
    point: TimeSeriesPoint;
    x: number;
    y: number;
  } | null>(null);

  const comparisonModes: { value: ComparisonConfig['mode']; label: string }[] = [
    { value: 'side-by-side', label: 'Side by Side' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'difference', label: 'Difference' },
    { value: 'percentage', label: 'Percentage Change' },
  ];

  // Calculate min/max values across all comparison items
  const { minValue, maxValue, minTime, maxTime } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let minT = Infinity;
    let maxT = -Infinity;

    state.comparison.items.forEach(item => {
      item.data.forEach(point => {
        min = Math.min(min, point.value);
        max = Math.max(max, point.value);
        const time = point.timestamp.getTime();
        minT = Math.min(minT, time);
        maxT = Math.max(maxT, time);
      });
    });

    return {
      minValue: min === Infinity ? 0 : min,
      maxValue: max === -Infinity ? 100 : max,
      minTime: minT === Infinity ? Date.now() - 86400000 : minT,
      maxTime: maxT === -Infinity ? Date.now() : maxT,
    };
  }, [state.comparison.items]);

  // Draw comparison chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || state.comparison.items.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartHeight / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxValue - ((maxValue - minValue) / ySteps) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(1), padding.left - 8, y + 4);
    }

    // Draw each series
    state.comparison.items.forEach((item, seriesIndex) => {
      if (item.data.length === 0) return;

      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      item.data.forEach((point, i) => {
        const x = padding.left + ((point.timestamp.getTime() - minTime) / (maxTime - minTime)) * chartWidth;
        const y = padding.top + ((maxValue - point.value) / (maxValue - minValue)) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      item.data.forEach(point => {
        const x = padding.left + ((point.timestamp.getTime() - minTime) / (maxTime - minTime)) * chartWidth;
        const y = padding.top + ((maxValue - point.value) / (maxValue - minValue)) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
      });
    });

    // Draw legend
    const legendY = rect.height - 15;
    let legendX = padding.left;
    state.comparison.items.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY - 6, 12, 12);
      ctx.fillStyle = '#374151';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 16, legendY + 4);
      legendX += ctx.measureText(item.label).width + 40;
    });
  }, [state.comparison.items, minValue, maxValue, minTime, maxTime, height]);

  if (!state.comparison.enabled || state.comparison.items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">
          No items selected for comparison. Select items to compare.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>

        <div className="flex items-center gap-4">
          {/* Mode selector */}
          <select
            value={state.comparison.mode}
            onChange={e => setComparisonMode(e.target.value as ComparisonConfig['mode'])}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {comparisonModes.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height }}
          className="cursor-crosshair"
        />
      </div>

      {/* Selected items */}
      <div className="flex flex-wrap gap-2 p-4 border-t border-gray-200">
        {state.comparison.items.map(item => (
          <span
            key={item.id}
            className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
            <button
              onClick={() => removeFromComparison(item.id)}
              className="hover:text-red-600 focus:outline-none"
              aria-label={`Remove ${item.label} from comparison`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none"
          style={{
            left: hoveredPoint.x + 10,
            top: hoveredPoint.y - 10,
          }}
        >
          <p className="font-medium">{hoveredPoint.item.label}</p>
          <p>{hoveredPoint.point.value.toFixed(2)}</p>
          <p className="text-gray-400">
            {hoveredPoint.point.timestamp.toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DRILL-DOWN GRID
// ============================================================================

interface DrillDownGridItem {
  id: string;
  label: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  metadata?: Record<string, unknown>;
  drillDownLevel?: DrillDownLevel;
}

interface DrillDownGridProps {
  items: DrillDownGridItem[];
  className?: string;
  columns?: number;
  renderItem?: (item: DrillDownGridItem) => React.ReactNode;
  onItemClick?: (item: DrillDownGridItem) => void;
  enableComparison?: boolean;
}

export function DrillDownGrid({
  items,
  className = '',
  columns = 4,
  renderItem,
  onItemClick,
  enableComparison = true,
}: DrillDownGridProps): React.ReactElement {
  const { drillDown, addToComparison, state } = useDrillDown();
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());

  const handleItemClick = (item: DrillDownGridItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.drillDownLevel) {
      drillDown(item.drillDownLevel);
    }
  };

  const handleAddToComparison = (item: DrillDownGridItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.drillDownLevel) return;

    const comparisonItem: ComparisonItem = {
      id: item.id,
      label: item.label,
      color: getColorForIndex(state.comparison.items.length),
      data: [], // Would be populated by actual data fetch
      metadata: item.metadata,
    };

    addToComparison(comparisonItem);
    setSelectedForComparison(prev => new Set([...prev, item.id]));
  };

  const getColorForIndex = (index: number): string => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    ];
    return colors[index % colors.length];
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↑</span>;
      case 'down':
        return <span className="text-red-500">↓</span>;
      case 'stable':
        return <span className="text-gray-400">→</span>;
      default:
        return null;
    }
  };

  const defaultRenderItem = (item: DrillDownGridItem) => (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-gray-900 truncate">{item.label}</h4>
        {enableComparison && state.comparison.enabled && (
          <button
            onClick={e => handleAddToComparison(item, e)}
            className={`p-1 rounded ${
              selectedForComparison.has(item.id)
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100 text-gray-400'
            }`}
            aria-label={`Add ${item.label} to comparison`}
            disabled={selectedForComparison.has(item.id)}
          >
            {selectedForComparison.has(item.id) ? '✓' : '+'}
          </button>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">
          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
        </span>
        {item.change !== undefined && (
          <span className={`text-sm ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
          </span>
        )}
        {getTrendIcon(item.trend)}
      </div>
    </div>
  );

  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {renderItem ? renderItem(item) : defaultRenderItem(item)}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// TIME RANGE SELECTOR
// ============================================================================

interface TimeRangeSelectorProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
  presets?: { label: string; getValue: () => { start: Date; end: Date } }[];
  className?: string;
}

export function TimeRangeSelector({
  value,
  onChange,
  presets,
  className = '',
}: TimeRangeSelectorProps): React.ReactElement {
  const defaultPresets = [
    {
      label: 'Last 7 days',
      getValue: () => ({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }),
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }),
    },
    {
      label: 'Last 90 days',
      getValue: () => ({
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }),
    },
    {
      label: 'Last 12 months',
      getValue: () => ({
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }),
    },
    {
      label: 'Year to date',
      getValue: () => ({
        start: new Date(new Date().getFullYear(), 0, 1),
        end: new Date(),
      }),
    },
  ];

  const activePresets = presets || defaultPresets;
  const [showCustom, setShowCustom] = useState(false);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const isPresetActive = (preset: typeof activePresets[0]) => {
    const presetValue = preset.getValue();
    return (
      formatDate(value.start) === formatDate(presetValue.start) &&
      formatDate(value.end) === formatDate(presetValue.end)
    );
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Preset buttons */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {activePresets.map(preset => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.getValue())}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              isPresetActive(preset)
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            showCustom
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formatDate(value.start)}
            onChange={e => onChange({ ...value, start: new Date(e.target.value) })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={formatDate(value.end)}
            onChange={e => onChange({ ...value, end: new Date(e.target.value) })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// METRIC DRILL-DOWN CARD
// ============================================================================

interface MetricDrillDownCardProps {
  title: string;
  value: number;
  format?: 'number' | 'percentage' | 'currency' | 'duration';
  change?: number;
  changeLabel?: string;
  sparklineData?: number[];
  breakdownData?: { label: string; value: number; color?: string }[];
  drillDownLevel?: DrillDownLevel;
  className?: string;
}

export function MetricDrillDownCard({
  title,
  value,
  format = 'number',
  change,
  changeLabel = 'vs last period',
  sparklineData,
  breakdownData,
  drillDownLevel,
  className = '',
}: MetricDrillDownCardProps): React.ReactElement {
  const { drillDown } = useDrillDown();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'duration':
        return `${val.toFixed(1)}h`;
      default:
        return val.toLocaleString();
    }
  };

  // Draw sparkline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sparklineData || sparklineData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;

    ctx.strokeStyle = change !== undefined && change >= 0 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();

    sparklineData.forEach((val, i) => {
      const x = (i / (sparklineData.length - 1)) * rect.width;
      const y = rect.height - ((val - min) / range) * rect.height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [sparklineData, change]);

  const handleClick = () => {
    if (drillDownLevel) {
      drillDown(drillDownLevel);
    }
  };

  const totalBreakdown = breakdownData?.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg shadow p-4 ${drillDownLevel ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
      role={drillDownLevel ? 'button' : undefined}
      tabIndex={drillDownLevel ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatValue(value)}
          </p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% {changeLabel}
            </p>
          )}
        </div>

        {sparklineData && (
          <canvas
            ref={canvasRef}
            className="w-20 h-10"
            style={{ width: 80, height: 40 }}
          />
        )}
      </div>

      {/* Breakdown bar */}
      {breakdownData && breakdownData.length > 0 && (
        <div className="mt-4">
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
            {breakdownData.map((item, i) => (
              <div
                key={i}
                style={{
                  width: `${(item.value / totalBreakdown) * 100}%`,
                  backgroundColor: item.color || getColorForIndex(i),
                }}
                title={`${item.label}: ${formatValue(item.value)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {breakdownData.map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color || getColorForIndex(i) }}
                />
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {drillDownLevel && (
        <p className="text-xs text-blue-600 mt-3 flex items-center gap-1">
          Click to explore details →
        </p>
      )}
    </div>
  );
}

function getColorForIndex(index: number): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  ];
  return colors[index % colors.length];
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DrillDownProvider,
  DrillDownView,
  BreadcrumbNavigation,
  ActiveFilters,
  InsightsPanel,
  ComparisonView,
  DrillDownGrid,
  TimeRangeSelector,
  MetricDrillDownCard,
  useDrillDown,
};
