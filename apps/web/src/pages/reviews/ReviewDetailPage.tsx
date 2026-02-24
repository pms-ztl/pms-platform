import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  UserIcon,
  StarIcon,
  CheckIcon,
  PencilIcon,
  PaperAirplaneIcon,
  HandThumbUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { reviewsApi, goalsApi, type Review, type SubmitReviewInput, type Goal } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const reviewStatusColors: Record<string, string> = {
  NOT_STARTED: 'bg-secondary-100 dark:bg-secondary-800 text-secondary-800 dark:text-secondary-200',
  IN_PROGRESS: 'bg-primary-100 text-primary-800',
  SUBMITTED: 'bg-warning-100 text-warning-800',
  CALIBRATED: 'bg-info-100 text-info-800',
  FINALIZED: 'bg-success-100 text-success-800',
  ACKNOWLEDGED: 'bg-success-200 text-success-900',
};

const reviewQuestions = [
  {
    id: 'accomplishments',
    label: 'Key Accomplishments',
    description: 'What were the major accomplishments during this review period?',
    type: 'textarea',
  },
  {
    id: 'goals_progress',
    label: 'Goal Progress',
    description: 'How did the employee perform against their goals?',
    type: 'textarea',
  },
  {
    id: 'competencies',
    label: 'Core Competencies',
    description: 'How well did the employee demonstrate core competencies?',
    type: 'rating',
  },
  {
    id: 'collaboration',
    label: 'Collaboration & Teamwork',
    description: 'How effectively does the employee collaborate with others?',
    type: 'rating',
  },
  {
    id: 'initiative',
    label: 'Initiative & Proactivity',
    description: 'Does the employee take initiative and go above expectations?',
    type: 'rating',
  },
  {
    id: 'development_areas',
    label: 'Areas for Development',
    description: 'What skills or areas should the employee focus on improving?',
    type: 'textarea',
  },
];

function RatingInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => !disabled && onChange(rating)}
          disabled={disabled}
          className={clsx('p-1 transition-colors', disabled ? 'cursor-default' : 'hover:scale-110')}
        >
          {rating <= value ? (
            <StarSolidIcon className="h-6 w-6 text-warning-400" />
          ) : (
            <StarIcon className="h-6 w-6 text-secondary-300" />
          )}
        </button>
      ))}
    </div>
  );
}

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [overallRating, setOverallRating] = useState(0);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [areasForGrowth, setAreasForGrowth] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newGrowthArea, setNewGrowthArea] = useState('');

  const { data: review, isLoading, error } = useQuery({
    queryKey: ['review', id],
    queryFn: () => reviewsApi.getReview(id!),
    enabled: !!id,
    onSuccess: (data) => {
      if (data.content) setFormData(data.content);
      if (data.overallRating) setOverallRating(data.overallRating);
      if (data.strengths) setStrengths(data.strengths);
      if (data.areasForGrowth) setAreasForGrowth(data.areasForGrowth);
      if (data.summary) setSummary(data.summary);
    },
  });

  const { data: revieweeGoals } = useQuery({
    queryKey: ['goals', 'user', review?.reviewee?.id],
    queryFn: () => goalsApi.list({ ownerId: review?.reviewee?.id, status: 'ACTIVE' }),
    enabled: !!review?.reviewee?.id,
  });

  const startMutation = useMutation({
    mutationFn: () => reviewsApi.startReview(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', id] });
      toast.success('Review started');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to start review');
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (data: Partial<SubmitReviewInput>) => reviewsApi.saveDraft(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', id] });
      toast.success('Draft saved');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: SubmitReviewInput) => reviewsApi.submitReview(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', id] });
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      toast.success('Review submitted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => reviewsApi.acknowledgeReview(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', id] });
      toast.success('Review acknowledged');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to acknowledge review');
    },
  });

  const isReviewer = review?.reviewer?.id === user?.id;
  const isReviewee = review?.reviewee?.id === user?.id;
  const canEdit = isReviewer && ['NOT_STARTED', 'IN_PROGRESS'].includes(review?.status || '');
  const canSubmit = isReviewer && review?.status === 'IN_PROGRESS';
  const canAcknowledge = isReviewee && review?.status === 'FINALIZED';

  const handleSaveDraft = () => {
    saveDraftMutation.mutate({
      content: formData,
      overallRating,
      strengths,
      areasForGrowth,
      summary,
    });
  };

  const handleSubmit = () => {
    if (overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }
    submitMutation.mutate({
      content: formData,
      overallRating,
      strengths,
      areasForGrowth,
      summary,
    });
  };

  const addStrength = () => {
    if (newStrength.trim()) {
      setStrengths([...strengths, newStrength.trim()]);
      setNewStrength('');
    }
  };

  const addGrowthArea = () => {
    if (newGrowthArea.trim()) {
      setAreasForGrowth([...areasForGrowth, newGrowthArea.trim()]);
      setNewGrowthArea('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Review not found</h3>
        <Link to="/reviews" className="btn-primary mt-4 inline-block">
          Back to Reviews
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link to="/reviews" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-500">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white dark:text-white">
                {review.type} Review
              </h1>
              <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', reviewStatusColors[review.status])}>
                {review.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-secondary-600 dark:text-secondary-400 mt-1">{review.cycle?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {review.status === 'NOT_STARTED' && isReviewer && (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="btn-primary"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Start Review
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isPending}
              className="btn-secondary"
            >
              Save Draft
            </button>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="btn-primary"
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              Submit Review
            </button>
          )}
          {canAcknowledge && (
            <button
              onClick={() => acknowledgeMutation.mutate()}
              disabled={acknowledgeMutation.isPending}
              className="btn-success"
            >
              <HandThumbUpIcon className="h-5 w-5 mr-2" />
              Acknowledge
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reviewee info */}
          <div className="card card-body">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xl font-medium text-primary-700 dark:text-primary-300 dark:text-primary-300">
                  {review.reviewee.firstName[0]}{review.reviewee.lastName[0]}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-secondary-900 dark:text-white dark:text-white">
                  {review.reviewee.firstName} {review.reviewee.lastName}
                </h3>
                <p className="text-secondary-500">{review.reviewee.jobTitle || 'Employee'}</p>
                <p className="text-sm text-secondary-400 mt-1">
                  Reviewer: {review.reviewer.firstName} {review.reviewer.lastName}
                </p>
              </div>
            </div>
          </div>

          {/* Review questions */}
          <div className="card card-body space-y-6">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white dark:text-white">Performance Assessment</h3>

            {reviewQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <label className="block text-sm font-medium text-secondary-900 dark:text-white dark:text-secondary-100">
                  {question.label}
                </label>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">{question.description}</p>
                {question.type === 'textarea' ? (
                  <textarea
                    value={formData[question.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
                    disabled={!canEdit}
                    rows={3}
                    className="input"
                    placeholder={canEdit ? 'Enter your assessment...' : ''}
                  />
                ) : (
                  <RatingInput
                    value={formData[question.id] || 0}
                    onChange={(v) => setFormData({ ...formData, [question.id]: v })}
                    disabled={!canEdit}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Overall rating */}
          <div className="card card-body">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white dark:text-white mb-4">Overall Performance Rating</h3>
            <div className="flex items-center gap-4">
              <RatingInput value={overallRating} onChange={setOverallRating} disabled={!canEdit} />
              <span className="text-2xl font-bold text-secondary-900 dark:text-white dark:text-white">{overallRating}/5</span>
            </div>
            <div className="mt-4 flex gap-2 text-xs text-secondary-500 dark:text-secondary-400">
              <span className="px-2 py-1 bg-secondary-100 dark:bg-secondary-800 rounded">1 = Needs Improvement</span>
              <span className="px-2 py-1 bg-secondary-100 dark:bg-secondary-800 rounded">3 = Meets Expectations</span>
              <span className="px-2 py-1 bg-secondary-100 dark:bg-secondary-800 rounded">5 = Exceptional</span>
            </div>
          </div>

          {/* Summary */}
          <div className="card card-body">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white dark:text-white mb-4">Review Summary</h3>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={!canEdit}
              rows={4}
              className="input"
              placeholder={canEdit ? 'Provide an overall summary of the review...' : ''}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Strengths */}
          <div className="card card-body">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white dark:text-white mb-4">Key Strengths</h3>
            <div className="space-y-2">
              {strengths.map((strength, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckIcon className="h-4 w-4 text-success-500 flex-shrink-0" />
                  <span className="text-secondary-700 dark:text-secondary-300 dark:text-secondary-300">{strength}</span>
                  {canEdit && (
                    <button
                      onClick={() => setStrengths(strengths.filter((_, idx) => idx !== i))}
                      className="ml-auto text-secondary-400 hover:text-danger-500"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addStrength()}
                    className="input text-sm flex-1"
                    placeholder="Add a strength..."
                  />
                  <button onClick={addStrength} className="btn-secondary text-sm">
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Areas for growth */}
          <div className="card card-body">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white dark:text-white mb-4">Areas for Growth</h3>
            <div className="space-y-2">
              {areasForGrowth.map((area, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-warning-400 flex-shrink-0" />
                  <span className="text-secondary-700 dark:text-secondary-300 dark:text-secondary-300">{area}</span>
                  {canEdit && (
                    <button
                      onClick={() => setAreasForGrowth(areasForGrowth.filter((_, idx) => idx !== i))}
                      className="ml-auto text-secondary-400 hover:text-danger-500"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newGrowthArea}
                    onChange={(e) => setNewGrowthArea(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addGrowthArea()}
                    className="input text-sm flex-1"
                    placeholder="Add an area for growth..."
                  />
                  <button onClick={addGrowthArea} className="btn-secondary text-sm">
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Goals */}
          {revieweeGoals?.data && revieweeGoals.data.length > 0 && (
            <div className="card card-body">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Goals</h3>
              <div className="space-y-3">
                {revieweeGoals.data.slice(0, 5).map((goal: Goal) => (
                  <div key={goal.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-900 dark:text-white font-medium break-words">{goal.title}</span>
                      <span className="text-secondary-500">{goal.progress}%</span>
                    </div>
                    <div className="mt-1 w-full bg-secondary-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary-500"
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="card card-body text-sm text-secondary-500">
            <dl className="space-y-2">
              {review.submittedAt && (
                <div className="flex justify-between">
                  <dt>Submitted:</dt>
                  <dd>{format(new Date(review.submittedAt), 'MMM d, yyyy')}</dd>
                </div>
              )}
              {review.acknowledgedAt && (
                <div className="flex justify-between">
                  <dt>Acknowledged:</dt>
                  <dd>{format(new Date(review.acknowledgedAt), 'MMM d, yyyy')}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
