/**
 * Frontend Component Architecture
 *
 * Component-driven design with strong typing, state separation,
 * optimistic updates, memoized selectors, and accessibility compliance.
 */

// ============================================================================
// DESIGN TOKENS & THEME SYSTEM
// ============================================================================

export interface DesignTokens {
  // Colors
  colors: {
    // Brand colors
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale;

    // Semantic colors
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    info: ColorScale;

    // Neutral colors
    neutral: ColorScale;

    // Surface colors
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };

    // Text colors
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      disabled: string;
      link: string;
      linkHover: string;
    };

    // Border colors
    border: {
      primary: string;
      secondary: string;
      focus: string;
      error: string;
    };
  };

  // Typography
  typography: {
    fontFamily: {
      sans: string;
      serif: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
    letterSpacing: {
      tight: string;
      normal: string;
      wide: string;
    };
  };

  // Spacing
  spacing: {
    px: string;
    0: string;
    0.5: string;
    1: string;
    1.5: string;
    2: string;
    2.5: string;
    3: string;
    4: string;
    5: string;
    6: string;
    8: string;
    10: string;
    12: string;
    16: string;
    20: string;
    24: string;
    32: string;
    40: string;
    48: string;
    64: string;
  };

  // Border radius
  borderRadius: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };

  // Shadows
  shadows: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    inner: string;
  };

  // Transitions
  transitions: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      default: string;
      in: string;
      out: string;
      inOut: string;
    };
  };

  // Z-index
  zIndex: {
    base: number;
    dropdown: number;
    sticky: number;
    fixed: number;
    modal: number;
    popover: number;
    tooltip: number;
  };

  // Breakpoints
  breakpoints: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

// Light Theme Tokens
export const lightThemeTokens: DesignTokens = {
  colors: {
    primary: {
      50: '#EBF5FF',
      100: '#E1EFFE',
      200: '#C3DDFD',
      300: '#A4CAFE',
      400: '#76A9FA',
      500: '#3F83F8',
      600: '#1C64F2',
      700: '#1A56DB',
      800: '#1E429F',
      900: '#233876',
    },
    secondary: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
    },
    accent: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    info: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
      inverse: '#111827',
    },
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      tertiary: '#6B7280',
      inverse: '#FFFFFF',
      disabled: '#9CA3AF',
      link: '#3B82F6',
      linkHover: '#2563EB',
    },
    border: {
      primary: '#E5E7EB',
      secondary: '#D1D5DB',
      focus: '#3B82F6',
      error: '#EF4444',
    },
  },
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
    },
  },
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    64: '16rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

export interface StoreState {
  // Domain state
  goals: GoalsState;
  reviews: ReviewsState;
  feedback: FeedbackState;
  employees: EmployeesState;

  // UI state
  ui: UIState;

  // Auth state
  auth: AuthState;
}

export interface GoalsState {
  byId: Record<string, GoalEntity>;
  allIds: string[];
  loading: boolean;
  error: string | null;
  filters: GoalFilters;
  selectedId: string | null;
}

export interface ReviewsState {
  byId: Record<string, ReviewEntity>;
  allIds: string[];
  cyclesByld: Record<string, ReviewCycleEntity>;
  activeCycleId: string | null;
  loading: boolean;
  error: string | null;
}

export interface FeedbackState {
  byId: Record<string, FeedbackEntity>;
  allIds: string[];
  loading: boolean;
  error: string | null;
  drafts: Record<string, FeedbackDraft>;
}

