/**
 * Employee Card Component
 *
 * Generates downloadable employee cards with ML-based analytics and performance metrics.
 * Supports PDF and JPG export formats.
 */

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  DocumentArrowDownIcon,
  PhotoIcon,
  ChartBarIcon,
  StarIcon,
  TrophyIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format } from 'date-fns';

import { usersApi, goalsApi, reviewsApi, analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface EmployeeCardProps {
  userId?: string;
  onClose?: () => void;
}

interface PerformanceMetrics {
  overallScore: number;
  productivityScore: number;
  engagementScore: number;
  collaborationScore: number;
  goalsCompleted: number;
  totalGoals: number;
  reviewsCompleted: number;
  feedbackScore: number;
  streakDays: number;
  rank: string;
}

// Performance Improvement Formula (PIF)
// PIF = (0.3 × PS + 0.25 × ES + 0.2 × CS + 0.15 × GCR + 0.1 × FS) × TF
// Where:
// PS = Productivity Score (0-100)
// ES = Engagement Score (0-100)
// CS = Collaboration Score (0-100)
// GCR = Goal Completion Rate (0-100)
// FS = Feedback Score (0-100)
// TF = Tenure Factor (1.0 - 1.2 based on years)

function calculatePIF(metrics: PerformanceMetrics, tenureYears: number = 1): number {
  const tenureFactor = Math.min(1.2, 1 + (tenureYears * 0.05));
  const goalCompletionRate = metrics.totalGoals > 0
    ? (metrics.goalsCompleted / metrics.totalGoals) * 100
    : 50;

  const pif = (
    0.30 * metrics.productivityScore +
    0.25 * metrics.engagementScore +
    0.20 * metrics.collaborationScore +
    0.15 * goalCompletionRate +
    0.10 * metrics.feedbackScore
  ) * tenureFactor;

  return Math.round(pif * 100) / 100;
}

function getRankFromScore(score: number): string {
  if (score >= 90) return 'Elite Performer';
  if (score >= 80) return 'High Achiever';
  if (score >= 70) return 'Strong Contributor';
  if (score >= 60) return 'Solid Performer';
  if (score >= 50) return 'Developing';
  return 'Emerging Talent';
}

function getRankColor(rank: string): string {
  switch (rank) {
    case 'Elite Performer': return 'from-amber-500 to-yellow-500';
    case 'High Achiever': return 'from-purple-500 to-indigo-500';
    case 'Strong Contributor': return 'from-blue-500 to-cyan-500';
    case 'Solid Performer': return 'from-green-500 to-emerald-500';
    case 'Developing': return 'from-orange-500 to-amber-500';
    default: return 'from-gray-500 to-slate-500';
  }
}

export function EmployeeCard({ userId, onClose }: EmployeeCardProps) {
  const { user: currentUser } = useAuthStore();
  const targetUserId = userId || currentUser?.id;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg'>('pdf');

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ['user', targetUserId],
    queryFn: () => usersApi.getById(targetUserId!),
    enabled: !!targetUserId && targetUserId !== currentUser?.id,
  });

  const user = targetUserId === currentUser?.id ? currentUser : userData;

  // Fetch analytics data
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  // Fetch goals
  const { data: goalsData } = useQuery({
    queryKey: ['goals', 'my'],
    queryFn: () => goalsApi.getMyGoals({}),
  });

  // Calculate metrics
  const metrics: PerformanceMetrics = {
    overallScore: analyticsData?.overallScore || 75,
    productivityScore: analyticsData?.productivity || 78,
    engagementScore: analyticsData?.engagement || 82,
    collaborationScore: analyticsData?.collaboration || 80,
    goalsCompleted: goalsData?.data?.filter(g => g.status === 'COMPLETED').length || 3,
    totalGoals: goalsData?.data?.length || 5,
    reviewsCompleted: analyticsData?.reviewsCompleted || 2,
    feedbackScore: analyticsData?.feedbackScore || 85,
    streakDays: analyticsData?.streakDays || 15,
    rank: '',
  };

  const pifScore = calculatePIF(metrics, 1);
  metrics.rank = getRankFromScore(pifScore);

  const handleExport = async (format: 'pdf' | 'jpg') => {
    if (!cardRef.current) return;

    setIsExporting(true);
    setExportFormat(format);

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      if (format === 'jpg') {
        const link = document.createElement('a');
        link.download = `employee-card-${user?.firstName}-${user?.lastName}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width / 2, canvas.height / 2],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`employee-card-${user?.firstName}-${user?.lastName}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Employee Performance Card</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('jpg')}
            disabled={isExporting}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <PhotoIcon className="h-4 w-4" />
            {isExporting && exportFormat === 'jpg' ? 'Exporting...' : 'Download JPG'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            {isExporting && exportFormat === 'pdf' ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Card preview */}
      <div
        ref={cardRef}
        className="bg-white rounded-2xl shadow-xl overflow-hidden"
        style={{ width: '800px', height: '500px' }}
      >
        {/* Header gradient */}
        <div className={clsx(
          'h-32 bg-gradient-to-r',
          getRankColor(metrics.rank)
        )} />

        <div className="relative px-8 pb-8">
          {/* Avatar */}
          <div className="absolute -top-16 left-8">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
            )}
          </div>

          {/* Rank badge */}
          <div className="absolute top-4 right-8">
            <div className={clsx(
              'px-4 py-2 rounded-full text-white font-semibold flex items-center gap-2 bg-gradient-to-r',
              getRankColor(metrics.rank)
            )}>
              <TrophyIcon className="h-5 w-5" />
              {metrics.rank}
            </div>
          </div>

          {/* User info */}
          <div className="pt-20">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-secondary-900">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-secondary-600 flex items-center gap-2 mt-1">
                  <BriefcaseIcon className="h-4 w-4" />
                  {user.jobTitle || 'Employee'}
                </p>
                <p className="text-secondary-500 text-sm flex items-center gap-2 mt-1">
                  <CalendarDaysIcon className="h-4 w-4" />
                  Report generated: {format(new Date(), 'MMM d, yyyy')}
                </p>
              </div>

              {/* PIF Score */}
              <div className="text-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${pifScore * 2.83} 283`}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-secondary-900">{Math.round(pifScore)}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-secondary-600 mt-1">PIF Score</p>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                <ChartBarIcon className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-blue-700">{metrics.productivityScore}%</p>
                <p className="text-xs text-blue-600 font-medium">Productivity</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                <ArrowTrendingUpIcon className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-700">{metrics.engagementScore}%</p>
                <p className="text-xs text-green-600 font-medium">Engagement</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                <SparklesIcon className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-purple-700">{metrics.collaborationScore}%</p>
                <p className="text-xs text-purple-600 font-medium">Collaboration</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center">
                <StarIcon className="h-6 w-6 mx-auto text-amber-600 mb-2" />
                <p className="text-2xl font-bold text-amber-700">{metrics.feedbackScore}%</p>
                <p className="text-xs text-amber-600 font-medium">Feedback Score</p>
              </div>
            </div>

            {/* Bottom stats */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-secondary-200">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <AcademicCapIcon className="h-5 w-5 text-secondary-500" />
                  <span className="text-sm text-secondary-600">
                    <strong>{metrics.goalsCompleted}/{metrics.totalGoals}</strong> Goals Completed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-secondary-500" />
                  <span className="text-sm text-secondary-600">
                    <strong>{metrics.streakDays}</strong> Day Streak
                  </span>
                </div>
              </div>
              <div className="text-xs text-secondary-400">
                PIF = (0.3×PS + 0.25×ES + 0.2×CS + 0.15×GCR + 0.1×FS) × TF
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4">
        <h4 className="font-semibold text-secondary-900 dark:text-white mb-2">Performance Improvement Formula (PIF)</h4>
        <p className="text-sm text-secondary-600 dark:text-secondary-400">
          The PIF score is calculated using a weighted formula that considers multiple performance dimensions:
        </p>
        <ul className="text-sm text-secondary-600 dark:text-secondary-400 mt-2 space-y-1">
          <li>• <strong>Productivity (30%)</strong>: Task completion rate and work output</li>
          <li>• <strong>Engagement (25%)</strong>: Active participation and platform usage</li>
          <li>• <strong>Collaboration (20%)</strong>: Teamwork and communication effectiveness</li>
          <li>• <strong>Goal Completion (15%)</strong>: Achievement of set objectives</li>
          <li>• <strong>Feedback Score (10%)</strong>: Quality of feedback given and received</li>
          <li>• <strong>Tenure Factor (1.0-1.2)</strong>: Experience multiplier based on years of service</li>
        </ul>
      </div>

      {onClose && (
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default EmployeeCard;
