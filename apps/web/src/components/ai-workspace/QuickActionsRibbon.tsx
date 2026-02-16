/**
 * QuickActionsRibbon - Bottom ribbon with AI-powered quick action pill buttons.
 *
 * Each button sends a predefined prompt to the chat panel. The ribbon uses
 * glassmorphism styling and horizontally scrolls on smaller viewports.
 */

import {
  DocumentTextIcon,
  FlagIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

// ── Quick Action Definitions ──────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  icon: typeof DocumentTextIcon;
  prompt: string;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'draft-review',
    label: 'Draft Review',
    icon: DocumentTextIcon,
    prompt: 'Help me draft a performance review for my direct report. Walk me through the key areas to cover.',
    gradient: 'from-purple-500/20 to-violet-500/20',
  },
  {
    id: 'set-goals',
    label: 'Set Goals',
    icon: FlagIcon,
    prompt: 'Help me create SMART goals for the upcoming quarter. Consider my team\'s current performance data.',
    gradient: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    id: 'team-report',
    label: 'Team Report',
    icon: UserGroupIcon,
    prompt: 'Generate a comprehensive team performance report including key metrics, trends, and recommendations.',
    gradient: 'from-cyan-500/20 to-teal-500/20',
  },
  {
    id: 'analyze-performance',
    label: 'Analyze Performance',
    icon: ChartBarIcon,
    prompt: 'Analyze my team\'s performance trends over the past quarter. Highlight any outliers or concerning patterns.',
    gradient: 'from-emerald-500/20 to-green-500/20',
  },
  {
    id: 'security-check',
    label: 'Security Check',
    icon: ShieldCheckIcon,
    prompt: 'Run a security audit check. Show me any unusual login activity, access violations, or security alerts.',
    gradient: 'from-rose-500/20 to-red-500/20',
  },
];

// ── Props ─────────────────────────────────────────────────────

interface QuickActionsRibbonProps {
  onAction: (prompt: string) => void;
}

// ── Component ─────────────────────────────────────────────────

export function QuickActionsRibbon({ onAction }: QuickActionsRibbonProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wider text-gray-600 mr-1">
        Quick
      </span>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.prompt)}
          className={`group flex flex-shrink-0 items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r ${action.gradient} backdrop-blur-sm px-3.5 py-1.5 transition-all duration-200 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02] active:scale-[0.98]`}
        >
          <action.icon className="h-3.5 w-3.5 text-gray-400 group-hover:text-white transition-colors" />
          <span className="text-xs font-medium text-gray-300 group-hover:text-white whitespace-nowrap transition-colors">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
