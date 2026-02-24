import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  HandThumbUpIcon,
  SparklesIcon,
  ArrowPathIcon,
  FunnelIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';

import { feedbackApi, usersApi, type Feedback, type CreateFeedbackInput, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

const feedbackTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PRAISE: { label: 'Praise', color: 'bg-success-100 text-success-800', icon: SparklesIcon },
  CONSTRUCTIVE: { label: 'Constructive', color: 'bg-warning-100 text-warning-800', icon: ChatBubbleLeftRightIcon },
  SUGGESTION: { label: 'Suggestion', color: 'bg-info-100 text-info-800', icon: SparklesIcon },
  REQUEST: { label: 'Request', color: 'bg-primary-100 text-primary-800', icon: ArrowPathIcon },
  RECOGNITION: { label: 'Recognition', color: 'bg-purple-100 text-purple-800', icon: HandThumbUpIcon },
};

const visibilityLabels: Record<string, string> = {
  PRIVATE: 'Private (only recipient)',
  MANAGER_VISIBLE: 'Visible to manager',
  PUBLIC: 'Public (team visible)',
};

export function FeedbackPage() {
  usePageTitle('Feedback');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'received' | 'given' | 'timeline'>('received');
  const [showGiveFeedbackModal, setShowGiveFeedbackModal] = useState(false);
  const [showRequestFeedbackModal, setShowRequestFeedbackModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data: receivedFeedback, isLoading: loadingReceived } = useQuery({
    queryKey: ['feedback', 'received', { type: typeFilter }],
    queryFn: () => feedbackApi.listReceived({ type: typeFilter || undefined }),
    enabled: activeTab === 'received',
  });

  const { data: givenFeedback, isLoading: loadingGiven } = useQuery({
    queryKey: ['feedback', 'given'],
    queryFn: () => feedbackApi.listGiven({}),
    enabled: activeTab === 'given',
  });

  const { data: timeline, isLoading: loadingTimeline } = useQuery({
    queryKey: ['feedback', 'timeline'],
    queryFn: () => feedbackApi.getTimeline(),
    enabled: activeTab === 'timeline',
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['users', 'team-members'],
    queryFn: () => usersApi.getTeamMembers(),  // FIXED: Using new endpoint without permissions
  });

  const createFeedbackMutation = useMutation({
    mutationFn: (data: CreateFeedbackInput) => feedbackApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['received-feedback'] });
      setShowGiveFeedbackModal(false);
      toast.success('Feedback sent successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send feedback');
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => feedbackApi.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Feedback acknowledged');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to acknowledge');
    },
  });

  const requestFeedbackMutation = useMutation({
    mutationFn: ({ fromUserId, message }: { fromUserId: string; message?: string }) =>
      feedbackApi.requestFeedback(fromUserId, user?.id, message),
    onSuccess: () => {
      setShowRequestFeedbackModal(false);
      toast.success('Feedback request sent');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send request');
    },
  });

  const renderFeedbackCard = (feedback: Feedback, showAcknowledge = false) => {
    const TypeIcon = feedbackTypeConfig[feedback.type]?.icon || ChatBubbleLeftRightIcon;

    return (
      <div key={feedback.id} className="card card-body">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {feedback.isAnonymous ? (
              <div className="w-10 h-10 rounded-full bg-secondary-200 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-secondary-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {feedback.fromUser?.firstName?.[0]}{feedback.fromUser?.lastName?.[0]}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium text-secondary-900 dark:text-white">
                {feedback.isAnonymous ? 'Anonymous' : `${feedback.fromUser?.firstName} ${feedback.fromUser?.lastName}`}
              </span>
              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', feedbackTypeConfig[feedback.type]?.color)}>
                {feedbackTypeConfig[feedback.type]?.label || feedback.type}
              </span>
              <span className="text-xs text-secondary-400">
                {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-2 text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">{feedback.content}</p>
            {feedback.tags && feedback.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {feedback.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 sm:gap-4 flex-wrap">
              <span className="text-xs text-secondary-400">
                To: {feedback.toUser.firstName} {feedback.toUser.lastName}
              </span>
              <span className="text-xs text-secondary-400">
                {visibilityLabels[feedback.visibility] || feedback.visibility}
              </span>
              {showAcknowledge && !feedback.isAcknowledged && (
                <button
                  onClick={() => acknowledgeMutation.mutate(feedback.id)}
                  className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 whitespace-nowrap"
                >
                  <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                  Acknowledge
                </button>
              )}
              {feedback.isAcknowledged && (
                <span className="text-xs text-success-600 flex items-center gap-1 whitespace-nowrap">
                  <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                  Acknowledged
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === 'received') {
      if (loadingReceived) {
        return (
          <div className="flex justify-center py-12">
            <div className="glass-spinner" />
          </div>
        );
      }
      if (!receivedFeedback?.data.length) {
        return (
          <div className="card card-body text-center py-12">
            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-secondary-300" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No feedback received</h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Request feedback from your colleagues to get started.
            </p>
            <button onClick={() => setShowRequestFeedbackModal(true)} className="btn-primary mt-4">
              Request Feedback
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {receivedFeedback.data.map((feedback) => renderFeedbackCard(feedback, true))}
        </div>
      );
    }

    if (activeTab === 'given') {
      if (loadingGiven) {
        return (
          <div className="flex justify-center py-12">
            <div className="glass-spinner" />
          </div>
        );
      }
      if (!givenFeedback?.data.length) {
        return (
          <div className="card card-body text-center py-12">
            <PaperAirplaneIcon className="mx-auto h-12 w-12 text-secondary-300" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No feedback given</h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Share feedback with your colleagues to help them grow.
            </p>
            <button onClick={() => setShowGiveFeedbackModal(true)} className="btn-primary mt-4">
              Give Feedback
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {givenFeedback.data.map((feedback) => renderFeedbackCard(feedback))}
        </div>
      );
    }

    if (activeTab === 'timeline') {
      if (loadingTimeline) {
        return (
          <div className="flex justify-center py-12">
            <div className="glass-spinner" />
          </div>
        );
      }
      if (!timeline?.length) {
        return (
          <div className="card card-body text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-secondary-300" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No activity yet</h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Your feedback timeline will appear here.
            </p>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {timeline.map((event: any, index: number) => (
            <div key={index} className="card card-body">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  event.type === 'feedback' ? 'bg-primary-100' : 'bg-secondary-100'
                )}>
                  {event.type === 'feedback' ? (
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-primary-600" />
                  ) : (
                    <SparklesIcon className="h-4 w-4 text-secondary-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-secondary-900 dark:text-white">
                    {event.type === 'feedback' ? 'Feedback received' : 'Activity recorded'}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {format(new Date(event.date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Feedback" subtitle="Give and receive continuous feedback">
        <button onClick={() => setShowRequestFeedbackModal(true)} className="btn-secondary">
          Request Feedback
        </button>
        <button onClick={() => setShowGiveFeedbackModal(true)} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Give Feedback
        </button>
      </PageHeader>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-body">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-success-100">
              <HandThumbUpIcon className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Praise Received</p>
              <p className="text-2xl font-semibold text-secondary-900 dark:text-white">
                {receivedFeedback?.data?.filter((f) => f.type === 'PRAISE').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card card-body">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-100">
              <PaperAirplaneIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Feedback Given</p>
              <p className="text-2xl font-semibold text-secondary-900 dark:text-white">
                {givenFeedback?.data?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card card-body">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-warning-100">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Unacknowledged</p>
              <p className="text-2xl font-semibold text-secondary-900 dark:text-white">
                {receivedFeedback?.data?.filter((f) => !f.isAcknowledged).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200/60 dark:border-white/[0.06]">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'received', label: 'Received' },
            { key: 'given', label: 'Given' },
            { key: 'timeline', label: 'Timeline' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      {activeTab === 'received' && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-secondary-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input py-1.5 w-40"
            >
              <option value="">All Types</option>
              <option value="PRAISE">Praise</option>
              <option value="CONSTRUCTIVE">Constructive</option>
              <option value="SUGGESTION">Suggestion</option>
              <option value="REQUEST">Request</option>
              <option value="RECOGNITION">Recognition</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {/* Give Feedback Modal */}
      {showGiveFeedbackModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGiveFeedbackModal(false)} />
            <div className="relative bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-secondary-200/50 dark:border-secondary-700/50 animate-scale-in">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Give Feedback</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createFeedbackMutation.mutate({
                    toUserId: formData.get('toUserId') as string,
                    type: formData.get('type') as string,
                    visibility: formData.get('visibility') as string,
                    content: formData.get('content') as string,
                    isAnonymous: formData.get('isAnonymous') === 'true',
                    tags: (formData.get('tags') as string)?.split(',').map((t) => t.trim()).filter(Boolean),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">Recipient</label>
                  <select name="toUserId" required className="input">
                    <option value="">Select a person...</option>
                    {teamMembers?.data?.filter((u: User) => u.id !== user?.id).map((u: User) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Type</label>
                    <select name="type" required className="input">
                      <option value="PRAISE">Praise</option>
                      <option value="CONSTRUCTIVE">Constructive</option>
                      <option value="SUGGESTION">Suggestion</option>
                      <option value="RECOGNITION">Recognition</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Visibility</label>
                    <select name="visibility" className="input">
                      <option value="PRIVATE">Private</option>
                      <option value="MANAGER_VISIBLE">Manager Visible</option>
                      <option value="PUBLIC">Public</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Feedback</label>
                  <textarea
                    name="content"
                    required
                    rows={4}
                    className="input"
                    placeholder="Share specific, actionable feedback..."
                  />
                </div>
                <div>
                  <label className="label">Tags (comma-separated)</label>
                  <input
                    name="tags"
                    type="text"
                    className="input"
                    placeholder="e.g., teamwork, communication, leadership"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isAnonymous"
                    value="true"
                    id="isAnonymous"
                    className="h-4 w-4 text-primary-600 rounded border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700"
                  />
                  <label htmlFor="isAnonymous" className="ml-2 text-sm text-secondary-600 dark:text-secondary-400">
                    Send anonymously
                  </label>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowGiveFeedbackModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createFeedbackMutation.isPending} className="btn-primary">
                    {createFeedbackMutation.isPending ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Request Feedback Modal */}
      {showRequestFeedbackModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRequestFeedbackModal(false)} />
            <div className="relative bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 border border-secondary-200/50 dark:border-secondary-700/50 animate-scale-in">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Request Feedback</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  requestFeedbackMutation.mutate({
                    fromUserId: formData.get('fromUserId') as string,
                    message: formData.get('message') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">Request from</label>
                  <select name="fromUserId" required className="input">
                    <option value="">Select a person...</option>
                    {teamMembers?.data?.filter((u: User) => u.id !== user?.id).map((u: User) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Message (optional)</label>
                  <textarea
                    name="message"
                    rows={3}
                    className="input"
                    placeholder="Add context about what feedback you're looking for..."
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowRequestFeedbackModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={requestFeedbackMutation.isPending} className="btn-primary">
                    {requestFeedbackMutation.isPending ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
