/**
 * QuickActionsRibbon - Bottom ribbon with AI-powered quick action pill buttons.
 * Theme-aware.
 */

import {
  DocumentTextIcon,
  FlagIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import * as T from './ai-theme';

interface QuickAction {
  id: string;
  label: string;
  icon: typeof DocumentTextIcon;
  prompt: string;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'draft-review', label: 'Draft Review', icon: DocumentTextIcon, prompt: 'Help me draft a performance review for my direct report. Walk me through the key areas to cover.', gradient: 'from-purple-500/20 to-violet-500/20' },
  { id: 'set-goals', label: 'Set Goals', icon: FlagIcon, prompt: 'Help me create SMART goals for the upcoming quarter. Consider my team\'s current performance data.', gradient: 'from-blue-500/20 to-indigo-500/20' },
  { id: 'team-report', label: 'Team Report', icon: UserGroupIcon, prompt: 'Generate a comprehensive team performance report including key metrics, trends, and recommendations.', gradient: 'from-cyan-500/20 to-teal-500/20' },
  { id: 'analyze-performance', label: 'Analyze Performance', icon: ChartBarIcon, prompt: 'Analyze my team\'s performance trends over the past quarter. Highlight any outliers or concerning patterns.', gradient: 'from-emerald-500/20 to-green-500/20' },
  { id: 'security-check', label: 'Security Check', icon: ShieldCheckIcon, prompt: 'Run a security audit check. Show me any unusual login activity, access violations, or security alerts.', gradient: 'from-rose-500/20 to-red-500/20' },
];

interface QuickActionsRibbonProps { onAction: (prompt: string) => void; }

export function QuickActionsRibbon({ onAction }: QuickActionsRibbonProps) {
  const { theme } = useAIWorkspaceStore();

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      <span className={`flex-shrink-0 text-[10px] font-medium tracking-wider mr-1 ${T.textMuted(theme)}`}>
        Quick
      </span>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.prompt)}
          className={`group flex flex-shrink-0 items-center gap-2 rounded-full border backdrop-blur-sm px-3.5 py-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
            theme === 'light'
              ? `border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-md hover:text-gray-900`
              : `border-white/10 bg-gradient-to-r ${action.gradient} hover:border-white/20 hover:shadow-lg ${T.accentGlow(theme)}`
          }`}
        >
          <action.icon className={`h-3.5 w-3.5 transition-colors ${
            theme === 'light' ? 'text-gray-400 group-hover:text-gray-700' : 'text-gray-400 group-hover:text-white'
          }`} />
          <span className={`text-xs font-medium whitespace-nowrap transition-colors ${
            theme === 'light' ? 'text-gray-600 group-hover:text-gray-900' : 'text-gray-300 group-hover:text-white'
          }`}>
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
