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
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

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

// ── Mock Data (shown when API returns empty) ──
const MOCK_REVIEWS_TO_COMPLETE: Partial<Review>[] = [
  {
    id: 'mock-r1',
    type: 'ANNUAL',
    status: 'NOT_STARTED',
    reviewer: { id: 'mock-u1', firstName: 'Prasina', lastName: 'Sathish', email: '', jobTitle: 'Manager' } as any,
    reviewee: { id: 'mock-u2', firstName: 'Sanjay', lastName: 'N', email: '', jobTitle: 'Frontend Engineer' } as any,
    cycle: { id: 'mock-c1', name: 'Q1 FY2026 Review' } as any,
    overallRating: null,
    submittedAt: null,
  },
  {
    id: 'mock-r2',
    type: 'QUARTERLY',
    status: 'IN_PROGRESS',
    reviewer: { id: 'mock-u1', firstName: 'Prasina', lastName: 'Sathish', email: '', jobTitle: 'Manager' } as any,
    reviewee: { id: 'mock-u3', firstName: 'Preethi', lastName: 'S', email: '', jobTitle: 'Senior Engineering Manager' } as any,
    cycle: { id: 'mock-c1', name: 'Q1 FY2026 Review' } as any,
    overallRating: null,
    submittedAt: null,
  },
  {
    id: 'mock-r3',
    type: 'ANNUAL',
    status: 'NOT_STARTED',
    reviewer: { id: 'mock-u1', firstName: 'Prasina', lastName: 'Sathish', email: '', jobTitle: 'Manager' } as any,
    reviewee: { id: 'mock-u4', firstName: 'Danish', lastName: 'A G', email: '', jobTitle: 'Chief Technology Officer' } as any,
    cycle: { id: 'mock-c1', name: 'Q1 FY2026 Review' } as any,
    overallRating: null,
    submittedAt: null,
  },
];

const MOCK_REVIEWS_RECEIVED: Partial<Review>[] = [
  {
    id: 'mock-rr1',
    type: 'ANNUAL',
    status: 'FINALIZED',
    reviewer: { id: 'mock-u5', firstName: 'Danish', lastName: 'A G', email: '', jobTitle: 'Chief Technology Officer' } as any,
    reviewee: { id: 'mock-u1', firstName: 'Prasina', lastName: 'Sathish', email: '', jobTitle: 'Manager' } as any,
    cycle: { id: 'mock-c2', name: 'FY2025 Annual Review' } as any,
    overallRating: 4.2,
    submittedAt: '2025-12-20T00:00:00Z',
  },
  {
    id: 'mock-rr2',
    type: '360_DEGREE',
    status: 'SUBMITTED',
    reviewer: { id: 'mock-u6', firstName: 'Preethi', lastName: 'S', email: '', jobTitle: 'Senior Engineering Manager' } as any,
    reviewee: { id: 'mock-u1', firstName: 'Prasina', lastName: 'Sathish', email: '', jobTitle: 'Manager' } as any,
    cycle: { id: 'mock-c3', name: '360 Feedback Round 2025' } as any,
    overallRating: 4.5,
    submittedAt: '2025-11-15T00:00:00Z',
  },
];

const MOCK_CYCLES: Partial<ReviewCycle>[] = [
  {
    id: 'mock-c1',
    name: 'Q1 FY2026 Performance Review',
    description: 'Quarterly performance review for all employees covering January-March 2026.',
    type: 'QUARTERLY',
    status: 'ACTIVE',
    startDate: '2026-01-15T00:00:00Z',
    endDate: '2026-03-31T00:00:00Z',
    reviewCount: 24,
  },
  {
    id: 'mock-c2',
    name: 'FY2025 Annual Review',
    description: 'Annual performance review cycle for fiscal year 2025.',
    type: 'ANNUAL',
    status: 'COMPLETED',
    startDate: '2025-11-01T00:00:00Z',
    endDate: '2025-12-31T00:00:00Z',
    reviewCount: 48,
  },
  {
    id: 'mock-c3',
    name: 'Q2 FY2026 360-Degree Feedback',
    description: 'Multi-rater feedback collection for leadership team.',
    type: '360_DEGREE',
    status: 'DRAFT',
    startDate: '2026-04-01T00:00:00Z',
    endDate: '2026-05-15T00:00:00Z',
    reviewCount: 0,
  },
];

export function ReviewsPage() {
  usePageTitle('Reviews');
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

    const rawReviewsToComplete = myReviews?.filter((r: Review) => r.reviewer.id === user?.id) || [];
    const rawReviewsReceived = myReviews?.filter((r: Review) => r.reviewee.id === user?.id) || [];
    const reviewsToComplete = rawReviewsToComplete.length > 0 ? rawReviewsToComplete : (MOCK_REVIEWS_TO_COMPLETE as Review[]);
    const reviewsReceived = rawReviewsReceived.length > 0 ? rawReviewsReceived : (MOCK_REVIEWS_RECEIVED as Review[]);

    return (
      <div className="space-y-8">
        {/* Reviews to complete */}
        <div>
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Reviews to Complete ({reviewsToComplete.length})
          </h3>
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
        </div>

        {/* Reviews received */}
        <div>
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-secondary-600 dark:text-secondary-400" />
            Your Reviews ({reviewsReceived.length})
          </h3>
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

    const displayCycles = (cycles && cycles.length > 0) ? cycles : (MOCK_CYCLES as ReviewCycle[]);

    return (
      <div className="grid gap-4">
        {displayCycles.map((cycle: ReviewCycle) => (
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
      <PageHeader title="Performance Reviews" subtitle="Manage review cycles and complete your reviews">
        {isHRAdmin && (
          <button onClick={() => setShowCreateCycleModal(true)} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Cycle
          </button>
        )}
      </PageHeader>

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
