/**
 * TaskProgressIndicator — inline task progress widget for SwarmChat messages.
 *
 * When an agentic response includes a taskId, this widget is shown inline
 * to display step progress and provide a link to the full Tasks view.
 */

import {
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';
import * as T from './ai-theme';

interface TaskProgressIndicatorProps {
  taskId: string;
  status: string;
  totalSteps: number;
  completedSteps: number;
  awaitingApproval?: boolean;
}

const STATUS_ICON: Record<string, typeof BoltIcon> = {
  planning: BoltIcon,
  executing: BoltIcon,
  completed: CheckCircleIcon,
  failed: XCircleIcon,
  awaiting_approval: ExclamationTriangleIcon,
};

const STATUS_COLOR: Record<string, string> = {
  planning: 'text-blue-400',
  executing: 'text-amber-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
  awaiting_approval: 'text-orange-400',
};

export function TaskProgressIndicator({
  taskId,
  status,
  totalSteps,
  completedSteps,
  awaitingApproval,
}: TaskProgressIndicatorProps) {
  const { theme, setSwarmMode } = useAIWorkspaceStore();

  const Icon = STATUS_ICON[status] || BoltIcon;
  const color = STATUS_COLOR[status] || 'text-gray-400';
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className={`mt-2 rounded-lg border p-3 ${T.borderLight(theme)} ${T.surface(theme)}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color} ${status === 'executing' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-medium ${T.textPrimary(theme)}`}>
            {status === 'planning' && 'Creating execution plan...'}
            {status === 'executing' && `Executing step ${completedSteps + 1} of ${totalSteps}...`}
            {status === 'completed' && `Task completed (${completedSteps} steps)`}
            {status === 'failed' && 'Task failed'}
            {status === 'awaiting_approval' && 'Awaiting your approval'}
          </span>
        </div>

        <button
          onClick={() => setSwarmMode('tasks')}
          className={`flex items-center gap-1 text-2xs font-medium ${T.accentText(theme)} hover:underline`}
          title="View in Tasks panel"
        >
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          Details
        </button>
      </div>

      {/* Progress bar */}
      <div className={`w-full h-1 rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-white/5'}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${T.accentGradient(theme)} ${
            status === 'executing' ? 'animate-pulse' : ''
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {awaitingApproval && (
        <p className="mt-2 text-2xs text-orange-400 font-medium">
          An action requires your approval. Click "Details" to review.
        </p>
      )}
    </div>
  );
}
