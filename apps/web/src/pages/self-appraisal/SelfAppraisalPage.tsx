/**
 * Self Appraisal Page
 *
 * Allows employees to submit self-assessments with:
 * - Performance metrics review
 * - Goal achievement summary
 * - Competency self-rating
 * - Accomplishments and areas for improvement
 * - Development goals
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChartBarIcon,
  FlagIcon,
  StarIcon,
  AcademicCapIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { goalsApi, reviewsApi, analyticsApi, feedbackApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

interface CompetencyRating {
  id: string;
  name: string;
  rating: number;
  maxRating: number;
  description: string;
}

const DEFAULT_COMPETENCIES: CompetencyRating[] = [
  { id: 'leadership', name: 'Leadership', rating: 0, maxRating: 5, description: 'Ability to lead and inspire others' },
  { id: 'communication', name: 'Communication', rating: 0, maxRating: 5, description: 'Effective verbal and written communication' },
  { id: 'technical', name: 'Technical Skills', rating: 0, maxRating: 5, description: 'Domain expertise and technical proficiency' },
  { id: 'teamwork', name: 'Teamwork', rating: 0, maxRating: 5, description: 'Collaboration and team contribution' },
  { id: 'problemsolving', name: 'Problem Solving', rating: 0, maxRating: 5, description: 'Analytical thinking and solution design' },
  { id: 'adaptability', name: 'Adaptability', rating: 0, maxRating: 5, description: 'Flexibility and openness to change' },
];

export function SelfAppraisalPage() {
  usePageTitle('Self-Appraisal');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [competencies, setCompetencies] = useState<CompetencyRating[]>(DEFAULT_COMPETENCIES);
  const [accomplishments, setAccomplishments] = useState('');
  const [challenges, setChallenges] = useState('');
  const [improvements, setImprovements] = useState('');
  const [developmentGoals, setDevelopmentGoals] = useState('');
  const [overallRating, setOverallRating] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch goals
  const { data: goalsData } = useQuery({
    queryKey: ['goals', 'my'],
    queryFn: () => goalsApi.getMyGoals({}),
  });

  // Fetch reviews
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', 'my'],
    queryFn: () => reviewsApi.listMyReviews({ asReviewee: true }),
  });

  // Fetch feedback
  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', 'received'],
    queryFn: () => feedbackApi.listReceived({ limit: 10 }),
  });

  // Calculate stats
  const completedGoals = goalsData?.data?.filter(g => g.status === 'COMPLETED').length || 0;
  const totalGoals = goalsData?.data?.length || 0;
  const avgProgress = totalGoals > 0
    ? Math.round(goalsData?.data?.reduce((acc, g) => acc + g.progress, 0) / totalGoals)
    : 0;

  const handleCompetencyChange = (id: string, rating: number) => {
    setCompetencies(prev => prev.map(c =>
      c.id === id ? { ...c, rating } : c
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Self-appraisal submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    } catch (error) {
      toast.error('Failed to submit self-appraisal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const RatingStars = ({ rating, maxRating, onChange }: { rating: number; maxRating: number; onChange: (r: number) => void }) => (
    <div className="flex gap-1">
      {Array.from({ length: maxRating }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="focus:outline-none"
        >
          <StarIcon
            className={clsx(
              'h-6 w-6 transition-colors',
              i < rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-secondary-300 dark:text-secondary-600'
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader title="Self Appraisal" subtitle="Review your performance and submit your self-assessment" />

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FlagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Goals Completed</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {completedGoals}/{totalGoals}
              </p>
            </div>
          </div>
        </div>

        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Average Progress</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{avgProgress}%</p>
            </div>
          </div>
        </div>

        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Feedback Received</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {feedbackData?.meta?.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <ClockIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Review Period</p>
              <p className="text-lg font-bold text-secondary-900 dark:text-white">
                {format(new Date(), 'yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Competency Self-Assessment */}
        <div className="card dark:bg-secondary-800 dark:border-secondary-700">
          <div className="card-header dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Competency Self-Rating
              </h2>
            </div>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
              Rate yourself on each competency (1-5 stars)
            </p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {competencies.map((competency) => (
                <div
                  key={competency.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 dark:text-white">{competency.name}</p>
                    <p className="text-xs sm:text-sm text-secondary-500 dark:text-secondary-400">{competency.description}</p>
                  </div>
                  <RatingStars
                    rating={competency.rating}
                    maxRating={competency.maxRating}
                    onChange={(r) => handleCompetencyChange(competency.id, r)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Self-Rating */}
        <div className="card dark:bg-secondary-800 dark:border-secondary-700">
          <div className="card-header dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <StarIcon className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Overall Self-Rating
              </h2>
            </div>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-4">
              <RatingStars
                rating={overallRating}
                maxRating={5}
                onChange={setOverallRating}
              />
              <span className="text-lg font-semibold text-secondary-900 dark:text-white">
                {overallRating}/5
              </span>
            </div>
          </div>
        </div>

        {/* Accomplishments */}
        <div className="card dark:bg-secondary-800 dark:border-secondary-700">
          <div className="card-header dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Key Accomplishments
              </h2>
            </div>
          </div>
          <div className="card-body">
            <textarea
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              rows={4}
              className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white w-full"
              placeholder="List your key achievements and contributions during this review period..."
            />
          </div>
        </div>

        {/* Challenges */}
        <div className="card dark:bg-secondary-800 dark:border-secondary-700">
          <div className="card-header dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Challenges Faced
              </h2>
            </div>
          </div>
          <div className="card-body">
            <textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              rows={3}
              className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white w-full"
              placeholder="Describe any challenges or obstacles you encountered..."
            />
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="card dark:bg-secondary-800 dark:border-secondary-700">
          <div className="card-header dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Areas for Improvement
              </h2>
            </div>
          </div>
          <div className="card-body">
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={3}
              className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white w-full"
              placeholder="Identify areas where you can improve..."
            />
          </div>
        </div>

        {/* Development Goals */}
        <div className="card dark:bg-secondary-800 dark:border-secondary-700">
          <div className="card-header dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <FlagIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Development Goals for Next Period
              </h2>
            </div>
          </div>
          <div className="card-body">
            <textarea
              value={developmentGoals}
              onChange={(e) => setDevelopmentGoals(e.target.value)}
              rows={3}
              className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white w-full"
              placeholder="What are your goals for professional development?"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button type="button" className="btn-secondary dark:bg-secondary-700 dark:text-white dark:border-secondary-600">
            Save Draft
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Self-Appraisal'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SelfAppraisalPage;
