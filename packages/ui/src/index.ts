// Layout Components
export { Card, CardHeader, CardContent, CardFooter } from './components/Card';
export { Container } from './components/Container';
export { Stack, HStack, VStack } from './components/Stack';
export { Grid } from './components/Grid';
export { Divider } from './components/Divider';

// Form Components
export { Button, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export { Select, type SelectProps, type SelectOption } from './components/Select';
export { Textarea, type TextareaProps } from './components/Textarea';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { Radio, RadioGroup, type RadioProps } from './components/Radio';
export { Switch, type SwitchProps } from './components/Switch';
export { FormField, FormLabel, FormError, FormHelperText } from './components/FormField';

// Feedback Components
export { Alert, type AlertProps } from './components/Alert';
export { Badge, type BadgeProps } from './components/Badge';
export { Spinner, type SpinnerProps } from './components/Spinner';
export { Progress, type ProgressProps } from './components/Progress';
export { Skeleton } from './components/Skeleton';
export { Toast, useToast } from './components/Toast';

// Overlay Components
export { Modal, type ModalProps } from './components/Modal';
export { Drawer, type DrawerProps } from './components/Drawer';
export { Dropdown, DropdownItem, type DropdownProps } from './components/Dropdown';
export { Tooltip, type TooltipProps } from './components/Tooltip';
export { Popover, type PopoverProps } from './components/Popover';

// Navigation Components
export { Tabs, TabList, Tab, TabPanel, type TabsProps } from './components/Tabs';
export { Breadcrumb, BreadcrumbItem, type BreadcrumbProps } from './components/Breadcrumb';
export { Pagination, type PaginationProps } from './components/Pagination';

// Data Display Components
export { Avatar, AvatarGroup, type AvatarProps } from './components/Avatar';
export { Table, TableHead, TableBody, TableRow, TableCell, type TableProps } from './components/Table';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { DataList, DataListItem, type DataListProps } from './components/DataList';

// Typography
export { Text, Heading, type TextProps, type HeadingProps } from './components/Typography';

// Utility Types
export type { BaseProps, Size, Variant, ColorScheme } from './types';

// Hooks
export { useDisclosure } from './hooks/useDisclosure';
export { useDebounce } from './hooks/useDebounce';
export { useClickOutside } from './hooks/useClickOutside';

// =============================================================================
// ADVANCED UI COMPONENTS (Section 6)
// =============================================================================

// Architecture (Design tokens, state management, accessibility)
export * from './architecture';

// Dashboard Framework - Role-aware enterprise dashboards
export * from './components/dashboard/DashboardFramework';

// Interactive Charts - Canvas-based visualizations
export * from './components/charts/InteractiveCharts';

// Real-time Updates - WebSocket-based live data
export * from './components/realtime/RealtimeProvider';

// Drill-down Analytics - Hierarchical data exploration
export * from './components/analytics/DrillDownAnalytics';

// What-If Simulator - Scenario planning tools
export * from './components/simulator/WhatIfSimulator';

// Progressive Disclosure - Information revelation patterns
export * from './components/disclosure/ProgressiveDisclosure';

// Re-export key types for convenience
export type {
  // Dashboard types
  DashboardConfig,
  WidgetConfig,
  DashboardRole,
  RoleDashboardConfig,
} from './components/dashboard/DashboardFramework';

export type {
  // Chart types
  ChartData,
  ChartSeries,
  TrendChartConfig,
  HeatmapConfig,
} from './components/charts/InteractiveCharts';

export type {
  // Real-time types
  RealtimeConfig,
  SubscriptionOptions,
  OptimisticUpdate,
} from './components/realtime/RealtimeProvider';

export type {
  // Analytics types
  DrillDownLevel,
  ComparisonConfig,
  AnalyticsFilter,
  InsightData,
} from './components/analytics/DrillDownAnalytics';

export type {
  // Simulator types
  SimulationVariable,
  SimulationOutcome,
  SimulationScenario,
  SimulationConfig,
} from './components/simulator/WhatIfSimulator';

export type {
  // Disclosure types
  DisclosureLevel,
  TooltipConfig as AdvancedTooltipConfig,
  InlineExplanation,
} from './components/disclosure/ProgressiveDisclosure';
