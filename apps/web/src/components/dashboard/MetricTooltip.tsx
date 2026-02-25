import { useState, useRef, useEffect, type ReactNode } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

// ── Glossary of all PMS metric abbreviations ─────────────────────────────
interface MetricEntry {
  fullName: string;
  description: string;
  formula: string;
  impact: string;
  weight?: string;
}

const METRIC_GLOSSARY: Record<string, MetricEntry> = {
  CPIS: {
    fullName: 'Comprehensive Performance Intelligence Score',
    description: 'The master score that combines all 8 performance dimensions into a single, fair, and mathematically rigorous rating. It uses weighted harmonic mean with Bayesian smoothing for accuracy.',
    formula: 'Weighted Harmonic Mean of 8 dimensions × Confidence Factor, with fairness adjustment and Bayesian smoothing for low-data scenarios.',
    impact: 'This is your overall performance score. All 8 dimensions contribute to it based on their individual weights.',
  },
  GAI: {
    fullName: 'Goal Attainment Index',
    description: 'Measures how effectively you achieve your goals, considering their priority levels and completion quality — not just whether they were finished.',
    formula: 'Weighted average of goal progress, with priority multipliers (Critical ×2.0, High ×1.5, Medium ×1.0, Low ×0.75) and a completion bonus for 100% goals.',
    impact: 'The single largest contributor to your CPIS score. Strong goal completion significantly boosts your overall rating.',
    weight: '25%',
  },
  RQS: {
    fullName: 'Review Quality Score',
    description: 'Evaluates the quality and consistency of performance reviews you receive, including the depth of feedback and rating patterns.',
    formula: 'Average of normalized review ratings with consistency adjustment. Higher scores for detailed, specific feedback from multiple reviewers.',
    impact: 'Second-highest contributor to CPIS. Consistent positive reviews signal sustained performance.',
    weight: '20%',
  },
  FSI: {
    fullName: 'Feedback Sentiment Index',
    description: 'Analyzes the tone and sentiment of feedback you receive from peers, managers, and stakeholders using natural language processing.',
    formula: 'Sentiment analysis score averaged across all feedback received, normalized to a 0-100 scale with recency weighting.',
    impact: 'Reflects how others perceive your contributions and work quality.',
    weight: '12%',
  },
  CIS: {
    fullName: 'Collaboration Impact Score',
    description: 'Measures your effectiveness as a team player — how well you collaborate, contribute to shared goals, and support colleagues.',
    formula: 'Derived from 360-degree feedback, cross-team goal contributions, and peer recognition frequency.',
    impact: 'Captures your teamwork effectiveness that individual metrics might miss.',
    weight: '10%',
  },
  CRI: {
    fullName: 'Consistency & Reliability Index',
    description: 'Tracks how consistently you deliver results over time. Rewards steady performers and detects inconsistent patterns.',
    formula: 'Standard deviation analysis of your scores over recent review periods. Lower variance = higher CRI.',
    impact: 'Ensures your CPIS reflects sustained performance, not one-time spikes.',
    weight: '10%',
  },
  GTS: {
    fullName: 'Growth Trajectory Score',
    description: 'Measures your improvement trend — are you getting better over time? Uses linear regression on historical scores.',
    formula: 'Linear regression slope of performance scores over recent periods, normalized to 0-100.',
    impact: 'Rewards employees who are improving, even if their absolute score is moderate.',
    weight: '8%',
  },
  EQS: {
    fullName: 'Evidence Quality Score',
    description: 'Evaluates the quality and quantity of evidence supporting your performance claims — goal updates, review attachments, feedback context.',
    formula: 'Weighted count of evidence items (goal updates, review comments, feedback entries) with recency and depth factors.',
    impact: 'Higher EQS increases the confidence level of your CPIS score.',
    weight: '8%',
  },
  III: {
    fullName: 'Initiative & Innovation Index',
    description: 'Recognizes proactive contributions beyond assigned tasks — new ideas, process improvements, and voluntary initiatives.',
    formula: 'Derived from above-and-beyond goal types, innovation-tagged feedback, and self-initiated objectives.',
    impact: 'Rewards employees who go beyond their job description.',
    weight: '7%',
  },
  PIP: {
    fullName: 'Performance Improvement Plan',
    description: 'A structured program for employees who need support to meet performance expectations, with clear milestones and timelines.',
    formula: 'Not a scored metric — it is an action plan with defined improvement targets and review checkpoints.',
    impact: 'Active PIPs indicate areas needing focused development and manager support.',
  },
  OKR: {
    fullName: 'Objectives & Key Results',
    description: 'A goal-setting framework that links high-level objectives to measurable key results, aligning individual work with company strategy.',
    formula: 'OKR progress feeds into the GAI (Goal Attainment Index) dimension of your CPIS score.',
    impact: 'OKR completion directly contributes to your GAI score, which is 25% of CPIS.',
  },
};

// ── MetricTooltip Component ──────────────────────────────────────────────
interface MetricTooltipProps {
  code: string;
  children: ReactNode;
  className?: string;
}

export default function MetricTooltip({ code, children, className }: MetricTooltipProps) {
  const entry = METRIC_GLOSSARY[code];
  const [hovered, setHovered] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // If code not in glossary, just render children as-is
  if (!entry) return <>{children}</>;

  // Close detail on outside click or Esc
  useEffect(() => {
    if (!showDetail) return;
    const handleClick = (e: MouseEvent) => {
      if (detailRef.current && !detailRef.current.contains(e.target as Node) &&
          wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDetail(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDetail(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showDetail]);

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex items-center gap-1 cursor-default ${className ?? ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Original content */}
      <span className="border-b border-dotted border-current/30">{children}</span>

      {/* ⓘ button — appears on hover */}
      {(hovered || showDetail) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowDetail(prev => !prev); }}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all duration-200 flex-shrink-0"
          title={`Info: ${entry.fullName}`}
        >
          <InformationCircleIcon className="w-3 h-3" />
        </button>
      )}

      {/* Hover tooltip — full name only */}
      {hovered && !showDetail && (
        <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
          <div className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap border border-white/10">
            {entry.fullName}
            {entry.weight && <span className="text-white/50 ml-1.5">({entry.weight})</span>}
          </div>
        </div>
      )}

      {/* Detail popover — full info panel */}
      {showDetail && (
        <div
          ref={detailRef}
          className="absolute bottom-full left-0 mb-3 z-[100] w-80 animate-in fade-in slide-in-from-bottom-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-xl border border-white/15 shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(15, 20, 35, 0.95)',
              backdropFilter: 'blur(20px) saturate(1.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-cyan-400 tracking-wider">{code}</span>
                  {entry.weight && (
                    <span className="text-2xs font-medium text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                      {entry.weight} weight
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-white">{entry.fullName}</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Description */}
              <div>
                <p className="text-xs leading-relaxed text-white/70">{entry.description}</p>
              </div>

              {/* Formula */}
              <div>
                <h5 className="text-2xs font-semibold text-white/40 tracking-wider mb-1">HOW IT&apos;S CALCULATED</h5>
                <p className="text-xs leading-relaxed text-white/60">{entry.formula}</p>
              </div>

              {/* Impact */}
              <div>
                <h5 className="text-2xs font-semibold text-white/40 tracking-wider mb-1">IMPACT ON SCORE</h5>
                <p className="text-xs leading-relaxed text-white/60">{entry.impact}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

// Export glossary for SVG native tooltips
export { METRIC_GLOSSARY };
export type { MetricEntry };
