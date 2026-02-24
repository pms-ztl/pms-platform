/**
 * SwarmTasks — Task tracking + approval UI for Neural Swarm agentic AI.
 *
 * Mode 4 of the Neural Swarm workspace. Shows:
 * - Left sidebar: Task list with status badges
 * - Center: Selected task detail with step-by-step execution view
 * - Approval UI: Approve/Reject buttons for pending actions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  QueueListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  StopIcon,
  SparklesIcon,
  CpuChipIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import { useAITasksStore } from '@/store/ai-tasks';
import type { AgentTask, AgentTaskAction } from '@/lib/api/ai';
import * as T from './ai-theme';

// ── Status Config ──────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircleIcon; bgClass: string }> = {
  pending: { label: 'Pending', color: 'text-gray-400', icon: ClockIcon, bgClass: 'bg-gray-500/10' },
  planning: { label: 'Planning', color: 'text-blue-400', icon: CpuChipIcon, bgClass: 'bg-blue-500/10' },
  executing: { label: 'Executing', color: 'text-amber-400', icon: BoltIcon, bgClass: 'bg-amber-500/10' },
  awaiting_approval: { label: 'Needs Approval', color: 'text-orange-400', icon: ExclamationTriangleIcon, bgClass: 'bg-orange-500/10' },
  completed: { label: 'Completed', color: 'text-emerald-400', icon: CheckCircleIcon, bgClass: 'bg-emerald-500/10' },
  failed: { label: 'Failed', color: 'text-red-400', icon: XCircleIcon, bgClass: 'bg-red-500/10' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', icon: StopIcon, bgClass: 'bg-gray-500/10' },
};

const ACTION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-gray-400' },
  executing: { label: 'Running', color: 'text-amber-400' },
  completed: { label: 'Done', color: 'text-emerald-400' },
  failed: { label: 'Failed', color: 'text-red-400' },
  awaiting_approval: { label: 'Awaiting Approval', color: 'text-orange-400' },
  approved: { label: 'Approved', color: 'text-emerald-400' },
  rejected: { label: 'Rejected', color: 'text-red-400' },
};

// ── Component ──────────────────────────────────────────────

export function SwarmTasks() {
  const { theme } = useAIWorkspaceStore();
  const {
    tasks,
    pendingApprovals,
    selectedTaskId,
    isLoading,
    fetchTasks,
    fetchPendingApprovals,
    setSelectedTask,
    cancelTask,
    approveAction,
    rejectAction,
    fetchTask,
  } = useAITasksStore();

  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filter, setFilter] = useState<string>('all');

  // Initial fetch + polling
  useEffect(() => {
    fetchTasks();
    fetchPendingApprovals();

    const interval = setInterval(() => {
      fetchTasks();
      fetchPendingApprovals();
    }, 10_000); // Poll every 10s

    return () => clearInterval(interval);
  }, [fetchTasks, fetchPendingApprovals]);

  // Fetch detail when selected
  useEffect(() => {
    if (selectedTaskId) {
      fetchTask(selectedTaskId);
    }
  }, [selectedTaskId, fetchTask]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['planning', 'executing', 'awaiting_approval'].includes(t.status);
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'proactive') return t.isProactive;
    return true;
  });

  const handleReject = useCallback(async () => {
    if (rejectDialogId && rejectReason.trim()) {
      await rejectAction(rejectDialogId, rejectReason.trim());
      setRejectDialogId(null);
      setRejectReason('');
    }
  }, [rejectDialogId, rejectReason, rejectAction]);

  return (
    <div className="flex h-full">
      {/* ── Left Sidebar: Task List ──────────────────── */}
      <div className={`flex flex-col border-r ${T.border(theme)} ${T.surface(theme)} ${
        selectedTaskId ? 'hidden md:flex md:w-80 md:shrink-0' : 'w-full md:w-80 md:shrink-0'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b ${T.border(theme)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <QueueListIcon className={`h-5 w-5 ${T.accentText(theme)}`} />
              <span className={`text-sm font-semibold ${T.textPrimary(theme)}`}>
                Agentic Tasks
              </span>
            </div>
            <button
              onClick={() => { fetchTasks(); fetchPendingApprovals(); }}
              className={`p-1 rounded-md transition-colors ${T.surfaceHover(theme)} ${T.textMuted(theme)}`}
              title="Refresh"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Pending approvals banner */}
          {pendingApprovals.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2 mb-3">
              <ExclamationTriangleIcon className="h-4 w-4 text-orange-400 shrink-0" />
              <span className="text-xs font-medium text-orange-300">
                {pendingApprovals.length} action{pendingApprovals.length > 1 ? 's' : ''} awaiting approval
              </span>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'completed', label: 'Done' },
              { key: 'proactive', label: 'Auto' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === f.key
                    ? `${T.accentBg(theme)} ${T.accentText(theme)}`
                    : `${T.textMuted(theme)} hover:${T.textSecondary(theme)}`
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className={`flex-1 overflow-y-auto ${T.scrollbar(theme)}`}>
          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <QueueListIcon className={`h-10 w-10 mb-3 ${T.textMuted(theme)}`} />
              <p className={`text-sm ${T.textMuted(theme)} text-center`}>
                No tasks yet. When you ask the AI to do something, tasks will appear here.
              </p>
            </div>
          )}

          {filteredTasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const isSelected = selectedTaskId === task.id;

            return (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
                className={`w-full text-left px-4 py-3 border-b ${T.borderLight(theme)} transition-all ${
                  isSelected
                    ? `${T.accentBg(theme)} border-l-2 ${
                        theme === 'light' ? 'border-l-blue-500' : theme === 'dark' ? 'border-l-purple-500' : 'border-l-cyan-500'
                      }`
                    : `${T.surfaceHover(theme)}`
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${statusCfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium break-words ${T.textPrimary(theme)}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-2xs px-1.5 py-0.5 rounded ${statusCfg.bgClass} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {task.agentType === 'coordinator' && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                          Multi-Agent
                        </span>
                      )}
                      {task.parentTaskId && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                          Sub-task
                        </span>
                      )}
                      {task.isProactive && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                          Auto
                        </span>
                      )}
                      <span className={`text-2xs ${T.textMuted(theme)}`}>
                        {task.currentStep}/{task.totalSteps}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center: Task Detail ─────────────────────── */}
      <div className={`flex-1 overflow-y-auto ${T.scrollbar(theme)} ${!selectedTaskId ? 'hidden md:block' : ''}`}>
        {!selectedTask ? (
          <div className="flex flex-col items-center justify-center h-full">
            <CpuChipIcon className={`h-16 w-16 mb-4 ${T.textMuted(theme)}`} />
            <h3 className={`text-lg font-semibold mb-2 ${T.textPrimary(theme)}`}>
              Agentic Task Tracker
            </h3>
            <p className={`text-sm max-w-md text-center ${T.textMuted(theme)}`}>
              Select a task from the sidebar to view its execution details, step-by-step progress, and approve or reject pending actions.
            </p>
          </div>
        ) : (
          <div className="p-4 md:p-6 max-w-3xl mx-auto">
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedTask(null as any)}
              className={`md:hidden flex items-center gap-1.5 mb-3 text-xs font-medium ${T.textSecondary(theme)} ${T.surfaceHover(theme)} rounded-lg px-2 py-1`}
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to tasks
            </button>
            {/* Task Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg = STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bgClass} ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </span>
                    );
                  })()}
                  {selectedTask.isProactive && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400">
                      <SparklesIcon className="h-3 w-3" />
                      Proactive
                    </span>
                  )}
                </div>
                {['planning', 'executing', 'awaiting_approval'].includes(selectedTask.status) && (
                  <button
                    onClick={() => cancelTask(selectedTask.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <StopIcon className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                )}
              </div>

              <h2 className={`text-xl font-bold mb-1 ${T.textPrimary(theme)}`}>
                {selectedTask.title}
              </h2>
              <p className={`text-sm ${T.textSecondary(theme)}`}>
                {selectedTask.goal}
              </p>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${T.textMuted(theme)}`}>
                    Progress: {selectedTask.currentStep}/{selectedTask.totalSteps} steps
                  </span>
                  <span className={`text-xs ${T.textMuted(theme)}`}>
                    {selectedTask.totalSteps > 0
                      ? Math.round((selectedTask.currentStep / selectedTask.totalSteps) * 100)
                      : 0}%
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-white/5'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${T.accentGradient(theme)}`}
                    style={{
                      width: `${selectedTask.totalSteps > 0 ? (selectedTask.currentStep / selectedTask.totalSteps) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Error message */}
              {selectedTask.error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <XCircleIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-300">{selectedTask.error}</span>
                </div>
              )}

              {/* Result summary */}
              {selectedTask.result && (selectedTask.result as any).summary && (
                <div className={`mt-3 rounded-lg p-3 ${T.surface(theme)}`}>
                  <p className={`text-xs font-medium mb-1 ${T.textSecondary(theme)}`}>Result Summary</p>
                  <p className={`text-sm whitespace-pre-wrap ${T.textPrimary(theme)}`}>
                    {(selectedTask.result as any).summary}
                  </p>
                </div>
              )}
            </div>

            {/* Step-by-Step Execution */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${T.textPrimary(theme)}`}>
                Execution Steps
              </h3>

              {(!selectedTask.actions || selectedTask.actions.length === 0) ? (
                <p className={`text-sm ${T.textMuted(theme)}`}>
                  {selectedTask.status === 'planning' ? 'Planning steps...' : 'No actions recorded yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedTask.actions.map((action, i) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      index={i}
                      isCurrentStep={i === selectedTask.currentStep && ['executing', 'awaiting_approval'].includes(selectedTask.status)}
                      theme={theme}
                      onApprove={() => approveAction(action.id)}
                      onReject={() => {
                        setRejectDialogId(action.id);
                        setRejectReason('');
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Plan preview (future steps) */}
              {selectedTask.plan && selectedTask.actions && selectedTask.actions.length < (selectedTask.plan as any[]).length && (
                <div className="mt-4">
                  <p className={`text-xs font-medium mb-2 ${T.textMuted(theme)}`}>
                    Upcoming Steps
                  </p>
                  {(selectedTask.plan as any[]).slice(selectedTask.actions.length).map((step: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 opacity-50 ${T.surface(theme)}`}
                    >
                      <span className={`text-2xs font-mono ${T.textMuted(theme)}`}>
                        {selectedTask.actions!.length + i + 1}
                      </span>
                      <span className={`text-xs ${T.textSecondary(theme)}`}>
                        <span className="font-medium">{step.toolName}</span>
                        {step.reasoning && <span className="ml-1.5 opacity-70">— {step.reasoning}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Reject Dialog ────────────────────────────── */}
      {rejectDialogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-96 rounded-xl p-5 ${T.surface(theme)} shadow-2xl`}>
            <h3 className={`text-sm font-semibold mb-3 ${T.textPrimary(theme)}`}>
              Reject Action
            </h3>
            <p className={`text-xs mb-3 ${T.textSecondary(theme)}`}>
              Provide a reason for rejecting this action. The AI will replan without it.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className={`w-full h-20 rounded-lg px-3 py-2 text-sm resize-none ${T.inputField(theme)}`}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setRejectDialogId(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${T.textMuted(theme)} hover:${T.textPrimary(theme)} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ActionCard ─────────────────────────────────────────────

function ActionCard({
  action,
  index,
  isCurrentStep,
  theme,
  onApprove,
  onReject,
}: {
  action: AgentTaskAction;
  index: number;
  isCurrentStep: boolean;
  theme: 'light' | 'dark' | 'deep-dark';
  onApprove: () => void;
  onReject: () => void;
}) {
  const [showOutput, setShowOutput] = useState(false);
  const statusCfg = ACTION_STATUS_CONFIG[action.status] || ACTION_STATUS_CONFIG.pending;

  return (
    <div
      className={`rounded-lg border transition-all ${
        isCurrentStep
          ? `border-orange-500/30 ${theme === 'light' ? 'bg-orange-50' : 'bg-orange-500/5'}`
          : `${T.borderLight(theme)} ${T.surface(theme)}`
      }`}
    >
      <div className="px-3 py-2.5">
        {/* Step header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`text-2xs font-mono w-5 text-center ${T.textMuted(theme)}`}>
              {index + 1}
            </span>
            <span className={`text-xs font-semibold font-mono ${T.accentText(theme)}`}>
              {action.toolName}
            </span>
            <span className={`text-2xs px-1.5 py-0.5 rounded ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            {action.impactLevel !== 'read' && (
              <span className={`text-2xs px-1.5 py-0.5 rounded ${
                action.impactLevel === 'high_write' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {action.impactLevel}
              </span>
            )}
          </div>

          {action.toolOutput && (
            <button
              onClick={() => setShowOutput(!showOutput)}
              className={`text-2xs ${T.textMuted(theme)} hover:${T.textSecondary(theme)} transition-colors`}
            >
              {showOutput ? 'Hide' : 'Show'} output
            </button>
          )}
        </div>

        {/* Reasoning */}
        {action.reasoning && (
          <p className={`mt-1.5 ml-7.5 text-xs ${T.textSecondary(theme)}`}>
            {action.reasoning}
          </p>
        )}

        {/* Output preview */}
        {showOutput && action.toolOutput && (
          <pre className={`mt-2 ml-7.5 p-2 rounded text-2xs overflow-x-auto max-h-32 ${
            theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-black/30 text-gray-300'
          }`}>
            {JSON.stringify(action.toolOutput, null, 2).slice(0, 2000)}
          </pre>
        )}

        {/* Rejection reason */}
        {action.rejectionReason && (
          <div className="mt-2 ml-7.5 flex items-start gap-1.5">
            <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300">Rejected: {action.rejectionReason}</span>
          </div>
        )}

        {/* Approval buttons */}
        {action.status === 'awaiting_approval' && (
          <div className="mt-3 ml-7.5 flex items-center gap-2">
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              <HandThumbUpIcon className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <HandThumbDownIcon className="h-3.5 w-3.5" />
              Reject
            </button>
            <span className={`text-2xs italic ${T.textMuted(theme)}`}>
              This action requires your approval before execution.
            </span>
          </div>
        )}

        {/* Metrics */}
        {action.latencyMs > 0 && (
          <div className={`mt-1.5 ml-7.5 flex items-center gap-3 text-2xs ${T.textMuted(theme)}`}>
            <span>{action.latencyMs}ms</span>
            {action.costCents > 0 && <span>${action.costCents.toFixed(4)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
