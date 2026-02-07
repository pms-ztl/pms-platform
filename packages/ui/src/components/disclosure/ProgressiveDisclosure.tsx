/**
 * Progressive Disclosure Components
 *
 * UI patterns for revealing information progressively to reduce cognitive load,
 * including expandable sections, step-by-step reveals, contextual help,
 * and inline explanations.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useId,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface DisclosureLevel {
  id: string;
  label: string;
  description?: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  isDefault?: boolean;
}

export interface TooltipConfig {
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  interactive?: boolean;
  maxWidth?: number;
}

export interface InlineExplanation {
  id: string;
  term: string;
  definition: React.ReactNode;
  learnMoreUrl?: string;
  category?: string;
}

// ============================================================================
// DISCLOSURE CONTEXT
// ============================================================================

interface DisclosureContextValue {
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isExpanded: (id: string) => boolean;
  detailLevel: 'minimal' | 'standard' | 'detailed';
  setDetailLevel: (level: 'minimal' | 'standard' | 'detailed') => void;
  showHelp: boolean;
  toggleHelp: () => void;
  registerSection: (id: string) => void;
  unregisterSection: (id: string) => void;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

export function useDisclosure(): DisclosureContextValue {
  const context = useContext(DisclosureContext);
  if (!context) {
    throw new Error('useDisclosure must be used within a DisclosureProvider');
  }
  return context;
}

// ============================================================================
// DISCLOSURE PROVIDER
// ============================================================================

interface DisclosureProviderProps {
  children: React.ReactNode;
  defaultExpandedIds?: string[];
  defaultDetailLevel?: 'minimal' | 'standard' | 'detailed';
  defaultShowHelp?: boolean;
  persistKey?: string;
}

export function DisclosureProvider({
  children,
  defaultExpandedIds = [],
  defaultDetailLevel = 'standard',
  defaultShowHelp = false,
  persistKey,
}: DisclosureProviderProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (persistKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`disclosure-${persistKey}-expanded`);
      if (stored) return new Set(JSON.parse(stored));
    }
    return new Set(defaultExpandedIds);
  });

  const [detailLevel, setDetailLevel] = useState<'minimal' | 'standard' | 'detailed'>(() => {
    if (persistKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`disclosure-${persistKey}-level`);
      if (stored) return stored as 'minimal' | 'standard' | 'detailed';
    }
    return defaultDetailLevel;
  });

  const [showHelp, setShowHelp] = useState(defaultShowHelp);
  const [registeredIds] = useState<Set<string>>(new Set());

  // Persist state changes
  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      localStorage.setItem(`disclosure-${persistKey}-expanded`, JSON.stringify([...expandedIds]));
      localStorage.setItem(`disclosure-${persistKey}-level`, detailLevel);
    }
  }, [expandedIds, detailLevel, persistKey]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(registeredIds));
  }, [registeredIds]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const registerSection = useCallback((id: string) => {
    registeredIds.add(id);
  }, [registeredIds]);

  const unregisterSection = useCallback((id: string) => {
    registeredIds.delete(id);
  }, [registeredIds]);

  const value: DisclosureContextValue = {
    expandedIds,
    toggleExpanded,
    expandAll,
    collapseAll,
    isExpanded,
    detailLevel,
    setDetailLevel,
    showHelp,
    toggleHelp,
    registerSection,
    unregisterSection,
  };

  return (
    <DisclosureContext.Provider value={value}>
      {children}
    </DisclosureContext.Provider>
  );
}

// ============================================================================
// EXPANDABLE SECTION
// ============================================================================

interface ExpandableSectionProps {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  animationDuration?: number;
  disabled?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export function ExpandableSection({
  id,
  title,
  children,
  defaultExpanded = false,
  icon,
  badge,
  actions,
  className = '',
  headerClassName = '',
  contentClassName = '',
  animationDuration = 200,
  disabled = false,
  onToggle,
}: ExpandableSectionProps): React.ReactElement {
  const { isExpanded, toggleExpanded, registerSection, unregisterSection } = useDisclosure();
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const uniqueId = useId();
  const contentId = `${uniqueId}-content`;

  const expanded = isExpanded(id) || defaultExpanded;

  useEffect(() => {
    registerSection(id);
    return () => unregisterSection(id);
  }, [id, registerSection, unregisterSection]);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, expanded]);

  const handleToggle = () => {
    if (disabled) return;
    toggleExpanded(id);
    onToggle?.(!expanded);
  };

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${headerClassName}`}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span className="font-medium text-gray-900">{title}</span>
          {badge && <span>{badge}</span>}
        </div>

        <div className="flex items-center gap-2">
          {actions && <span onClick={e => e.stopPropagation()}>{actions}</span>}
          <span
            className={`transform transition-transform duration-${animationDuration} ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
        </div>
      </button>

      <div
        id={contentId}
        ref={contentRef}
        className={`overflow-hidden transition-all duration-${animationDuration}`}
        style={{
          maxHeight: expanded ? contentHeight : 0,
          opacity: expanded ? 1 : 0,
        }}
        aria-hidden={!expanded}
      >
        <div className={`p-4 border-t border-gray-200 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ACCORDION
// ============================================================================

interface AccordionProps {
  items: {
    id: string;
    title: React.ReactNode;
    content: React.ReactNode;
    icon?: React.ReactNode;
    disabled?: boolean;
  }[];
  allowMultiple?: boolean;
  defaultExpandedId?: string;
  className?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultExpandedId,
  className = '',
}: AccordionProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    new Set(defaultExpandedId ? [defaultExpandedId] : [])
  );

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map(item => (
        <div
          key={item.id}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => handleToggle(item.id)}
            disabled={item.disabled}
            className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-50"
            aria-expanded={expandedIds.has(item.id)}
          >
            <div className="flex items-center gap-3">
              {item.icon && <span className="text-gray-500">{item.icon}</span>}
              <span className="font-medium text-gray-900">{item.title}</span>
            </div>
            <span className={`transform transition-transform ${expandedIds.has(item.id) ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {expandedIds.has(item.id) && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// STEP REVEAL
// ============================================================================

interface StepRevealProps {
  steps: {
    id: string;
    title: string;
    content: React.ReactNode;
    summary?: React.ReactNode;
    isComplete?: boolean;
    isDisabled?: boolean;
  }[];
  currentStepIndex?: number;
  onStepChange?: (index: number) => void;
  allowJump?: boolean;
  showProgress?: boolean;
  className?: string;
}

export function StepReveal({
  steps,
  currentStepIndex = 0,
  onStepChange,
  allowJump = false,
  showProgress = true,
  className = '',
}: StepRevealProps): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(currentStepIndex);

  useEffect(() => {
    setCurrentIndex(currentStepIndex);
  }, [currentStepIndex]);

  const handleStepClick = (index: number) => {
    if (!allowJump && index > currentIndex) return;
    if (steps[index].isDisabled) return;
    setCurrentIndex(index);
    onStepChange?.(index);
  };

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(currentIndex + 1);
      onStepChange?.(currentIndex + 1);
    }
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      onStepChange?.(currentIndex - 1);
    }
  };

  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className={className}>
      {/* Progress bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentIndex + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => handleStepClick(index)}
              disabled={step.isDisabled || (!allowJump && index > currentIndex)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                index === currentIndex
                  ? 'bg-blue-600 text-white'
                  : index < currentIndex || step.isComplete
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {index < currentIndex || step.isComplete ? (
                <span>✓</span>
              ) : (
                <span>{index + 1}</span>
              )}
              <span className="hidden sm:inline">{step.title}</span>
            </button>

            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current step content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {steps[currentIndex].title}
        </h3>
        {steps[currentIndex].content}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={goPrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={goNext}
            disabled={currentIndex === steps.length - 1}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Completed steps summary */}
      {currentIndex > 0 && (
        <div className="mt-4 space-y-2">
          {steps.slice(0, currentIndex).map((step, index) => (
            step.summary && (
              <div
                key={step.id}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm"
              >
                <span className="text-green-500">✓</span>
                <span className="font-medium">{step.title}:</span>
                <span className="text-gray-600">{step.summary}</span>
                <button
                  onClick={() => handleStepClick(index)}
                  className="ml-auto text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DETAIL LEVEL TOGGLE
// ============================================================================

interface DetailLevelToggleProps {
  className?: string;
  labels?: { minimal: string; standard: string; detailed: string };
}

export function DetailLevelToggle({
  className = '',
  labels = { minimal: 'Simple', standard: 'Standard', detailed: 'Detailed' },
}: DetailLevelToggleProps): React.ReactElement {
  const { detailLevel, setDetailLevel } = useDisclosure();

  const levels: ('minimal' | 'standard' | 'detailed')[] = ['minimal', 'standard', 'detailed'];

  return (
    <div className={`inline-flex rounded-lg bg-gray-100 p-1 ${className}`}>
      {levels.map(level => (
        <button
          key={level}
          onClick={() => setDetailLevel(level)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            detailLevel === level
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {labels[level]}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// CONDITIONAL DETAIL
// ============================================================================

interface ConditionalDetailProps {
  minimal?: React.ReactNode;
  standard?: React.ReactNode;
  detailed?: React.ReactNode;
  children?: React.ReactNode;
  minLevel?: 'minimal' | 'standard' | 'detailed';
}

export function ConditionalDetail({
  minimal,
  standard,
  detailed,
  children,
  minLevel,
}: ConditionalDetailProps): React.ReactElement | null {
  const { detailLevel } = useDisclosure();

  const levelOrder = { minimal: 0, standard: 1, detailed: 2 };

  // If minLevel is specified, only show if current level >= minLevel
  if (minLevel && levelOrder[detailLevel] < levelOrder[minLevel]) {
    return null;
  }

  // Show level-specific content
  switch (detailLevel) {
    case 'minimal':
      return <>{minimal ?? children}</>;
    case 'standard':
      return <>{standard ?? children}</>;
    case 'detailed':
      return <>{detailed ?? children}</>;
    default:
      return <>{children}</>;
  }
}

// ============================================================================
// TOOLTIP
// ============================================================================

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  interactive?: boolean;
  maxWidth?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  interactive = false,
  maxWidth = 250,
  className = '',
}: TooltipProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!interactive) {
      setIsVisible(false);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    } else {
      hideTooltip();
    }
  };

  const handleTooltipMouseEnter = () => {
    if (interactive && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + 8;
          break;
      }

      // Keep within viewport
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

      setPosition({ top, left });
    }
  }, [isVisible, placement]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={handleMouseLeave}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          className={`fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg ${className}`}
          style={{
            top: position.top,
            left: position.left,
            maxWidth,
          }}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              placement === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              placement === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              placement === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </>
  );
}

// ============================================================================
// HELP ICON
// ============================================================================

interface HelpIconProps {
  content: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function HelpIcon({
  content,
  className = '',
  size = 'md',
}: HelpIconProps): React.ReactElement {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  return (
    <Tooltip content={content} interactive>
      <button
        className={`inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${sizeClasses[size]} ${className}`}
        aria-label="Help"
      >
        ?
      </button>
    </Tooltip>
  );
}

// ============================================================================
// INLINE EXPLANATION
// ============================================================================

interface InlineExplanationProps {
  term: string;
  definition: React.ReactNode;
  learnMoreUrl?: string;
  className?: string;
}

export function InlineExplanation({
  term,
  definition,
  learnMoreUrl,
  className = '',
}: InlineExplanationProps): React.ReactElement {
  const { showHelp } = useDisclosure();
  const [expanded, setExpanded] = useState(false);

  if (!showHelp) {
    return <span className={className}>{term}</span>;
  }

  return (
    <span className={`relative inline ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="border-b border-dashed border-blue-400 text-blue-600 hover:text-blue-800 cursor-help"
      >
        {term}
      </button>

      {expanded && (
        <span className="absolute left-0 top-full mt-1 z-10 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm text-left">
          <span className="block text-gray-700">{definition}</span>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-blue-600 hover:text-blue-800"
            >
              Learn more →
            </a>
          )}
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </span>
      )}
    </span>
  );
}

// ============================================================================
// CONTEXTUAL HELP PANEL
// ============================================================================

interface ContextualHelpPanelProps {
  title: string;
  content: React.ReactNode;
  tips?: string[];
  relatedTopics?: { label: string; href: string }[];
  className?: string;
}

export function ContextualHelpPanel({
  title,
  content,
  tips,
  relatedTopics,
  className = '',
}: ContextualHelpPanelProps): React.ReactElement {
  const { showHelp, toggleHelp } = useDisclosure();

  if (!showHelp) return <></>;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-blue-900">{title}</h4>
        <button
          onClick={toggleHelp}
          className="text-blue-600 hover:text-blue-800"
          aria-label="Close help"
        >
          ×
        </button>
      </div>

      <div className="text-sm text-blue-800 mb-4">{content}</div>

      {tips && tips.length > 0 && (
        <div className="mb-4">
          <h5 className="text-xs font-semibold text-blue-700 uppercase mb-2">Tips</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500">💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {relatedTopics && relatedTopics.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-blue-700 uppercase mb-2">Related Topics</h5>
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((topic, i) => (
              <a
                key={i}
                href={topic.href}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {topic.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHOW MORE / SHOW LESS
// ============================================================================

interface ShowMoreProps {
  children: React.ReactNode;
  maxHeight?: number;
  showMoreLabel?: string;
  showLessLabel?: string;
  className?: string;
}

export function ShowMore({
  children,
  maxHeight = 200,
  showMoreLabel = 'Show more',
  showLessLabel = 'Show less',
  className = '',
}: ShowMoreProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsExpansion(contentRef.current.scrollHeight > maxHeight);
    }
  }, [children, maxHeight]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? contentRef.current?.scrollHeight : maxHeight }}
      >
        {children}
      </div>

      {needsExpansion && (
        <>
          {!expanded && (
            <div className="h-12 -mt-12 bg-gradient-to-t from-white to-transparent relative" />
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            {expanded ? showLessLabel : showMoreLabel}
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE LIST
// ============================================================================

interface CollapsibleListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  initialCount?: number;
  showMoreLabel?: (remaining: number) => string;
  showLessLabel?: string;
  className?: string;
}

export function CollapsibleList<T>({
  items,
  renderItem,
  initialCount = 5,
  showMoreLabel = (remaining) => `Show ${remaining} more`,
  showLessLabel = 'Show less',
  className = '',
}: CollapsibleListProps<T>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? items : items.slice(0, initialCount);
  const hiddenCount = items.length - initialCount;

  return (
    <div className={className}>
      {visibleItems.map((item, index) => renderItem(item, index))}

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          {expanded ? showLessLabel : showMoreLabel(hiddenCount)}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// TAB DISCLOSURE
// ============================================================================

interface TabDisclosureProps {
  tabs: {
    id: string;
    label: string;
    content: React.ReactNode;
    badge?: React.ReactNode;
    disabled?: boolean;
  }[];
  defaultTabId?: string;
  className?: string;
  tabClassName?: string;
  contentClassName?: string;
}

export function TabDisclosure({
  tabs,
  defaultTabId,
  className = '',
  tabClassName = '',
  contentClassName = '',
}: TabDisclosureProps): React.ReactElement {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className={className}>
      <div className={`flex border-b border-gray-200 ${tabClassName}`} role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeTabId}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTabId(tab.id)}
            disabled={tab.disabled}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab.id === activeTabId
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {tab.label}
            {tab.badge && <span className="ml-2">{tab.badge}</span>}
          </button>
        ))}
      </div>

      <div
        id={`tabpanel-${activeTabId}`}
        role="tabpanel"
        className={`p-4 ${contentClassName}`}
      >
        {activeTab?.content}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DisclosureProvider,
  useDisclosure,
  ExpandableSection,
  Accordion,
  StepReveal,
  DetailLevelToggle,
  ConditionalDetail,
  Tooltip,
  HelpIcon,
  InlineExplanation,
  ContextualHelpPanel,
  ShowMore,
  CollapsibleList,
  TabDisclosure,
};
