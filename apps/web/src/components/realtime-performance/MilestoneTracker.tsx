/**
 * Feature 8: Live Project Milestone Tracker
 *
 * Milestone visualization with automated detection and dynamic timeline adjustments
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FlagIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  CalendarIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface Milestone {
  id: string;
  title: string;
  description?: string;
  milestoneType: string;
  plannedDate: string;
  actualDate?: string;
  originalPlannedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';
  progressPercentage: number;
  delayDays: number;
  velocityBasedEta?: string;
  autoDetected: boolean;
  owner?: { firstName: string; lastName: string };
  goal?: { title: string };
}

interface MilestoneTimeline {
  milestones: Milestone[];
  byStatus: {
    pending: Milestone[];
    inProgress: Milestone[];
    completed: Milestone[];
    delayed: Milestone[];
    atRisk: Milestone[];
  };
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    delayed: number;
    healthScore: number;
  };
}

const api = {
  getTimeline: async (goalId?: string): Promise<MilestoneTimeline> => {
    const url = goalId
      ? `/api/v1/realtime-performance/milestones/timeline?goalId=${goalId}`
      : '/api/v1/realtime-performance/milestones/timeline';
    const res = await fetchWithAuth(url);
    const data = await res.json();
    return data.data;
  },
  detectMilestones: async (goalId: string): Promise<any[]> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/milestones/detect', {
      method: 'POST',
      body: JSON.stringify({ goalId }),
    });
    const data = await res.json();
    return data.data;
  },
  createMilestone: async (milestone: any): Promise<any> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/milestones', {
      method: 'POST',
      body: JSON.stringify(milestone),
    });
    const data = await res.json();
    return data.data;
  },
  updateMilestone: async (id: string, update: any): Promise<any> => {
    const res = await fetchWithAuth(`/api/v1/realtime-performance/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
    const data = await res.json();
    return data.data;
  },
};

const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'gray',
    bg: 'bg-secondary-100 dark:bg-secondary-800',
    border: 'border-secondary-200 dark:border-secondary-700',
    text: 'text-secondary-600 dark:text-secondary-400',
    label: 'Pending',
  },
  in_progress: {
    icon: ArrowPathIcon,
    color: 'blue',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircleIcon,
    color: 'green',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
    label: 'Completed',
  },
  delayed: {
    icon: ExclamationTriangleIcon,
    color: 'red',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
    label: 'Delayed',
  },
  at_risk: {
    icon: ExclamationTriangleIcon,
    color: 'yellow',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'At Risk',
  },
};

const HealthGauge = ({ score }: { score: number }) => {
  const getColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2 w-full px-2 overflow-hidden">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-secondary-200 dark:text-secondary-700"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${score * 1.76} 176`}
            strokeLinecap="round"
            className={getColor()}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('text-lg font-bold', getColor())}>{score}</span>
        </div>
      </div>
      <div className="text-center w-full max-w-full">
        <div className="text-xs font-medium text-secondary-900 dark:text-white break-words px-1">Project Health</div>
        <div className={clsx('text-2xs break-words px-1', getColor())}>
          {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Attention'}
        </div>
      </div>
    </div>
  );
};

const MilestoneCard = ({
  milestone,
  onUpdate,
}: {
  milestone: Milestone;
  onUpdate: (id: string, status: string, progress: number) => void;
}) => {
  const config = statusConfig[milestone.status];
  const Icon = config.icon;

  const plannedDate = new Date(milestone.plannedDate);
  const now = new Date();
  const isPastDue = plannedDate < now && milestone.status !== 'completed';

  return (
    <div className={clsx(
      'rounded-xl border p-4 transition-all hover:shadow-md',
      config.bg,
      config.border
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={clsx('p-2 rounded-lg', config.bg)}>
            <Icon className={clsx('h-5 w-5', config.text)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              {milestone.autoDetected && (
                <SparklesIcon className="h-4 w-4 text-purple-500" title="AI Detected" />
              )}
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-full',
                config.bg, config.text
              )}>
                {config.label}
              </span>
              {milestone.delayDays > 0 && (
                <span className="text-xs text-red-500">
                  +{milestone.delayDays} days
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mt-1">
              {milestone.title}
            </h4>
            {milestone.description && (
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                {milestone.description}
              </p>
            )}
            {milestone.goal && (
              <div className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 flex items-center">
                <FlagIcon className="h-3 w-3 mr-1" />
                {milestone.goal.title}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-secondary-500 dark:text-secondary-400 mb-1">
          <span>Progress</span>
          <span>{milestone.progressPercentage}%</span>
        </div>
        <div className="w-full h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full">
          <div
            className={clsx(
              'h-2 rounded-full transition-all',
              config.text.replace('text-', 'bg-')
            )}
            style={{ width: `${milestone.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className={clsx(
          'flex items-center',
          isPastDue ? 'text-red-500' : 'text-secondary-500 dark:text-secondary-400'
        )}>
          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
          {plannedDate.toLocaleDateString()}
          {isPastDue && <span className="ml-1">(overdue)</span>}
        </div>
        {milestone.velocityBasedEta && milestone.status !== 'completed' && (
          <div className="text-secondary-500 dark:text-secondary-400">
            ETA: {new Date(milestone.velocityBasedEta).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {milestone.status !== 'completed' && (
        <div className="mt-4 flex space-x-2">
          {milestone.status === 'pending' && (
            <button
              onClick={() => onUpdate(milestone.id, 'in_progress', milestone.progressPercentage)}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Start
            </button>
          )}
          {milestone.status === 'in_progress' && (
            <>
              <button
                onClick={() => onUpdate(milestone.id, milestone.status, Math.min(100, milestone.progressPercentage + 25))}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200"
              >
                +25%
              </button>
              <button
                onClick={() => onUpdate(milestone.id, 'completed', 100)}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Complete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const TimelineView = ({ milestones }: { milestones: Milestone[] }) => {
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
  );

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-secondary-200 dark:bg-secondary-700" />

      <div className="space-y-4">
        {sortedMilestones.map((milestone, index) => {
          const config = statusConfig[milestone.status];
          const Icon = config.icon;

          return (
            <div key={milestone.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={clsx(
                'absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                milestone.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : milestone.status === 'in_progress'
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600'
              )}>
                {milestone.status === 'completed' && (
                  <CheckCircleIcon className="h-3 w-3 text-white" />
                )}
              </div>

              {/* Content */}
              <div className={clsx(
                'rounded-lg border p-3',
                config.bg,
                config.border
              )}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">
                    {milestone.title}
                  </h4>
                  <span className={clsx('text-xs', config.text)}>
                    {new Date(milestone.plannedDate).toLocaleDateString()}
                  </span>
                </div>
                {milestone.status !== 'completed' && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full">
                      <div
                        className={clsx(
                          'h-1.5 rounded-full',
                          config.text.replace('text-', 'bg-')
                        )}
                        style={{ width: `${milestone.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function MilestoneTracker() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: timeline, isLoading } = useQuery({
    queryKey: ['milestoneTimeline', selectedGoalId],
    queryFn: () => api.getTimeline(selectedGoalId),
  });

  const createMutation = useMutation({
    mutationFn: (milestone: any) => api.createMilestone(milestone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestoneTimeline'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, progress }: { id: string; status: string; progress: number }) =>
      api.updateMilestone(id, { status, progressPercentage: progress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestoneTimeline'] });
    },
  });

  const handleUpdate = (id: string, status: string, progress: number) => {
    updateMutation.mutate({ id, status, progress });
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const milestone = {
      title: formData.get('title'),
      description: formData.get('description'),
      milestoneType: formData.get('milestoneType') || 'checkpoint',
      plannedDate: formData.get('plannedDate'),
      goalId: selectedGoalId,
    };
    createMutation.mutate(milestone);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const summary = timeline?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
            <FlagIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
              Project Milestones
            </h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Live milestone tracking with dynamic timelines
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'cards'
                  ? 'bg-white dark:bg-secondary-700 shadow text-secondary-900 dark:text-white'
                  : 'text-secondary-600 dark:text-secondary-400'
              )}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-secondary-700 shadow text-secondary-900 dark:text-white'
                  : 'text-secondary-600 dark:text-secondary-400'
              )}
            >
              Timeline
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Milestone
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 overflow-hidden">
          <HealthGauge score={summary?.healthScore || 0} />
        </div>
        <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 overflow-hidden">
          <div className="text-sm text-secondary-500 break-words">Total</div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white break-words">{summary?.total || 0}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 overflow-hidden">
          <div className="text-sm text-green-600 break-words">Completed</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300 break-words">{summary?.completed || 0}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 overflow-hidden">
          <div className="text-sm text-blue-600 break-words">In Progress</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 break-words">{summary?.inProgress || 0}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4 overflow-hidden">
          <div className="text-sm text-red-600 break-words">Delayed</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 break-words">{summary?.delayed || 0}</div>
        </div>
      </div>

      {/* Milestones */}
      {timeline?.milestones && timeline.milestones.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timeline.milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <TimelineView milestones={timeline.milestones} />
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700">
          <FlagIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white">No milestones yet</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Create your first milestone to start tracking project progress
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Milestone
          </button>
        </div>
      )}

      {/* Create Milestone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-secondary-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Create Milestone</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                  placeholder="Milestone title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                  placeholder="Milestone description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Planned Date *
                </label>
                <input
                  type="date"
                  name="plannedDate"
                  required
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Type
                </label>
                <select
                  name="milestoneType"
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                >
                  <option value="checkpoint">Checkpoint</option>
                  <option value="deliverable">Deliverable</option>
                  <option value="review">Review</option>
                  <option value="deadline">Deadline</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MilestoneTracker;
