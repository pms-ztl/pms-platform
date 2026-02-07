/**
 * Enterprise Dashboard Framework
 *
 * Role-aware, configurable dashboard system with
 * drag-drop widgets, real-time updates, and drill-down capabilities.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'HR_BP' | 'EXECUTIVE' | 'ADMIN';

export interface DashboardConfig {
  id: string;
  name: string;
  role: UserRole;
  layout: DashboardLayout;
  widgets: WidgetConfig[];
  refreshInterval?: number;
  theme?: 'light' | 'dark' | 'auto';
}

export interface DashboardLayout {
  type: 'grid' | 'masonry' | 'flow';
  columns: number;
  gap: number;
  padding: number;
  breakpoints: LayoutBreakpoint[];
}

export interface LayoutBreakpoint {
  minWidth: number;
  columns: number;
  gap: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: Record<string, unknown>;
  refreshInterval?: number;
  permissions?: string[];
  drillDownTarget?: string;
}

export interface WidgetPosition {
  column: number;
  row: number;
}

export interface WidgetSize {
  width: number; // In grid units
  height: number; // In grid units
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export type WidgetType =
  | 'METRIC_CARD'
  | 'TREND_CHART'
  | 'COMPARISON_CHART'
  | 'HEATMAP'
  | 'PROGRESS_TRACKER'
  | 'ACTIVITY_FEED'
  | 'GOAL_TREE'
  | 'TEAM_OVERVIEW'
  | 'REVIEW_STATUS'
  | 'CALIBRATION_MATRIX'
  | 'BIAS_MONITOR'
  | 'PERFORMANCE_RADAR'
  | 'ATTRITION_RISK'
  | 'SKILL_GAP'
  | 'RECOGNITION_FEED'
  | 'TIMELINE'
  | 'CUSTOM';

export interface WidgetData<T = unknown> {
  data: T;
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
  stale: boolean;
}

export interface DrillDownContext {
  sourceWidget: string;
  targetView: string;
  filters: Record<string, unknown>;
  breadcrumb: DrillDownBreadcrumb[];
}

export interface DrillDownBreadcrumb {
  label: string;
  widgetId: string;
  filters: Record<string, unknown>;
}

// ============================================================================
// DASHBOARD CONTEXT
// ============================================================================

interface DashboardContextValue {
  // Configuration
  config: DashboardConfig;
  updateConfig: (config: Partial<DashboardConfig>) => void;

  // User context
  userRole: UserRole;
  permissions: string[];

  // Widget management
  widgets: Map<string, WidgetData>;
  refreshWidget: (widgetId: string) => void;
  refreshAll: () => void;

  // Drill-down
  drillDown: DrillDownContext | null;
  openDrillDown: (context: Omit<DrillDownContext, 'breadcrumb'>) => void;
  closeDrillDown: () => void;
  navigateBreadcrumb: (index: number) => void;

  // Real-time
  isConnected: boolean;
  lastSync: Date | null;

  // Layout
  isEditMode: boolean;
  setEditMode: (edit: boolean) => void;
  moveWidget: (widgetId: string, newPosition: WidgetPosition) => void;
  resizeWidget: (widgetId: string, newSize: WidgetSize) => void;

  // Filters
  globalFilters: DashboardFilters;
  setGlobalFilters: (filters: DashboardFilters) => void;

  // Time range
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

export interface DashboardFilters {
  departmentIds?: string[];
  locationIds?: string[];
  levelRange?: [number, number];
  managerIds?: string[];
  employeeIds?: string[];
  cycleIds?: string[];
  search?: string;
}

export interface TimeRange {
  type: 'preset' | 'custom';
  preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'ytd' | 'all';
  start?: Date;
  end?: Date;
  comparison?: 'previous_period' | 'previous_year' | 'none';
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

// ============================================================================
// DASHBOARD PROVIDER
// ============================================================================

interface DashboardProviderProps {
  initialConfig: DashboardConfig;
  userRole: UserRole;
  permissions: string[];
  children: ReactNode;
  onConfigChange?: (config: DashboardConfig) => void;
  websocketUrl?: string;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  initialConfig,
  userRole,
  permissions,
  children,
  onConfigChange,
  websocketUrl,
}) => {
  const [config, setConfig] = useState<DashboardConfig>(initialConfig);
  const [widgets, setWidgets] = useState<Map<string, WidgetData>>(new Map());
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
  const [isEditMode, setEditMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [globalFilters, setGlobalFilters] = useState<DashboardFilters>({});
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: 'preset',
    preset: 'quarter',
    comparison: 'previous_period',
  });

  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!websocketUrl) return;

    const connect = () => {
      const ws = new WebSocket(websocketUrl);

      ws.onopen = () => {
        setIsConnected(true);
        // Subscribe to dashboard updates
        ws.send(JSON.stringify({
          type: 'SUBSCRIBE',
          channels: ['dashboard', `role:${userRole}`],
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after delay
        setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [websocketUrl, userRole]);

  const handleWebSocketMessage = useCallback((message: {
    type: string;
    widgetId?: string;
    data?: unknown;
  }) => {
    switch (message.type) {
      case 'WIDGET_UPDATE':
        if (message.widgetId && message.data) {
          setWidgets(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(message.widgetId!) || {
              data: null,
              loading: false,
              error: null,
              lastUpdated: new Date(),
              stale: false,
            };
            newMap.set(message.widgetId!, {
              ...existing,
              data: message.data,
              lastUpdated: new Date(),
              stale: false,
            });
            return newMap;
          });
        }
        break;

      case 'SYNC':
        setLastSync(new Date());
        break;
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<DashboardConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  }, [onConfigChange]);

  const refreshWidget = useCallback((widgetId: string) => {
    setWidgets(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(widgetId);
      if (existing) {
        newMap.set(widgetId, { ...existing, loading: true, stale: true });
      }
      return newMap;
    });

    // Trigger fetch via WebSocket or REST
    wsRef.current?.send(JSON.stringify({
      type: 'REFRESH_WIDGET',
      widgetId,
      filters: globalFilters,
      timeRange,
    }));
  }, [globalFilters, timeRange]);

  const refreshAll = useCallback(() => {
    config.widgets.forEach(widget => refreshWidget(widget.id));
  }, [config.widgets, refreshWidget]);

  const openDrillDown = useCallback((context: Omit<DrillDownContext, 'breadcrumb'>) => {
    setDrillDown(prev => ({
      ...context,
      breadcrumb: prev
        ? [...prev.breadcrumb, {
            label: prev.sourceWidget,
            widgetId: prev.sourceWidget,
            filters: prev.filters,
          }]
        : [],
    }));
  }, []);

  const closeDrillDown = useCallback(() => {
    setDrillDown(null);
  }, []);

  const navigateBreadcrumb = useCallback((index: number) => {
    setDrillDown(prev => {
      if (!prev || index >= prev.breadcrumb.length) return prev;
      const crumb = prev.breadcrumb[index];
      return {
        sourceWidget: crumb.widgetId,
        targetView: crumb.widgetId,
        filters: crumb.filters,
        breadcrumb: prev.breadcrumb.slice(0, index),
      };
    });
  }, []);

  const moveWidget = useCallback((widgetId: string, newPosition: WidgetPosition) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, position: newPosition } : w
      ),
    }));
  }, []);

  const resizeWidget = useCallback((widgetId: string, newSize: WidgetSize) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, size: newSize } : w
      ),
    }));
  }, []);

  const value = useMemo<DashboardContextValue>(() => ({
    config,
    updateConfig,
    userRole,
    permissions,
    widgets,
    refreshWidget,
    refreshAll,
    drillDown,
    openDrillDown,
    closeDrillDown,
    navigateBreadcrumb,
    isConnected,
    lastSync,
    isEditMode,
    setEditMode,
    moveWidget,
    resizeWidget,
    globalFilters,
    setGlobalFilters,
    timeRange,
    setTimeRange,
  }), [
    config, updateConfig, userRole, permissions, widgets, refreshWidget,
    refreshAll, drillDown, openDrillDown, closeDrillDown, navigateBreadcrumb,
    isConnected, lastSync, isEditMode, moveWidget, resizeWidget,
    globalFilters, timeRange,
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

// ============================================================================
// DASHBOARD LAYOUT COMPONENT
// ============================================================================

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className = '',
}) => {
  const { config, isEditMode } = useDashboard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentBreakpoint, setCurrentBreakpoint] = useState(config.layout.columns);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;

      const breakpoint = config.layout.breakpoints
        .sort((a, b) => b.minWidth - a.minWidth)
        .find(bp => width >= bp.minWidth);

      setCurrentBreakpoint(breakpoint?.columns || config.layout.columns);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [config.layout]);

  const layoutStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${currentBreakpoint}, 1fr)`,
    gap: `${config.layout.gap}px`,
    padding: `${config.layout.padding}px`,
  };

  return (
    <div
      ref={containerRef}
      className={`dashboard-layout ${isEditMode ? 'edit-mode' : ''} ${className}`}
      style={layoutStyles}
      role="main"
      aria-label="Dashboard"
    >
      {children}
    </div>
  );
};

// ============================================================================
// WIDGET CONTAINER
// ============================================================================

interface WidgetContainerProps {
  config: WidgetConfig;
  children: ReactNode;
  onDrillDown?: (filters: Record<string, unknown>) => void;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  config,
  children,
  onDrillDown,
}) => {
  const {
    widgets,
    refreshWidget,
    isEditMode,
    openDrillDown,
    permissions,
    moveWidget,
    resizeWidget,
  } = useDashboard();

  const widgetData = widgets.get(config.id);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check permissions
  const hasPermission = !config.permissions ||
    config.permissions.some(p => permissions.includes(p));

  if (!hasPermission) {
    return null;
  }

  const handleDrillDown = (filters: Record<string, unknown>) => {
    if (config.drillDownTarget) {
      openDrillDown({
        sourceWidget: config.id,
        targetView: config.drillDownTarget,
        filters,
      });
    }
    onDrillDown?.(filters);
  };

  const containerStyles: React.CSSProperties = {
    gridColumn: `span ${config.size.width}`,
    gridRow: `span ${config.size.height}`,
    minHeight: config.size.minHeight ? `${config.size.minHeight}px` : '200px',
  };

  return (
    <div
      ref={containerRef}
      className={`
        widget-container
        ${widgetData?.loading ? 'loading' : ''}
        ${widgetData?.stale ? 'stale' : ''}
        ${widgetData?.error ? 'error' : ''}
        ${isDragging ? 'dragging' : ''}
        ${isResizing ? 'resizing' : ''}
        ${isEditMode ? 'editable' : ''}
      `}
      style={containerStyles}
      role="region"
      aria-label={config.title}
      aria-busy={widgetData?.loading}
    >
      {/* Widget Header */}
      <div className="widget-header">
        <h3 className="widget-title">{config.title}</h3>
        <div className="widget-actions">
          {widgetData?.lastUpdated && (
            <span className="widget-timestamp" title="Last updated">
              {formatRelativeTime(widgetData.lastUpdated)}
            </span>
          )}
          <button
            className="widget-refresh"
            onClick={() => refreshWidget(config.id)}
            aria-label="Refresh widget"
            disabled={widgetData?.loading}
          >
            <RefreshIcon spinning={widgetData?.loading} />
          </button>
          {config.drillDownTarget && (
            <button
              className="widget-drilldown"
              onClick={() => handleDrillDown({})}
              aria-label="View details"
            >
              <DrillDownIcon />
            </button>
          )}
          {isEditMode && (
            <button
              className="widget-settings"
              aria-label="Widget settings"
            >
              <SettingsIcon />
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="widget-content">
        {widgetData?.error ? (
          <WidgetError
            message={widgetData.error}
            onRetry={() => refreshWidget(config.id)}
          />
        ) : widgetData?.loading && !widgetData.data ? (
          <WidgetSkeleton type={config.type} />
        ) : (
          children
        )}
      </div>

      {/* Stale indicator */}
      {widgetData?.stale && !widgetData.loading && (
        <div className="widget-stale-indicator" aria-live="polite">
          Updating...
        </div>
      )}

      {/* Edit mode handles */}
      {isEditMode && (
        <>
          <div
            className="widget-drag-handle"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            aria-label="Drag to move"
          >
            <DragIcon />
          </div>
          <div
            className="widget-resize-handle"
            onMouseDown={() => setIsResizing(true)}
            onMouseUp={() => setIsResizing(false)}
            aria-label="Drag to resize"
          >
            <ResizeIcon />
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// WIDGET ERROR & SKELETON
// ============================================================================

const WidgetError: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="widget-error" role="alert">
    <ErrorIcon />
    <p>{message}</p>
    <button onClick={onRetry} className="widget-error-retry">
      Try again
    </button>
  </div>
);

const WidgetSkeleton: React.FC<{ type: WidgetType }> = ({ type }) => {
  const skeletonContent = useMemo(() => {
    switch (type) {
      case 'METRIC_CARD':
        return (
          <div className="skeleton-metric">
            <div className="skeleton-line skeleton-lg" />
            <div className="skeleton-line skeleton-sm" />
          </div>
        );
      case 'TREND_CHART':
      case 'COMPARISON_CHART':
        return (
          <div className="skeleton-chart">
            <div className="skeleton-bars">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton-bar"
                  style={{ height: `${30 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          </div>
        );
      case 'ACTIVITY_FEED':
        return (
          <div className="skeleton-feed">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-feed-item">
                <div className="skeleton-avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton-line skeleton-md" />
                  <div className="skeleton-line skeleton-sm" />
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return <div className="skeleton-default" />;
    }
  }, [type]);

  return (
    <div className="widget-skeleton" aria-hidden="true">
      {skeletonContent}
    </div>
  );
};

// ============================================================================
// ROLE-BASED DASHBOARD CONFIGS
// ============================================================================

export const createEmployeeDashboardConfig = (userId: string): DashboardConfig => ({
  id: `employee-${userId}`,
  name: 'My Performance',
  role: 'EMPLOYEE',
  layout: {
    type: 'grid',
    columns: 12,
    gap: 16,
    padding: 24,
    breakpoints: [
      { minWidth: 1200, columns: 12, gap: 16 },
      { minWidth: 768, columns: 6, gap: 12 },
      { minWidth: 0, columns: 1, gap: 8 },
    ],
  },
  widgets: [
    {
      id: 'my-rating-summary',
      type: 'METRIC_CARD',
      title: 'Current Rating',
      position: { column: 0, row: 0 },
      size: { width: 3, height: 1 },
      config: { metric: 'current_rating', showTrend: true },
      drillDownTarget: 'rating-details',
    },
    {
      id: 'goal-progress',
      type: 'PROGRESS_TRACKER',
      title: 'Goal Progress',
      position: { column: 3, row: 0 },
      size: { width: 3, height: 1 },
      config: { type: 'goals', showBreakdown: true },
      drillDownTarget: 'goals-list',
    },
    {
      id: 'feedback-received',
      type: 'METRIC_CARD',
      title: 'Feedback Received',
      position: { column: 6, row: 0 },
      size: { width: 3, height: 1 },
      config: { metric: 'feedback_count', period: 'month' },
      drillDownTarget: 'feedback-list',
    },
    {
      id: 'review-status',
      type: 'REVIEW_STATUS',
      title: 'Review Progress',
      position: { column: 9, row: 0 },
      size: { width: 3, height: 1 },
      config: {},
    },
    {
      id: 'performance-trend',
      type: 'TREND_CHART',
      title: 'Performance Over Time',
      position: { column: 0, row: 1 },
      size: { width: 8, height: 2 },
      config: {
        metrics: ['rating', 'goal_completion', 'feedback_sentiment'],
        period: 'year',
        granularity: 'month',
      },
    },
    {
      id: 'my-goals',
      type: 'GOAL_TREE',
      title: 'My Goals',
      position: { column: 8, row: 1 },
      size: { width: 4, height: 2 },
      config: { ownerId: userId, showAlignment: true },
      drillDownTarget: 'goal-details',
    },
    {
      id: 'recent-feedback',
      type: 'ACTIVITY_FEED',
      title: 'Recent Feedback',
      position: { column: 0, row: 3 },
      size: { width: 6, height: 2 },
      config: { type: 'feedback', limit: 5 },
    },
    {
      id: 'skill-radar',
      type: 'PERFORMANCE_RADAR',
      title: 'Skills Assessment',
      position: { column: 6, row: 3 },
      size: { width: 6, height: 2 },
      config: { showPeerComparison: true },
    },
  ],
  refreshInterval: 60000,
});

export const createManagerDashboardConfig = (managerId: string): DashboardConfig => ({
  id: `manager-${managerId}`,
  name: 'Team Performance',
  role: 'MANAGER',
  layout: {
    type: 'grid',
    columns: 12,
    gap: 16,
    padding: 24,
    breakpoints: [
      { minWidth: 1200, columns: 12, gap: 16 },
      { minWidth: 768, columns: 6, gap: 12 },
      { minWidth: 0, columns: 1, gap: 8 },
    ],
  },
  widgets: [
    {
      id: 'team-overview',
      type: 'TEAM_OVERVIEW',
      title: 'Team Overview',
      position: { column: 0, row: 0 },
      size: { width: 4, height: 2 },
      config: { managerId, showHeadcount: true },
      drillDownTarget: 'team-details',
    },
    {
      id: 'review-completion',
      type: 'PROGRESS_TRACKER',
      title: 'Review Completion',
      position: { column: 4, row: 0 },
      size: { width: 4, height: 2 },
      config: { type: 'reviews', showByEmployee: true },
      drillDownTarget: 'reviews-list',
    },
    {
      id: 'team-goals-status',
      type: 'METRIC_CARD',
      title: 'Team Goals',
      position: { column: 8, row: 0 },
      size: { width: 4, height: 1 },
      config: { metric: 'team_goal_completion' },
    },
    {
      id: 'pending-actions',
      type: 'METRIC_CARD',
      title: 'Pending Reviews',
      position: { column: 8, row: 1 },
      size: { width: 4, height: 1 },
      config: { metric: 'pending_reviews', urgent: true },
    },
    {
      id: 'team-performance-heatmap',
      type: 'HEATMAP',
      title: 'Team Performance Heatmap',
      position: { column: 0, row: 2 },
      size: { width: 8, height: 2 },
      config: {
        dimensions: ['employee', 'competency'],
        metric: 'rating',
        colorScale: 'performance',
      },
      drillDownTarget: 'employee-performance',
    },
    {
      id: 'team-rating-distribution',
      type: 'COMPARISON_CHART',
      title: 'Rating Distribution',
      position: { column: 8, row: 2 },
      size: { width: 4, height: 2 },
      config: {
        chartType: 'histogram',
        metric: 'rating',
        showBenchmark: true,
      },
    },
    {
      id: 'attrition-risk',
      type: 'ATTRITION_RISK',
      title: 'Attrition Risk',
      position: { column: 0, row: 4 },
      size: { width: 6, height: 2 },
      config: { showTopRisks: 5, includeReasons: true },
      permissions: ['attrition:view'],
      drillDownTarget: 'attrition-details',
    },
    {
      id: 'calibration-preview',
      type: 'CALIBRATION_MATRIX',
      title: 'Calibration Preview',
      position: { column: 6, row: 4 },
      size: { width: 6, height: 2 },
      config: { mode: 'preview', showOutliers: true },
      drillDownTarget: 'calibration-session',
    },
  ],
  refreshInterval: 30000,
});

export const createHRDashboardConfig = (): DashboardConfig => ({
  id: 'hr-dashboard',
  name: 'HR Analytics',
  role: 'HR_ADMIN',
  layout: {
    type: 'grid',
    columns: 12,
    gap: 16,
    padding: 24,
    breakpoints: [
      { minWidth: 1200, columns: 12, gap: 16 },
      { minWidth: 768, columns: 6, gap: 12 },
      { minWidth: 0, columns: 1, gap: 8 },
    ],
  },
  widgets: [
    {
      id: 'org-health-score',
      type: 'METRIC_CARD',
      title: 'Organization Health',
      position: { column: 0, row: 0 },
      size: { width: 3, height: 1 },
      config: { metric: 'org_health_score', showComponents: true },
    },
    {
      id: 'cycle-progress',
      type: 'PROGRESS_TRACKER',
      title: 'Active Cycle Progress',
      position: { column: 3, row: 0 },
      size: { width: 3, height: 1 },
      config: { type: 'cycle', showPhases: true },
    },
    {
      id: 'bias-alerts',
      type: 'METRIC_CARD',
      title: 'Bias Alerts',
      position: { column: 6, row: 0 },
      size: { width: 3, height: 1 },
      config: { metric: 'bias_alerts', severity: 'high' },
      drillDownTarget: 'bias-analysis',
    },
    {
      id: 'engagement-score',
      type: 'METRIC_CARD',
      title: 'Engagement Score',
      position: { column: 9, row: 0 },
      size: { width: 3, height: 1 },
      config: { metric: 'engagement_score', showTrend: true },
    },
    {
      id: 'performance-distribution',
      type: 'COMPARISON_CHART',
      title: 'Performance Distribution by Department',
      position: { column: 0, row: 1 },
      size: { width: 6, height: 2 },
      config: {
        chartType: 'boxplot',
        groupBy: 'department',
        metric: 'rating',
        showOutliers: true,
      },
      drillDownTarget: 'department-analysis',
    },
    {
      id: 'bias-monitor',
      type: 'BIAS_MONITOR',
      title: 'Bias & Fairness Monitor',
      position: { column: 6, row: 1 },
      size: { width: 6, height: 2 },
      config: {
        dimensions: ['gender', 'department', 'tenure'],
        showAlerts: true,
      },
      drillDownTarget: 'bias-deep-dive',
    },
    {
      id: 'calibration-status',
      type: 'HEATMAP',
      title: 'Calibration Status by Department',
      position: { column: 0, row: 3 },
      size: { width: 8, height: 2 },
      config: {
        dimensions: ['department', 'status'],
        metric: 'count',
        showProgress: true,
      },
    },
    {
      id: 'timeline',
      type: 'TIMELINE',
      title: 'Review Cycle Timeline',
      position: { column: 8, row: 3 },
      size: { width: 4, height: 2 },
      config: { showMilestones: true, interactive: true },
    },
    {
      id: 'skill-gap-analysis',
      type: 'SKILL_GAP',
      title: 'Organization Skill Gaps',
      position: { column: 0, row: 5 },
      size: { width: 6, height: 2 },
      config: { showCritical: true, limit: 10 },
      drillDownTarget: 'skill-development',
    },
    {
      id: 'recognition-metrics',
      type: 'TREND_CHART',
      title: 'Recognition Trends',
      position: { column: 6, row: 5 },
      size: { width: 6, height: 2 },
      config: {
        metrics: ['recognition_given', 'recognition_received'],
        period: 'year',
        granularity: 'month',
      },
    },
  ],
  refreshInterval: 60000,
});

export const createExecutiveDashboardConfig = (): DashboardConfig => ({
  id: 'executive-dashboard',
  name: 'Executive Summary',
  role: 'EXECUTIVE',
  layout: {
    type: 'grid',
    columns: 12,
    gap: 20,
    padding: 32,
    breakpoints: [
      { minWidth: 1400, columns: 12, gap: 20 },
      { minWidth: 1024, columns: 8, gap: 16 },
      { minWidth: 768, columns: 4, gap: 12 },
      { minWidth: 0, columns: 1, gap: 8 },
    ],
  },
  widgets: [
    {
      id: 'kpi-summary',
      type: 'METRIC_CARD',
      title: 'Key Performance Indicators',
      position: { column: 0, row: 0 },
      size: { width: 12, height: 1 },
      config: {
        metrics: [
          'avg_performance_rating',
          'goal_achievement_rate',
          'engagement_score',
          'attrition_risk_rate',
        ],
        layout: 'horizontal',
        showTrends: true,
        showBenchmarks: true,
      },
    },
    {
      id: 'performance-trend-executive',
      type: 'TREND_CHART',
      title: 'Performance Trends',
      position: { column: 0, row: 1 },
      size: { width: 8, height: 3 },
      config: {
        metrics: ['rating', 'goal_completion', 'engagement'],
        period: 'year',
        granularity: 'month',
        showProjection: true,
        showAnnotations: true,
      },
      drillDownTarget: 'performance-deep-dive',
    },
    {
      id: 'top-performers',
      type: 'ACTIVITY_FEED',
      title: 'Top Performers',
      position: { column: 8, row: 1 },
      size: { width: 4, height: 3 },
      config: {
        type: 'top_performers',
        limit: 10,
        showDepartment: true,
      },
    },
    {
      id: 'department-comparison',
      type: 'COMPARISON_CHART',
      title: 'Department Performance',
      position: { column: 0, row: 4 },
      size: { width: 6, height: 2 },
      config: {
        chartType: 'radar',
        dimensions: ['rating', 'goals', 'engagement', 'retention'],
        groupBy: 'department',
      },
      drillDownTarget: 'department-details',
    },
    {
      id: 'strategic-alignment',
      type: 'GOAL_TREE',
      title: 'Strategic Alignment',
      position: { column: 6, row: 4 },
      size: { width: 6, height: 2 },
      config: {
        level: 'company',
        showCascade: true,
        showProgress: true,
      },
      drillDownTarget: 'strategy-breakdown',
    },
  ],
  refreshInterval: 300000, // 5 minutes
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

// ============================================================================
// ICON COMPONENTS (Simplified)
// ============================================================================

const RefreshIcon: React.FC<{ spinning?: boolean }> = ({ spinning }) => (
  <svg
    className={`icon refresh-icon ${spinning ? 'spinning' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const DrillDownIcon: React.FC = () => (
  <svg className="icon drilldown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const SettingsIcon: React.FC = () => (
  <svg className="icon settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const DragIcon: React.FC = () => (
  <svg className="icon drag-icon" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="8" cy="6" r="2" /><circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
    <circle cx="8" cy="18" r="2" /><circle cx="16" cy="18" r="2" />
  </svg>
);

const ResizeIcon: React.FC = () => (
  <svg className="icon resize-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 22H2v-2h18V4h2v18zM4 18h12v-2H6V4H4v14z" />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg className="icon error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export {
  DashboardConfig,
  WidgetConfig,
  WidgetType,
  WidgetData,
  UserRole,
  TimeRange,
  DashboardFilters,
};
