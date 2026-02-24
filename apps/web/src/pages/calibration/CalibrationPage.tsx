import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import {
  calibrationApi,
  reviewsApi,
  type CalibrationSession,
  type CalibrationReview,
  type CreateCalibrationSessionInput,
  type ReviewCycle,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

const sessionStatusColors: Record<string, string> = {
  SCHEDULED: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
  IN_PROGRESS: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300',
  COMPLETED: 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300',
  CANCELLED: 'bg-danger-100 text-danger-800 dark:bg-danger-900/40 dark:text-danger-300',
};

export function CalibrationPage() {
  usePageTitle('Calibration');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CalibrationSession | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);

  const isHRAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN');

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['calibration-sessions'],
    queryFn: () => calibrationApi.listSessions({}),
  });

  const { data: cycles } = useQuery({
    queryKey: ['review-cycles', { status: 'CALIBRATION' }],
    queryFn: () => reviewsApi.listCycles({ status: 'CALIBRATION' }),
  });

  const { data: sessionReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['calibration-reviews', selectedSession?.id],
    queryFn: () => calibrationApi.getReviewsForCalibration(selectedSession!.id),
    enabled: !!selectedSession && showWorkspace,
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: CreateCalibrationSessionInput) => calibrationApi.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-sessions'] });
      setShowCreateModal(false);
      toast.success('Calibration session created');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create session');
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: (id: string) => calibrationApi.startSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-sessions'] });
      toast.success('Calibration session started');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to start session');
    },
  });

  const adjustRatingMutation = useMutation({
    mutationFn: ({ reviewId, adjustedRating, rationale }: { reviewId: string; adjustedRating: number; rationale: string }) =>
      calibrationApi.adjustRating(selectedSession!.id, { reviewId, adjustedRating, rationale }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-reviews', selectedSession?.id] });
      toast.success('Rating adjusted');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to adjust rating');
    },
  });

  const openWorkspace = (session: CalibrationSession) => {
    setSelectedSession(session);
    setShowWorkspace(true);
  };

  const renderSessionsList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="glass-spinner" />
        </div>
      );
    }

    if (!sessions || sessions.length === 0) {
      return (
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 text-center py-12">
          <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No calibration sessions</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Create a calibration session to ensure fair and consistent performance ratings.
          </p>
          {isHRAdmin && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Session
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {sessions.map((session: CalibrationSession) => (
          <div key={session.id} className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">{session.name}</h3>
                  <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', sessionStatusColors[session.status])}>
                    {session.status.replace('_', ' ')}
                  </span>
                </div>
                {session.description && (
                  <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">{session.description}</p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-3 text-sm text-secondary-500 dark:text-secondary-400">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(session.scheduledStart), 'MMM d, yyyy h:mm a')}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserGroupIcon className="h-4 w-4" />
                    Facilitator: {session.facilitator.firstName} {session.facilitator.lastName}
                  </span>
                </div>

                {/* Pre-analysis summary */}
                {session.preAnalysis && (
                  <div className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Pre-Session Analysis</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                      <div>
                        <span className="text-secondary-500 dark:text-secondary-400">Total Reviews:</span>
                        <span className="ml-2 font-medium dark:text-white">{session.preAnalysis.totalReviews ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ExclamationTriangleIcon className="h-4 w-4 text-warning-500" />
                        <span className="text-secondary-500 dark:text-secondary-400">Outliers:</span>
                        <span className="ml-1 font-medium dark:text-white">{session.preAnalysis.outliers?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ExclamationTriangleIcon className="h-4 w-4 text-danger-500" />
                        <span className="text-secondary-500 dark:text-secondary-400">Bias Alerts:</span>
                        <span className="ml-1 font-medium dark:text-white">{session.preAnalysis.biasIndicators?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {session.status === 'SCHEDULED' && isHRAdmin && (
                  <button
                    onClick={() => startSessionMutation.mutate(session.id)}
                    disabled={startSessionMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Start
                  </button>
                )}
                {session.status === 'IN_PROGRESS' && (
                  <button onClick={() => openWorkspace(session)} className="btn-primary text-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
                    Open Workspace
                  </button>
                )}
                {session.status === 'COMPLETED' && (
                  <button onClick={() => openWorkspace(session)} className="btn-secondary text-sm">
                    <ChartBarIcon className="h-4 w-4 mr-1" />
                    View Results
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWorkspace = () => {
    if (!selectedSession) return null;

    const ratingDistribution = [0, 0, 0, 0, 0];
    sessionReviews?.forEach((review: CalibrationReview) => {
      const rating = review.calibratedRating || review.overallRating;
      if (rating && rating >= 1 && rating <= 5) {
        ratingDistribution[rating - 1]++;
      }
    });
    const maxCount = Math.max(...ratingDistribution, 1);

    return (
      <div className="space-y-6">
        {/* Workspace header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setShowWorkspace(false);
                setSelectedSession(null);
              }}
              className="text-sm text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 mb-2"
            >
              ← Back to Sessions
            </button>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">{selectedSession.name}</h2>
            <p className="text-secondary-500 dark:text-secondary-400">Calibration Workspace</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', sessionStatusColors[selectedSession.status])}>
              {selectedSession.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Stats & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rating distribution chart */}
          <div className="lg:col-span-2 card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Rating Distribution</h3>
            <div className="flex items-end justify-center gap-4 h-40">
              {ratingDistribution.map((count, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div
                    className={clsx(
                      'w-16 rounded-t transition-all',
                      index === 4 ? 'bg-success-500' :
                      index === 3 ? 'bg-primary-500' :
                      index === 2 ? 'bg-warning-500' :
                      index === 1 ? 'bg-orange-500' :
                      'bg-danger-500'
                    )}
                    style={{ height: `${(count / maxCount) * 120}px` }}
                  />
                  <span className="text-sm font-medium text-secondary-900 dark:text-white">{count}</span>
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">{index + 1} Star</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Session Stats</h3>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500 dark:text-secondary-400">Total Reviews</dt>
                <dd className="text-sm font-medium text-secondary-900 dark:text-white">{sessionReviews?.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500 dark:text-secondary-400">Calibrated</dt>
                <dd className="text-sm font-medium text-success-600 dark:text-success-400">
                  {sessionReviews?.filter((r: CalibrationReview) => r.calibratedRating).length || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500 dark:text-secondary-400">Pending</dt>
                <dd className="text-sm font-medium text-warning-600 dark:text-warning-400">
                  {sessionReviews?.filter((r: CalibrationReview) => !r.calibratedRating).length || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500 dark:text-secondary-400">Average Original</dt>
                <dd className="text-sm font-medium text-secondary-900 dark:text-white">
                  {sessionReviews && sessionReviews.length > 0
                    ? (sessionReviews.reduce((acc: number, r: CalibrationReview) => acc + (r.overallRating || 0), 0) / sessionReviews.length).toFixed(1)
                    : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500 dark:text-secondary-400">Average Calibrated</dt>
                <dd className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {sessionReviews && sessionReviews.filter((r: CalibrationReview) => r.calibratedRating).length > 0
                    ? (sessionReviews.reduce((acc: number, r: CalibrationReview) => acc + (r.calibratedRating || 0), 0) /
                        sessionReviews.filter((r: CalibrationReview) => r.calibratedRating).length).toFixed(1)
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Reviews table */}
        <div className="card overflow-hidden dark:bg-secondary-800 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200/60 dark:border-white/[0.06]">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Reviews for Calibration</h3>
          </div>
          {loadingReviews ? (
            <div className="flex justify-center py-12">
              <div className="glass-spinner" />
            </div>
          ) : !sessionReviews || sessionReviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-secondary-500 dark:text-secondary-400">No reviews in this calibration session.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Reviewer</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Level</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Original</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Calibrated</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                  {sessionReviews.map((review: CalibrationReview) => (
                    <CalibrationReviewRow
                      key={review.id}
                      review={review}
                      onAdjust={(rating, rationale) =>
                        adjustRatingMutation.mutate({
                          reviewId: review.id,
                          adjustedRating: rating,
                          rationale,
                        })
                      }
                      isReadOnly={selectedSession.status === 'COMPLETED'}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!showWorkspace ? (
        <>
          {/* Header */}
          <PageHeader
            title="Calibration"
            subtitle="Ensure fair and consistent performance ratings across teams"
          >
            {isHRAdmin && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Session
              </button>
            )}
          </PageHeader>

          {/* Info card */}
          <div className="card card-body bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-100 dark:bg-primary-800/50 rounded-lg">
                <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-medium text-primary-900 dark:text-primary-100">About Calibration</h3>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                  Calibration helps ensure performance ratings are fair and consistent across the organization.
                  During calibration sessions, managers discuss ratings, identify outliers, and adjust scores
                  to remove bias and ensure equity.
                </p>
              </div>
            </div>
          </div>

          {/* Sessions list */}
          {renderSessionsList()}
        </>
      ) : (
        renderWorkspace()
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-xl max-w-lg w-full p-6 border border-secondary-200/60 dark:border-white/[0.06]">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Create Calibration Session</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createSessionMutation.mutate({
                    cycleId: formData.get('cycleId') as string,
                    name: formData.get('name') as string,
                    scheduledStart: formData.get('scheduledStart') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label dark:text-secondary-300">Review Cycle</label>
                  <select name="cycleId" required className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                    <option value="">Select a review cycle...</option>
                    {cycles?.map((cycle: ReviewCycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Session Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    placeholder="e.g., Engineering Team Calibration"
                  />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Scheduled Start</label>
                  <input name="scheduledStart" type="datetime-local" required className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createSessionMutation.isPending} className="btn-primary">
                    {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
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

// Calibration review row component
function CalibrationReviewRow({
  review,
  onAdjust,
  isReadOnly,
}: {
  review: CalibrationReview;
  onAdjust: (rating: number, rationale: string) => void;
  isReadOnly: boolean;
}) {
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [newRating, setNewRating] = useState(review.overallRating || 3);
  const [rationale, setRationale] = useState('');

  const handleAdjust = () => {
    if (!rationale.trim()) {
      toast.error('Please provide a rationale for the adjustment');
      return;
    }
    onAdjust(newRating, rationale);
    setShowAdjustModal(false);
    setRationale('');
  };

  return (
    <>
      <tr className="hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                {review.reviewee.firstName[0]}{review.reviewee.lastName[0]}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">
                {review.reviewee.firstName} {review.reviewee.lastName}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">{review.reviewee.jobTitle}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-secondary-500 dark:text-secondary-400">
          {review.reviewer.firstName} {review.reviewer.lastName}
        </td>
        <td className="px-6 py-4 text-center">
          <span className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded text-xs font-medium dark:text-secondary-300">
            L{review.reviewee.level}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="text-lg font-bold text-secondary-700 dark:text-secondary-300">{review.overallRating || '-'}</span>
        </td>
        <td className="px-6 py-4 text-center">
          {review.calibratedRating ? (
            <span className={clsx(
              'text-lg font-bold',
              review.calibratedRating > (review.overallRating || 0) ? 'text-success-600 dark:text-success-400' :
              review.calibratedRating < (review.overallRating || 0) ? 'text-danger-600 dark:text-danger-400' :
              'text-secondary-700 dark:text-secondary-300'
            )}>
              {review.calibratedRating}
            </span>
          ) : (
            <span className="text-secondary-400">-</span>
          )}
        </td>
        <td className="px-6 py-4 text-center">
          {review.calibratedRating ? (
            <span className="flex items-center justify-center gap-1 text-success-600 dark:text-success-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="text-xs">Calibrated</span>
            </span>
          ) : (
            <span className="text-xs text-warning-600 dark:text-warning-400">Pending</span>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          {!isReadOnly && (
            <button
              onClick={() => setShowAdjustModal(true)}
              className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {review.calibratedRating ? 'Re-adjust' : 'Adjust'}
            </button>
          )}
        </td>
      </tr>

      {/* Adjust Rating Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)} />
            <div className="relative bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-xl max-w-md w-full p-6 border border-secondary-200/60 dark:border-white/[0.06]">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                Adjust Rating for {review.reviewee.firstName} {review.reviewee.lastName}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label dark:text-secondary-300">Original Rating</label>
                  <p className="text-2xl font-bold text-secondary-700 dark:text-secondary-300">{review.overallRating || '-'}</p>
                </div>
                <div>
                  <label className="label dark:text-secondary-300">New Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setNewRating(rating)}
                        className={clsx(
                          'w-12 h-12 rounded-lg font-bold text-lg transition-colors',
                          newRating === rating
                            ? 'bg-primary-600 text-white'
                            : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600'
                        )}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Rationale (required)</label>
                  <textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={3}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    placeholder="Explain why this rating is being adjusted..."
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowAdjustModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleAdjust} className="btn-primary">
                    Apply Adjustment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