export interface EmployeesState {
  byId: Record<string, EmployeeEntity>;
  allIds: string[];
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  modals: Record<string, ModalState>;
  notifications: Notification[];
  toasts: Toast[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  permissions: string[];
  loading: boolean;
}

// Entity Types
export interface GoalEntity {
  id: string;
  title: string;
  description: string;
  type: 'OKR' | 'SMART' | 'KPI';
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  progress: number;
  ownerId: string;
  parentGoalId?: string;
  targetDate: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewEntity {
  id: string;
  cycleId: string;
  revieweeId: string;
  reviewerId: string;
  type: 'SELF' | 'MANAGER' | 'PEER' | 'UPWARD';
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'CALIBRATED' | 'SHARED';
  rating?: number;
  content: Record<string, unknown>;
  submittedAt?: string;
}

export interface ReviewCycleEntity {
  id: string;
  name: string;
  type: 'ANNUAL' | 'QUARTERLY' | 'PROJECT';
  status: 'DRAFT' | 'ACTIVE' | 'CALIBRATION' | 'COMPLETED';
  startDate: string;
  endDate: string;
}

export interface FeedbackEntity {
  id: string;
  fromId: string;
  toId: string;
  type: 'PRAISE' | 'CONSTRUCTIVE' | 'REQUEST';
  content: string;
  visibility: 'PRIVATE' | 'MANAGER_VISIBLE' | 'PUBLIC';
  isAnonymous: boolean;
  createdAt: string;
}

export interface FeedbackDraft {
  toId: string;
  type: 'PRAISE' | 'CONSTRUCTIVE' | 'REQUEST';
  content: string;
  visibility: 'PRIVATE' | 'MANAGER_VISIBLE' | 'PUBLIC';
  lastSaved: string;
}

export interface EmployeeEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  managerId?: string;
  avatarUrl?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface ModalState {
  isOpen: boolean;
  props?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration: number;
  createdAt: number;
}

export interface GoalFilters {
  status?: string[];
  type?: string[];
  ownerId?: string;
  dateRange?: { start: string; end: string };
  search?: string;
}

// ============================================================================
// MEMOIZED SELECTORS
// ============================================================================

export type Selector<TState, TResult> = (state: TState) => TResult;

export function createSelector<TState, TDep1, TResult>(
  dep1: Selector<TState, TDep1>,
  combiner: (dep1: TDep1) => TResult
): Selector<TState, TResult>;
export function createSelector<TState, TDep1, TDep2, TResult>(
  dep1: Selector<TState, TDep1>,
  dep2: Selector<TState, TDep2>,
  combiner: (dep1: TDep1, dep2: TDep2) => TResult
): Selector<TState, TResult>;
export function createSelector<TState, TDep1, TDep2, TDep3, TResult>(
  dep1: Selector<TState, TDep1>,
  dep2: Selector<TState, TDep2>,
  dep3: Selector<TState, TDep3>,
  combiner: (dep1: TDep1, dep2: TDep2, dep3: TDep3) => TResult
): Selector<TState, TResult>;
export function createSelector(...args: unknown[]): unknown {
  const dependencies = args.slice(0, -1) as Selector<unknown, unknown>[];
  const combiner = args[args.length - 1] as (...deps: unknown[]) => unknown;

  let lastDeps: unknown[] | null = null;
  let lastResult: unknown = null;

  return (state: unknown) => {
    const deps = dependencies.map(dep => dep(state));

    if (
      lastDeps === null ||
      deps.length !== lastDeps.length ||
      deps.some((dep, i) => dep !== lastDeps![i])
    ) {
      lastDeps = deps;
      lastResult = combiner(...deps);
    }

    return lastResult;
  };
}

// Goal Selectors
export const selectGoalsState = (state: StoreState) => state.goals;
export const selectGoalsById = (state: StoreState) => state.goals.byId;
export const selectGoalIds = (state: StoreState) => state.goals.allIds;
export const selectGoalsLoading = (state: StoreState) => state.goals.loading;
export const selectGoalFilters = (state: StoreState) => state.goals.filters;

export const selectAllGoals = createSelector(
  selectGoalsById,
  selectGoalIds,
  (byId, ids) => ids.map(id => byId[id])
);

export const selectFilteredGoals = createSelector(
  selectAllGoals,
  selectGoalFilters,
  (goals, filters) => {
    return goals.filter(goal => {
      if (filters.status?.length && !filters.status.includes(goal.status)) {
        return false;
      }
      if (filters.type?.length && !filters.type.includes(goal.type)) {
        return false;
      }
      if (filters.ownerId && goal.ownerId !== filters.ownerId) {
        return false;
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (
          !goal.title.toLowerCase().includes(search) &&
          !goal.description.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      return true;
    });
  }
);

export const selectGoalById = (id: string) =>
  createSelector(selectGoalsById, byId => byId[id]);

export const selectGoalsByOwner = (ownerId: string) =>
  createSelector(selectAllGoals, goals => goals.filter(g => g.ownerId === ownerId));

export const selectGoalCompletionStats = createSelector(
  selectAllGoals,
  goals => {
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'COMPLETED').length;
    const active = goals.filter(g => g.status === 'ACTIVE').length;
    const avgProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
      : 0;

    return {
      total,
      completed,
      active,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      avgProgress,
    };
  }
);

// ============================================================================
// OPTIMISTIC UPDATE UTILITIES
// ============================================================================

export interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  optimisticValue: T;
  previousValue?: T;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'reverted';
}

export interface OptimisticState<T> {
  confirmed: Record<string, T>;
  pending: OptimisticUpdate<T>[];
}

export class OptimisticUpdateManager<T extends { id: string }> {
  private updates: OptimisticUpdate<T>[] = [];
  private listeners: Set<() => void> = new Set();

