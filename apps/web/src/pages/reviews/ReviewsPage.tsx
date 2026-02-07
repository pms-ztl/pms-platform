import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { reviewsApi, type ReviewCycle, type Review, type CreateReviewCycleInput } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const cycleStatusColors: Record<string, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
  ACTIVE: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
  CALIBRATION: 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300',
  COMPLETED: 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300',
  CANCELLED: 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300',
};

const reviewStatusColors: Record<string, string> = {
  NOT_STARTED: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
  IN_PROGRESS: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
  SUBMITTED: 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300',
  CALIBRATED: 'bg-info-100 text-info-800 dark:bg-info-900/50 dark:text-info-300',
  FINALIZED: 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300',
  ACKNOWLEDGED: 'bg-success-200 text-success-900 dark:bg-success-800/50 dark:text-success-200',
};

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'my-reviews' | 'cycles'>('my-reviews');
  const [showCreateCycleModal, setShowCreateCycleModal] = useState(false);

  const isHRAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN');

  const { data: myReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewsApi.listMyReviews({}),
  });

  const { data: cycles, isLoading: loadingCycles } = useQuery({
    queryKey: ['review-cycles'],
    queryFn: () => reviewsApi.listCycles({}),
    enabled: activeTab === 'cycles' || isHRAdmin,
  });

  const createCycleMutation = useMutation({
    mutationFn: (data: CreateReviewCycleInput) => reviewsApi.createCycle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
      setShowCreateCycleModal(false);
      toast.success('Review cycle created');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create cycle');
    },
  });

  const launchCycleMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.launchCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
      toast.success('Review cycle launched');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to launch cycle');
    },
  });

  const renderMyReviews = () => {
    if (loadingReviews) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      );
    }

    const reviewsToComplete = myReviews?.filter((r: Review) => r.reviewer.id === user?.id) || [];
    const reviewsReceived = myReviews?.filter((r: Review) => r.reviewee.id === user?.id) || [];

    return (
      <div className="space-y-8">
        {/* Reviews to complete */}
        <div>
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Reviews to Complete ({reviewsToComplete.length})
          </h3>
          {reviewsToComplete.length === 0 ? (
            <div className="card card-body text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-success-400" />
              <p className="mt-2 text-secondary-600 dark:text-secondary-400">You have no pending reviews to complete.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reviewsToComplete.map((review: Review) => (
                <Link
                  key={review.id}
                  to={`/reviews/${review.id}`}
                  className="card card-body hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                        <span className="text-primary-700 dark:text-primary-300 font-medium">
                          {review.reviewee.firstName[0]}{review.reviewee.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-secondary-900 dark:text-white">
                          {review.reviewee.firstName} {review.reviewee.lastName}
                        </p>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">{review.reviewee.jobTitle || 'Employee'}</p>
                        <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                          {review.type} Review • {review.cycle?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', reviewStatusColors[review.status])}>
                        {review.status.replace('_', ' ')}
                      </span>
                      {review.status === 'NOT_STARTED' && (
                        <p className="text-xs text-danger-600 dark:text-danger-400 mt-2">Action needed</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Reviews received */}
        <div>
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-secondary-600 dark:text-secondary-400" />
            Your Reviews ({reviewsReceived.length})
          </h3>
          {reviewsReceived.length === 0 ? (
            <div className="card card-body text-center py-8">
              <ClockIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
              <p className="mt-2 text-secondary-600 dark:text-secondary-400">You haven't received any reviews yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reviewsReceived.map((review: Review) => (
                <Link
                  key={review.id}
                  to={`/reviews/${review.id}`}
                  className="card card-body hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-secondary-900 dark:text-white">{review.cycle?.name}</p>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400">
                        {review.type} Review from {review.reviewer.firstName} {review.reviewer.lastName}
                      </p>
                      {review.submittedAt && (
                        <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                          Submitted {format(new Date(review.submittedAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', reviewStatusColors[review.status])}>
                        {review.status.replace('_', ' ')}
                      </span>
                      {review.overallRating && (
                        <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-2">{review.overallRating}/5</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCycles = () => {
    if (loadingCycles) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      );
    }

    if (!cycles || cycles.length === 0) {
      return (
        <div className="card card-body text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No review cycles</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">Get started by creating a new review cycle.</p>
          {isHRAdmin && (
            <button onClick={() => setShowCreateCycleModal(true)} className="btn-primary mt-4">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Cycle
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {cycles.map((cycle: ReviewCycle) => (
          <div key={cycle.id} className="card card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-secondary-900 dark:text-white">{cycle.name}</h3>
                  <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', cycleStatusColors[cycle.status])}>
                    {cycle.status}
                  </span>
                </div>
                {cycle.description && (
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{cycle.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-secondary-400 dark:text-secondary-500">
                  <span>Type: {cycle.type}</span>
                  <span>
                    {format(new Date(cycle.startDate), 'MMM d')} - {format(new Date(cycle.endDate), 'MMM d, yyyy')}
                  </span>
                  {cycle.reviewCount !== undefined && <span>{cycle.reviewCount} reviews</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isHRAdmin && cycle.status === 'DRAFT' && (
                  <button
                    onClick={() => launchCycleMutation.mutate(cycle.id)}
                    disabled={launchCycleMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Launch
                  </button>
                )}
                <Link to={`/reviews/cycles/${cycle.id}`} className="btn-secondary text-sm">
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Performance Reviews</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Manage review cycles and complete your reviews</p>
        </div>
        {isHRAdmin && (
          <button onClick={() => setShowCreateCycleModal(true)} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Cycle
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('my-reviews')}
            className={clsx(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'my-reviews'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-300'
            )}
          >
            My Reviews
          </button>
          <button
            onClick={() => setActiveTab('cycles')}
            className={clsx(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'cycles'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-300'
            )}
          >
            Review Cycles
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'my-reviews' ? renderMyReviews() : renderCycles()}

      {/* Create Cycle Modal */}
      {showCreateCycleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateCycleModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-secondary-200/50 dark:border-secondary-700/50 animate-scale-in">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Create Review Cycle</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const startDate = formData.get('startDate') as string;
                  const endDate = formData.get('endDate') as string;
                  createCycleMutation.mutate({
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    type: formData.get('type') as string,
                    startDate: startDate ? new Date(startDate).toISOString() : '',
                    endDate: endDate ? new Date(endDate).toISOString() : '',
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">Cycle Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="input"
                    placeholder="e.g., Q1 2026 Performance Review"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input"
                    placeholder="Brief description of this review cycle"
                  />
                </div>
                <div>
                  <label className="label">Review Type</label>
                  <select name="type" className="input">
                    <option value="ANNUAL">Annual Review</option>
                    <option value="QUARTERLY">Quarterly Review</option>
                    <option value="PROBATION">Probation Review</option>
                    <option value="PROJECT">Project Review</option>
                    <option value="360_DEGREE">360-Degree Review</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Date</label>
                    <input name="startDate" type="date" required className="input" />
                  </div>
                  <div>
                    <label className="label">End Date</label>
                    <input name="endDate" type="date" required className="input" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowCreateCycleModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createCycleMutation.isPending} className="btn-primary">
                    {createCycleMutation.isPending ? 'Creating...' : 'Create Cycle'}
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
