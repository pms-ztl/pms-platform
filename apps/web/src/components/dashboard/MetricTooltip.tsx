import { useState, useRef, useEffect, useCallback, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useThemeStore, type Theme } from '@/store/theme';

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
    formula: 'Weighted Harmonic Mean of 8 dimensions x Confidence Factor, with fairness adjustment and Bayesian smoothing for low-data scenarios.',
    impact: 'This is your overall performance score. All 8 dimensions contribute to it based on their individual weights.',
  },
  GAI: {
    fullName: 'Goal Attainment Index',
    description: 'Measures how effectively you achieve your goals, considering their priority levels and completion quality — not just whether they were finished.',
    formula: 'Weighted average of goal progress, with priority multipliers (Critical x2.0, High x1.5, Medium x1.0, Low x0.75) and a completion bonus for 100% goals.',
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

// ── Accent-adaptive metric colors (reads from CSS custom properties) ──
function cssVar(name: string): string {
  if (typeof document === 'undefined') return '99 102 241';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '99 102 241';
}
function rgbToHex(rgb: string): string {
  const parts = rgb.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '#6366f1';
  return '#' + parts.map(c => c.toString(16).padStart(2, '0')).join('');
}
function rgbToRgba(rgb: string, a: number): string {
  const parts = rgb.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return `rgba(99,102,241,${a})`;
  return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
}

/** Returns accent colors derived from the active accent palette */
function getAccentColors(): { from: string; to: string; glow: string } {
  const p400 = cssVar('--c-primary-400');
  const p500 = cssVar('--c-primary-500');
  return {
    from: rgbToHex(p500),
    to:   rgbToHex(p400),
    glow: rgbToRgba(p500, 0.35),
  };
}

// Keep the map signature for backward compat but all entries read from accent palette
const METRIC_ACCENTS: Record<string, { from: string; to: string; glow: string }> = new Proxy(
  {} as Record<string, { from: string; to: string; glow: string }>,
  { get: () => getAccentColors() },
);
const DEFAULT_ACCENT = new Proxy(
  {} as { from: string; to: string; glow: string },
  { get: (_t, prop) => (getAccentColors() as any)[prop] },
);

// ── Theme-aware style helpers ──
function getThemeStyles(theme: Theme): {
  tipBg: CSSProperties;
  tipText: string;
  tipBorder: string;
  popBg: CSSProperties;
  popBorder: string;
  headerBorder: string;
  codeColor: string;
  titleColor: string;
  bodyText: string;
  bodyMuted: string;
  labelColor: string;
  closeBtnHover: string;
  weightBg: string;
  weightText: string;
} {
  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  if (effectiveTheme === 'light') {
    return {
      tipBg: { background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px) saturate(1.8)' },
      tipText: 'text-gray-800',
      tipBorder: 'border-gray-200/60',
      popBg: { background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(32px) saturate(2.0) brightness(1.05)' },
      popBorder: 'border-gray-200/50',
      headerBorder: 'border-gray-200/40',
      codeColor: 'text-primary-600',
      titleColor: 'text-gray-900',
      bodyText: 'text-gray-700',
      bodyMuted: 'text-gray-500',
      labelColor: 'text-gray-400',
      closeBtnHover: 'hover:bg-gray-200/60 text-gray-400 hover:text-gray-700',
      weightBg: 'bg-primary-50',
      weightText: 'text-primary-500',
    };
  }

  if (effectiveTheme === 'deep-dark') {
    return {
      tipBg: { background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(24px) saturate(1.6)' },
      tipText: 'text-white',
      tipBorder: 'border-white/10',
      popBg: { background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(40px) saturate(1.8) brightness(0.95)' },
      popBorder: 'border-white/[0.08]',
      headerBorder: 'border-white/[0.06]',
      codeColor: 'text-primary-300',
      titleColor: 'text-white',
      bodyText: 'text-white/75',
      bodyMuted: 'text-white/55',
      labelColor: 'text-white/35',
      closeBtnHover: 'hover:bg-white/10 text-white/30 hover:text-white',
      weightBg: 'bg-white/5',
      weightText: 'text-white/40',
    };
  }

  // dark (default)
  return {
    tipBg: { background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(24px) saturate(1.6)' },
    tipText: 'text-white',
    tipBorder: 'border-white/10',
    popBg: { background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(40px) saturate(1.8) brightness(1.05)' },
    popBorder: 'border-white/10',
    headerBorder: 'border-white/[0.08]',
    codeColor: 'text-primary-400',
    titleColor: 'text-white',
    bodyText: 'text-white/75',
    bodyMuted: 'text-white/60',
    labelColor: 'text-white/35',
    closeBtnHover: 'hover:bg-white/10 text-white/30 hover:text-white',
    weightBg: 'bg-white/5',
    weightText: 'text-white/40',
  };
}

// ── Inline keyframes (injected once) ──
const ANIM_ID = 'metric-tooltip-anims';
function ensureAnimations() {
  if (document.getElementById(ANIM_ID)) return;
  const style = document.createElement('style');
  style.id = ANIM_ID;
  style.textContent = `
    @keyframes mt-pop-in {
      0%   { opacity: 0; transform: scale(0.92) translateY(6px); filter: blur(4px); }
      60%  { opacity: 1; transform: scale(1.02) translateY(-1px); filter: blur(0); }
      100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
    }
    @keyframes mt-tip-in {
      0%   { opacity: 0; transform: translate(-50%, -100%) scale(0.9); }
      100% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
    }
    @keyframes mt-shimmer {
      0%   { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(200%) skewX(-15deg); }
    }
    @keyframes mt-glow-pulse {
      0%, 100% { opacity: 0.5; }
      50%      { opacity: 1; }
    }
    @keyframes mt-border-glow {
      0%, 100% { opacity: 0.3; }
      50%      { opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);
}

// ── MetricTooltip Component ──────────────────────────────────────────────
interface MetricTooltipProps {
  code: string;
  children: ReactNode;
  className?: string;
  /** When true, clicking the children opens the detail popover directly (no ⓘ button shown). */
  clickToReveal?: boolean;
}

export default function MetricTooltip({ code, children, className, clickToReveal }: MetricTooltipProps) {
  const entry = METRIC_GLOSSARY[code];
  const theme = useThemeStore((s) => s.theme);
  const [hovered, setHovered] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const [tipCoords, setTipCoords] = useState({ top: 0, left: 0 });
  const [popCoords, setPopCoords] = useState({ top: 0, left: 0 });

  if (!entry) return <>{children}</>;

  const accent = METRIC_ACCENTS[code] ?? DEFAULT_ACCENT;
  const T = getThemeStyles(theme);

  // Inject animation keyframes once
  useEffect(() => { ensureAnimations(); }, []);

  // Compute hover-tooltip position
  const computeTipPos = useCallback(() => {
    if (!wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    setTipCoords({ top: r.top - 10, left: r.left + r.width / 2 });
  }, []);

  // Compute detail-popover position (viewport-aware)
  const computePopPos = useCallback(() => {
    if (!wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const popW = 300;
    const popH = 320;
    const PAD = 12;

    // Horizontal: center on element, clamp to viewport
    let left = r.left + r.width / 2 - popW / 2;
    if (left + popW > vw - PAD) left = vw - PAD - popW;
    if (left < PAD) left = PAD;

    const belowTop = r.bottom + PAD;
    const aboveTop = r.top - PAD - popH;

    let top: number;
    if (clickToReveal) {
      // For bars: prefer below, fall back to above
      if (belowTop + popH <= vh - PAD) {
        top = belowTop;
      } else if (aboveTop >= PAD) {
        top = aboveTop;
      } else {
        top = Math.max(PAD, vh - popH - PAD);
      }
    } else {
      // Default: prefer above, fall back to below
      if (aboveTop >= PAD) {
        top = aboveTop;
      } else if (belowTop + popH <= vh - PAD) {
        top = belowTop;
      } else {
        top = Math.max(PAD, Math.min(vh - popH - PAD, aboveTop));
      }
    }

    setPopCoords({ top, left });
  }, [clickToReveal]);

  // Close on outside click / Esc
  useEffect(() => {
    if (!showDetail) return;
    const handleClick = (e: MouseEvent) => {
      if (
        detailRef.current && !detailRef.current.contains(e.target as Node) &&
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node)
      ) {
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

  // Recompute on scroll/resize
  useEffect(() => {
    if (!hovered && !showDetail) return;
    const update = () => {
      if (hovered && !showDetail) computeTipPos();
      if (showDetail) computePopPos();
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [hovered, showDetail, computeTipPos, computePopPos]);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    computeTipPos();
  }, [computeTipPos]);

  const handleToggleDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDetail) computePopPos();
    setShowDetail((prev) => !prev);
  }, [showDetail, computePopPos]);

  // ── Gradient string for this metric ──
  const gradient = `linear-gradient(135deg, ${accent.from}, ${accent.to})`;

  const handleWrapperClick = useCallback((e: React.MouseEvent) => {
    if (!clickToReveal) return;
    e.stopPropagation();
    if (!showDetail) computePopPos();
    setShowDetail((prev) => !prev);
  }, [clickToReveal, showDetail, computePopPos]);

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex items-center gap-1 ${clickToReveal ? 'cursor-pointer w-full' : 'cursor-default'} ${className ?? ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      onClick={handleWrapperClick}
    >
      <span>{children}</span>

      {/* Stylish "i" info button — always visible, hidden when clickToReveal is active */}
      {!clickToReveal && (
        <button
          type="button"
          onClick={handleToggleDetail}
          className="relative z-20 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full transition-all duration-300 hover:scale-110 flex-shrink-0 ml-0.5"
          style={{
            background: showDetail
              ? gradient
              : hovered
                ? `linear-gradient(135deg, ${accent.from}30, ${accent.to}20)`
                : `linear-gradient(135deg, ${accent.from}18, ${accent.to}10)`,
            border: `1px solid ${showDetail ? accent.from : `${accent.from}40`}`,
            boxShadow: showDetail
              ? `0 0 10px ${accent.glow}, 0 0 4px ${accent.from}30`
              : hovered
                ? `0 0 8px ${accent.glow}`
                : `0 0 4px ${accent.from}15`,
          }}
          aria-label={entry.fullName}
        >
          <span
            className="font-bold leading-none select-none"
            style={{
              fontSize: '8px',
              fontFamily: "'Georgia', serif",
              fontStyle: 'italic',
              color: showDetail ? '#fff' : accent.from,
              textShadow: showDetail ? `0 0 4px rgba(255,255,255,0.5)` : 'none',
            }}
          >
            i
          </span>
        </button>
      )}

      {/* ── Hover tooltip (portal) — hidden in clickToReveal mode ── */}
      {!clickToReveal && hovered && !showDetail && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: tipCoords.top,
            left: tipCoords.left,
            animation: 'mt-tip-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <div
            className={`relative overflow-hidden px-2.5 py-1.5 rounded-lg shadow-lg border ${T.tipBorder}`}
            style={{
              ...T.tipBg,
              boxShadow: `0 4px 16px -2px rgba(0,0,0,0.18), 0 0 0 1px ${accent.from}12, 0 0 10px ${accent.glow}`,
            }}
          >
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent.from}10, transparent)`,
                animation: 'mt-shimmer 2.5s ease-in-out infinite',
              }}
            />
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: gradient }} />
            <div className="relative flex items-center gap-1.5 whitespace-nowrap">
              <span className={`text-2xs font-semibold ${T.tipText}`}>{entry.fullName}</span>
              {entry.weight && (
                <span
                  className="text-2xs font-bold px-1 py-px rounded"
                  style={{ background: `${accent.from}15`, color: accent.from, fontSize: '9px' }}
                >
                  {entry.weight}
                </span>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Detail popover (portal) ── */}
      {showDetail && createPortal(
        <div
          ref={detailRef}
          className="fixed z-[9999] w-[300px] max-w-[calc(100vw-2rem)]"
          style={{
            top: popCoords.top,
            left: popCoords.left,
            animation: 'mt-pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`relative rounded-2xl border ${T.popBorder} overflow-hidden`}
            style={{
              ...T.popBg,
              boxShadow: [
                `0 24px 60px -12px rgba(0,0,0,0.4)`,
                `0 0 0 1px ${accent.from}10`,
                `0 0 40px -8px ${accent.glow}`,
                `inset 0 1px 0 rgba(255,255,255,0.08)`,
              ].join(', '),
            }}
          >
            {/* ── Animated glow border ── */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${accent.from}20, transparent 40%, transparent 60%, ${accent.to}20)`,
                animation: 'mt-border-glow 3s ease-in-out infinite',
              }}
            />

            {/* ── Shimmer sweep overlay ── */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(105deg, transparent 40%, ${accent.from}08, transparent 60%)`,
                animation: 'mt-shimmer 4s ease-in-out infinite 0.5s',
              }}
            />

            {/* ── Top gradient accent bar ── */}
            <div className="absolute top-0 left-0 right-0 h-[3px] z-10" style={{ background: gradient }}>
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)`,
                  animation: 'mt-shimmer 3s ease-in-out infinite',
                }}
              />
            </div>

            {/* ── Header ── */}
            <div className={`relative z-10 flex items-start justify-between p-3.5 pb-2.5 border-b ${T.headerBorder}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* Glowing code badge */}
                  <span
                    className="text-xs font-extrabold tracking-widest px-2 py-0.5 rounded-md"
                    style={{
                      background: `${accent.from}18`,
                      color: accent.from,
                      boxShadow: `0 0 8px ${accent.glow}`,
                    }}
                  >
                    {code}
                  </span>
                  {entry.weight && (
                    <span className={`text-2xs font-semibold ${T.weightBg} ${T.weightText} px-1.5 py-0.5 rounded-md`}>
                      {entry.weight} weight
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-semibold ${T.titleColor} leading-snug`}>{entry.fullName}</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className={`p-1 rounded-lg ${T.closeBtnHover} transition-all duration-200 flex-shrink-0 ml-2 hover:rotate-90`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="relative z-10 p-3.5 pt-3 space-y-3 max-h-[280px] overflow-y-auto">
              {/* Description */}
              <p className={`text-xs leading-relaxed ${T.bodyText}`}>{entry.description}</p>

              {/* Formula */}
              <div
                className="rounded-lg p-2.5 transition-all duration-300 hover:scale-[1.01]"
                style={{ background: `${accent.from}08` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <SparklesIcon className="w-3 h-3" style={{ color: accent.from }} />
                  <h5 className={`text-2xs font-bold tracking-wider ${T.labelColor}`}>HOW IT&apos;S CALCULATED</h5>
                </div>
                <p className={`text-2xs leading-relaxed ${T.bodyMuted}`}>{entry.formula}</p>
              </div>

              {/* Impact */}
              <div
                className="rounded-lg p-2.5 transition-all duration-300 hover:scale-[1.01]"
                style={{ background: `${accent.to}08` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: gradient, boxShadow: `0 0 6px ${accent.glow}` }} />
                  <h5 className={`text-2xs font-bold tracking-wider ${T.labelColor}`}>IMPACT ON SCORE</h5>
                </div>
                <p className={`text-2xs leading-relaxed ${T.bodyMuted}`}>{entry.impact}</p>
              </div>
            </div>

            {/* ── Bottom glow accent ── */}
            <div
              className="absolute bottom-0 left-[10%] right-[10%] h-[1px] z-10"
              style={{
                background: gradient,
                opacity: 0.4,
                filter: `blur(1px) drop-shadow(0 0 4px ${accent.glow})`,
              }}
            />
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}

// Export glossary + shared helpers for other popovers
export { METRIC_GLOSSARY, getThemeStyles, ensureAnimations, METRIC_ACCENTS, DEFAULT_ACCENT };
export type { MetricEntry };