  apply(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'status'>): string {
    const id = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullUpdate: OptimisticUpdate<T> = {
      ...update,
      id,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.updates.push(fullUpdate);
    this.notifyListeners();
    return id;
  }

  confirm(updateId: string): void {
    const update = this.updates.find(u => u.id === updateId);
    if (update) {
      update.status = 'confirmed';
      // Remove confirmed updates after a delay
      setTimeout(() => {
        this.updates = this.updates.filter(u => u.id !== updateId);
      }, 1000);
      this.notifyListeners();
    }
  }

  revert(updateId: string): void {
    const update = this.updates.find(u => u.id === updateId);
    if (update) {
      update.status = 'reverted';
      this.notifyListeners();
      // Remove reverted updates after a delay
      setTimeout(() => {
        this.updates = this.updates.filter(u => u.id !== updateId);
        this.notifyListeners();
      }, 100);
    }
  }

  getOptimisticState(confirmedState: Record<string, T>): Record<string, T> {
    const result = { ...confirmedState };

    for (const update of this.updates) {
      if (update.status === 'reverted') continue;

      switch (update.type) {
        case 'create':
        case 'update':
          result[update.optimisticValue.id] = update.optimisticValue;
          break;
        case 'delete':
          delete result[update.optimisticValue.id];
          break;
      }
    }

    return result;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// ============================================================================
// ACCESSIBILITY UTILITIES
// ============================================================================

export interface A11yProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-controls'?: string;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-pressed'?: boolean | 'mixed';
  'aria-selected'?: boolean;
  'aria-sort'?: 'ascending' | 'descending' | 'none' | 'other';
  role?: string;
  tabIndex?: number;
}

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string;
  returnFocus?: boolean;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
}

export class FocusTrap {
  private container: HTMLElement;
  private previousActiveElement: Element | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(container: HTMLElement, private options: FocusTrapOptions = {}) {
    this.container = container;
  }

  activate(): void {
    this.previousActiveElement = document.activeElement;
    this.updateFocusableElements();

    if (this.options.initialFocus) {
      const initial = typeof this.options.initialFocus === 'string'
        ? this.container.querySelector<HTMLElement>(this.options.initialFocus)
        : this.options.initialFocus;
      initial?.focus();
    } else if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    this.container.addEventListener('keydown', this.handleKeyDown);

    if (this.options.clickOutsideDeactivates) {
      document.addEventListener('click', this.handleClickOutside);
    }
  }

  deactivate(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleClickOutside);

    if (this.options.returnFocus && this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
  }

  private updateFocusableElements(): void {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll<HTMLElement>(selector)
    );
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Tab') {
      this.updateFocusableElements();
      const firstElement = this.focusableElements[0];
      const lastElement = this.focusableElements[this.focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    if (event.key === 'Escape' && this.options.escapeDeactivates) {
      this.deactivate();
    }
  };

  private handleClickOutside = (event: MouseEvent): void => {
    if (!this.container.contains(event.target as Node)) {
      this.deactivate();
    }
  };
}

// Screen reader announcer
export class ScreenReaderAnnouncer {
  private politeLiveRegion: HTMLElement;
  private assertiveLiveRegion: HTMLElement;

  constructor() {
    this.politeLiveRegion = this.createLiveRegion('polite');
    this.assertiveLiveRegion = this.createLiveRegion('assertive');
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region = priority === 'assertive'
      ? this.assertiveLiveRegion
      : this.politeLiveRegion;

    // Clear and re-announce to ensure screen readers pick up the change
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, 100);
  }

  private createLiveRegion(ariaLive: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', ariaLive);
    region.setAttribute('aria-atomic', 'true');
    region.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(region);
    return region;
  }

  destroy(): void {
    this.politeLiveRegion.remove();
    this.assertiveLiveRegion.remove();
  }
}

// Keyboard navigation helper
export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    onSelect?: (index: number, item: HTMLElement) => void;
  } = {}
): (event: KeyboardEvent) => void {
  const { orientation = 'vertical', wrap = true, onSelect } = options;

  return (event: KeyboardEvent) => {
    const currentIndex = items.findIndex(item => item === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    switch (event.key) {
      case 'ArrowUp':
        if (isVertical) {
          event.preventDefault();
          nextIndex = currentIndex - 1;
        }
        break;
      case 'ArrowDown':
        if (isVertical) {
          event.preventDefault();
          nextIndex = currentIndex + 1;
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          event.preventDefault();
          nextIndex = currentIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          event.preventDefault();
          nextIndex = currentIndex + 1;
        }
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(currentIndex, items[currentIndex]);
        return;
    }

    if (wrap) {
      if (nextIndex < 0) nextIndex = items.length - 1;
      if (nextIndex >= items.length) nextIndex = 0;
    } else {
      nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
    }

    if (nextIndex !== currentIndex && items[nextIndex]) {
      items[nextIndex].focus();
    }
  };
}

// ============================================================================
// COMPONENT TYPES
// ============================================================================

export interface ComponentProps {
  className?: string;
  style?: Record<string, string | number>;
  testId?: string;
}

export interface InteractiveProps extends ComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export interface FormFieldProps extends ComponentProps {
  id: string;
  name: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

// Export all types and utilities
export {
  DesignTokens,
  ColorScale,
  StoreState,
  Selector,
  OptimisticUpdate,
  A11yProps,
  FocusTrapOptions,
};
