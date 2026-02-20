import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TalentCardData {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  performanceScore?: number;
  rating?: number;
  ratingLabel?: string;
  goalsCompleted?: number;
  goalsTotal?: number;
  feedbackScore?: number;
  tenure?: number;
  potential?: 'low' | 'medium' | 'high';
  nineBoxPosition?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first?.[0] || ''}${last?.[0] || ''}`;
}

function getRatingColor(rating?: number) {
  if (!rating) return 'text-secondary-400';
  if (rating >= 4.5) return 'text-emerald-500';
  if (rating >= 3.5) return 'text-blue-500';
  if (rating >= 2.5) return 'text-amber-500';
  return 'text-red-500';
}

function getRatingLabel(rating?: number, label?: string) {
  if (label) return label;
  if (!rating) return 'Not Rated';
  if (rating >= 4.5) return 'Exceptional';
  if (rating >= 3.5) return 'Exceeds';
  if (rating >= 2.5) return 'Meets';
  return 'Needs Improvement';
}

function getPotentialBadge(potential?: string) {
  if (!potential) return null;
  const config: Record<string, { bg: string; text: string }> = {
    high: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    medium: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    low: { bg: 'bg-secondary-100 dark:bg-secondary-700', text: 'text-secondary-600 dark:text-secondary-400' },
  };
  const c = config[potential] || config.medium;
  return (
    <span className={clsx('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full', c.bg, c.text)}>
      {potential} potential
    </span>
  );
}

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="4" stroke="currentColor" className="text-secondary-200 dark:text-secondary-700" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="4" stroke={color} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-secondary-900 dark:text-white">{Math.round(score)}</span>
      </div>
    </div>
  );
}

// ── Compact Talent Card ──────────────────────────────────────────────────────

interface TalentCardProps {
  data: TalentCardData;
  compact?: boolean;
  showActions?: boolean;
}

export function TalentCard({ data, compact = false, showActions = true }: TalentCardProps) {
  const ratingColor = getRatingColor(data.rating);
  const ratingText = getRatingLabel(data.rating, data.ratingLabel);

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {getInitials(data.firstName, data.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-secondary-900 dark:text-white truncate">{data.firstName} {data.lastName}</p>
          <p className="text-[10px] text-secondary-400 truncate">{data.jobTitle || 'Team Member'}</p>
        </div>
        {data.performanceScore !== undefined && <ScoreRing score={data.performanceScore} size={32} />}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-4 hover:shadow-lg transition-all group">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
          {getInitials(data.firstName, data.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
            {data.firstName} {data.lastName}
          </h4>
          <p className="text-[11px] text-secondary-500 truncate">{data.jobTitle || 'Team Member'}</p>
          {data.department && <p className="text-[10px] text-secondary-400">{data.department}</p>}
        </div>
        {data.performanceScore !== undefined && <ScoreRing score={data.performanceScore} />}
      </div>

      {/* Rating */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className={clsx('text-xs font-semibold', ratingColor)}>{ratingText}</span>
          {data.rating && (
            <span className="text-[10px] text-secondary-400">({(data.rating ?? 0).toFixed(1)})</span>
          )}
        </div>
        {getPotentialBadge(data.potential)}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-[10px] text-secondary-500 dark:text-secondary-400 mb-3">
        {data.goalsTotal !== undefined && (
          <span>{data.goalsCompleted || 0}/{data.goalsTotal} goals</span>
        )}
        {data.feedbackScore !== undefined && (
          <span>FB: {data.feedbackScore}/100</span>
        )}
        {data.tenure !== undefined && (
          <span>{data.tenure}y tenure</span>
        )}
      </div>

      {/* Quick actions */}
      {showActions && (
        <div className="flex gap-2 pt-2 border-t border-secondary-100 dark:border-secondary-700">
          <Link
            to={`/employees/${data.id}`}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-lg bg-secondary-50 dark:bg-secondary-900 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
          >
            <UserIcon className="h-3 w-3" /> Profile
          </Link>
          <Link
            to="/one-on-ones"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-lg bg-secondary-50 dark:bg-secondary-900 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
          >
            <CalendarDaysIcon className="h-3 w-3" /> 1-on-1
          </Link>
          <Link
            to="/feedback"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-lg bg-secondary-50 dark:bg-secondary-900 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-3 w-3" /> Feedback
          </Link>
        </div>
      )}
    </div>
  );
}
