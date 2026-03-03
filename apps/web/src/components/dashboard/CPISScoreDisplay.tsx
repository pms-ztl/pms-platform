import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useThemeStore } from '@/store/theme';
import { ACCENT_COLORS } from '@/lib/accent-colors';
import { getThemeStyles, ensureAnimations } from './MetricTooltip';

/** Convert "R G B" palette string → hex #RRGGBB */
function pHex(rgb: string): string {
  const [r, g, b] = rgb.split(' ').map(Number);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
/** Convert "R G B" → rgba(R,G,B,a) */
function pRgba(rgb: string, a: number): string {
  return `rgba(${rgb.split(' ').join(',')},${a})`;
}

// Grade scale with dual color sets — bright (dark/deep-dark bg) and saturated (light bg)
const GRADE_SCALE_DARK = [
  { grade: 'A+', range: '90–100', color: '#10b981', glow: 'rgba(16,185,129,0.4)', desc: 'Exceptional performer' },
  { grade: 'A',  range: '80–89',  color: '#10b981', glow: 'rgba(16,185,129,0.3)', desc: 'Strong performer' },
  { grade: 'B+', range: '70–79',  color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', desc: 'Above average' },
  { grade: 'B',  range: '60–69',  color: '#3b82f6', glow: 'rgba(59,130,246,0.25)', desc: 'Solid contributor' },
  { grade: 'C+', range: '50–59',  color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', desc: 'Meeting expectations' },
  { grade: 'C',  range: '40–49',  color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', desc: 'Needs improvement' },
  { grade: 'D',  range: '< 40',   color: '#ef4444', glow: 'rgba(239,68,68,0.35)', desc: 'Underperforming' },
];
const GRADE_SCALE_LIGHT = [
  { grade: 'A+', range: '90–100', color: '#047857', glow: 'rgba(4,120,87,0.25)', desc: 'Exceptional performer' },
  { grade: 'A',  range: '80–89',  color: '#047857', glow: 'rgba(4,120,87,0.20)', desc: 'Strong performer' },
  { grade: 'B+', range: '70–79',  color: '#1d4ed8', glow: 'rgba(29,78,216,0.20)', desc: 'Above average' },
  { grade: 'B',  range: '60–69',  color: '#1d4ed8', glow: 'rgba(29,78,216,0.15)', desc: 'Solid contributor' },
  { grade: 'C+', range: '50–59',  color: '#b45309', glow: 'rgba(180,83,9,0.20)', desc: 'Meeting expectations' },
  { grade: 'C',  range: '40–49',  color: '#b45309', glow: 'rgba(180,83,9,0.15)', desc: 'Needs improvement' },
  { grade: 'D',  range: '< 40',   color: '#b91c1c', glow: 'rgba(185,28,28,0.25)', desc: 'Underperforming' },
];

export interface CPISScoreDisplayProps {
  score: number;
  grade: string;
  starRating: number;
  rankLabel: string;
  dimensions: Array<{ code: string; rawScore: number; weight: number; name: string }>;
  confidence: { level: number; lowerBound: number; upperBound: number };
  trajectory: { direction: string; slope: number };
}

/** CPIS Score Display — clean radar + central score orb */
/* Dimension descriptions keyed by code — explains role in CPIS */
const DIM_INFO: Record<string, { full: string; role: string }> = {
  GAI: { full: 'Goal Attainment Index', role: 'Measures goal completion rate, progress, and on-time delivery' },
  RQS: { full: 'Review Quality Score', role: 'Calibrated peer & manager review ratings adjusted for bias' },
  FSI: { full: 'Feedback Sentiment Index', role: 'NLP-based sentiment analysis of written feedback' },
  CIS: { full: 'Collaboration Impact Score', role: 'Peer endorsements and cross-team collaboration impact' },
  CRI: { full: 'Consistency & Reliability Index', role: 'Quarter-over-quarter consistency and deadline reliability' },
  GTS: { full: 'Growth Trajectory Score', role: 'Skill development velocity and learning momentum' },
  EQS: { full: 'Evidence Quality Score', role: 'Quality, verification rate, and diversity of submitted evidence' },
  III: { full: 'Initiative & Innovation Index', role: 'Self-started projects, creative problem-solving, and ownership' },
};

const CPISScoreDisplay = ({
  score, grade, starRating, rankLabel, dimensions, confidence, trajectory,
}: CPISScoreDisplayProps) => {
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const isDark = theme !== 'light';
  const T = getThemeStyles(theme);

  // Accent palette for radar gradients
  const ap = ACCENT_COLORS[accentColor].palette;
  const ac = {
    light:  pHex(ap[300]),  // lighter shade
    mid:    pHex(ap[400]),  // main accent
    strong: pHex(ap[500]),  // stronger
    deep:   pHex(ap[600]),  // deepest
  };

  const vb = 400;
  const cx = vb / 2;
  const cy = vb / 2;
  const maxR = 120;
  const orbR = 44;
  const dimCount = dimensions.length || 8;

  // Neon colors: bright variants for dark/deep-dark bg, saturated-dark variants for light bg
  // Dark mode  (400-level): cyan, violet, emerald, amber, rose, indigo, teal, fuchsia — bright on dark
  // Light mode (700-level): high contrast ≥4.5:1 against white glass per WCAG AA
  const neonColorsDark  = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#818cf8', '#2dd4bf', '#e879f9'];
  const neonColorsLight = ['#0e7490', '#6d28d9', '#047857', '#b45309', '#be123c', '#4338ca', '#0f766e', '#a21caf'];
  const neonColors = isDark ? neonColorsDark : neonColorsLight;

  // Scale radar so orb edge = 0 score, outer ring = 100 score
  // This ensures ALL scores are visible outside the orb
  const radarPoints = dimensions.map((d, i) => {
    const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
    const score = d.rawScore ?? 0;
    const r = score > 0 ? orbR + (score / 100) * (maxR - orbR) : orbR;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  const rings = [25, 50, 75, 100];

  // Grade colors: bright for dark mode, saturated-dark for light mode (WCAG AA ≥3:1 large text)
  const gradeColor = isDark
    ? (grade === 'A+' || grade === 'A' ? '#10b981'    // emerald-500
      : grade === 'B+' || grade === 'B' ? '#3b82f6'   // blue-500
      : grade === 'C+' || grade === 'C' ? '#f59e0b'   // amber-500
      : '#ef4444')                                      // red-500
    : (grade === 'A+' || grade === 'A' ? '#047857'     // emerald-700
      : grade === 'B+' || grade === 'B' ? '#1d4ed8'    // blue-700
      : grade === 'C+' || grade === 'C' ? '#b45309'    // amber-700
      : '#b91c1c');                                      // red-700

  const GRADE_SCALE = isDark ? GRADE_SCALE_DARK : GRADE_SCALE_LIGHT;

  const trajIcon = trajectory.direction === 'improving' ? '▲' : trajectory.direction === 'declining' ? '▼' : '●';
  const trajColor = trajectory.direction === 'improving'
    ? (isDark ? '#34d399' : '#047857')    // emerald-400 / emerald-700
    : trajectory.direction === 'declining'
    ? (isDark ? '#fb7185' : '#be123c')    // rose-400 / rose-700
    : (isDark ? '#a1a1aa' : '#52525b');   // zinc-400 / zinc-600

  const [showInfo, setShowInfo] = useState(false);
  const [hoveredGrade, setHoveredGrade] = useState<string | null>(null);
  const infoBtnRef = useRef<HTMLButtonElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const [infoPos, setInfoPos] = useState({ top: 0, left: 0 });

  /* Dimension "i" button tooltip */
  const [activeDim, setActiveDim] = useState<string | null>(null);
  const [dimTipPos, setDimTipPos] = useState({ top: 0, left: 0 });
  const dimTipRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { ensureAnimations(); }, []);

  /* Close dimension tooltip on outside click / scroll */
  useEffect(() => {
    if (!activeDim) return;
    const close = (e: MouseEvent) => {
      if (dimTipRef.current && !dimTipRef.current.contains(e.target as Node)) setActiveDim(null);
    };
    const scrollClose = () => setActiveDim(null);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', scrollClose, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', scrollClose, true);
    };
  }, [activeDim]);

  useEffect(() => {
    if (!showInfo || !infoBtnRef.current) return;
    const rect = infoBtnRef.current.getBoundingClientRect();
    const popH = 310; // approximate popover height
    const PAD = 12;
    const vh = window.innerHeight;
    // Prefer above if not enough room below — float tight to button
    const belowTop = rect.bottom + 4;
    const aboveTop = rect.top - 4 - popH;
    const top = (belowTop + popH > vh - PAD && aboveTop >= PAD) ? aboveTop : belowTop;
    setInfoPos({
      top,
      left: Math.max(12, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 312)),
    });
    const handleClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node) &&
          infoBtnRef.current && !infoBtnRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    const handleScroll = () => setShowInfo(false);
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showInfo]);

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      {/* Radar Chart */}
      <div className="relative w-full max-w-[300px] aspect-square mx-auto">
        {/* Soft ambient glow behind chart — accent-adaptive */}
        <div className="absolute inset-[-16px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${pRgba(ap[400], isDark ? 0.20 : 0.15)} 0%, ${pRgba(ap[500], isDark ? 0.12 : 0.08)} 50%, transparent 75%)` }} />

        <svg ref={svgRef} viewBox={`0 0 ${vb} ${vb}`} className="relative z-10 w-full h-full select-none" style={{ filter: isDark ? `drop-shadow(0 0 16px ${pRgba(ap[400], 0.25)})` : `drop-shadow(0 0 12px ${pRgba(ap[500], 0.15)})`, cursor: 'default' }}>
          <defs>
            <radialGradient id="cpis-fill-v2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ac.mid} stopOpacity="0.55" />
              <stop offset="70%" stopColor={ac.strong} stopOpacity="0.30" />
              <stop offset="100%" stopColor={ac.deep} stopOpacity="0.15" />
            </radialGradient>
            <linearGradient id="cpis-stroke-v2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ac.light} />
              <stop offset="50%" stopColor={ac.mid} />
              <stop offset="100%" stopColor={ac.strong} />
            </linearGradient>
            <filter id="neon-glow">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="6" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="soft-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="orb-fill" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor={pRgba(ap[400], 0.25)} />
              <stop offset="100%" stopColor="rgba(0,0,0,0.75)" />
            </radialGradient>
          </defs>

          {/* Grid rings — concentric octagons */}
          {rings.map((pct, ri) => {
            const r = (pct / 100) * maxR;
            return (
              <polygon
                key={pct}
                points={Array.from({ length: dimCount }, (_, i) => {
                  const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ')}
                fill="none"
                stroke={isDark ? `rgba(255,255,255,${ri === 3 ? 0.25 : 0.08})` : `rgba(0,0,0,${ri === 3 ? 0.15 : 0.06})`}
                strokeWidth={ri === 3 ? '1.2' : '0.7'}
              />
            );
          })}

          {/* Axis lines — from orb edge to maxR only */}
          {dimensions.map((_, i) => {
            const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
            return (
              <line
                key={`axis-${i}`}
                x1={cx + (orbR + 2) * Math.cos(angle)}
                y1={cy + (orbR + 2) * Math.sin(angle)}
                x2={cx + maxR * Math.cos(angle)}
                y2={cy + maxR * Math.sin(angle)}
                stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}
                strokeWidth="0.8"
              />
            );
          })}

          {/* Data polygon — filled area */}
          {dimensions.length > 0 && (
            <polygon
              points={radarPoints}
              fill="url(#cpis-fill-v2)"
              stroke="url(#cpis-stroke-v2)"
              strokeWidth="2"
              strokeLinejoin="round"
              filter="url(#neon-glow)"
            />
          )}

          {/* Center orb */}
          <circle cx={cx} cy={cy} r={orbR} fill="url(#orb-fill)" stroke="url(#cpis-stroke-v2)" strokeWidth="2" filter="url(#soft-glow)" />
          <circle cx={cx} cy={cy} r={orbR - 4} fill="none" stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'} strokeWidth="1" />
          <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize="38" fontWeight="800"
            style={{ textShadow: `0 0 16px ${pRgba(ap[400], 0.7)}` }}
          >
            {Math.round(score)}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="central"
            fill={pRgba(ap[300], 0.9)} fontSize="12" fontWeight="700" letterSpacing="3"
          >
            CPIS
          </text>

          {/* Data point dots — scaled so orb edge = 0, outer ring = 100 */}
          {dimensions.map((d, i) => {
            const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
            const score = d.rawScore ?? 0;
            if (!score || isNaN(score)) return null;
            const r = orbR + (score / 100) * (maxR - orbR);
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            return (
              <g key={`pt-${d.code}`}>
                <circle cx={px} cy={py} r="6" fill={neonColors[i]} opacity="0.25" />
                <circle cx={px} cy={py} r="3.5" fill={neonColors[i]} stroke={isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" filter="url(#soft-glow)" />
              </g>
            );
          })}

          {/* Dimension labels — always show all, dim when no score */}
          {dimensions.map((d, i) => {
            const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
            const labelR = maxR + 38;
            const x = cx + labelR * Math.cos(angle);
            const y = cy + labelR * Math.sin(angle);
            const hasScore = d.rawScore && d.rawScore > 0;
            const isActive = activeDim === d.code;
            const col = hasScore ? neonColors[i] : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)');
            return (
              <g key={`lbl-${d.code}`} opacity={hasScore ? 1 : 0.35}>
                <text x={x} y={y - 8} textAnchor="middle" dominantBaseline="central"
                  fill={isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.8)'} fontSize="13" fontWeight="700"
                >
                  {hasScore ? Math.round(d.rawScore) : '—'}
                </text>
                <text x={x} y={y + 9} textAnchor="middle" dominantBaseline="central"
                  fill={col} fontSize="11" fontWeight="800"
                  style={hasScore && isDark ? { textShadow: `0 0 6px ${neonColors[i]}70` } : undefined}
                >
                  {d.code}
                </text>
                {/* "i" info button — uniform gap from label */}
                {(() => {
                  const codeW = d.code.length * 6; // approximate half-width of label text
                  const btnX = x + codeW + 8; // consistent 8px gap from text edge
                  const btnY = y + 9;
                  return (
                    <g
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isActive) { setActiveDim(null); return; }
                        if (svgRef.current) {
                          const pt = svgRef.current.createSVGPoint();
                          pt.x = x; pt.y = btnY;
                          const ctm = svgRef.current.getScreenCTM();
                          if (ctm) {
                            const screenPt = pt.matrixTransform(ctm);
                            setDimTipPos({ top: screenPt.y + 14, left: screenPt.x });
                          }
                        }
                        setActiveDim(d.code);
                      }}
                    >
                      {/* Outer glow ring */}
                      <circle cx={btnX} cy={btnY} r="9" fill="none" stroke={col} strokeWidth="0.5" opacity={isActive ? 0.5 : 0.15} />
                      {/* Main button */}
                      <circle cx={btnX} cy={btnY} r="6.5"
                        fill={isActive ? col : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')}
                        stroke={col} strokeWidth="1"
                        opacity={isActive ? 1 : 0.7}
                        style={{ filter: isActive ? `drop-shadow(0 0 4px ${col})` : 'none' }}
                      />
                      <text x={btnX} y={btnY} textAnchor="middle" dominantBaseline="central"
                        fill={isActive ? '#000' : col} fontSize="8" fontWeight="800"
                        style={{ pointerEvents: 'none', fontFamily: 'serif', fontStyle: 'italic' }}
                      >
                        i
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {/* Dimension info tooltip — portalled inside a full-viewport container
             so CSS clamp() can use 100% = viewport width/height reliably */}
        {activeDim && DIM_INFO[activeDim] && (() => {
          const tipW = 240;
          const tipH = 160;
          const PAD = 16;

          // Desired center position based on click point
          const desiredLeft = dimTipPos.left - tipW / 2;
          const desiredTop = dimTipPos.top;

          return createPortal(
            <div className="fixed inset-0 z-[9999] pointer-events-none">
              <div
                ref={dimTipRef}
                className="absolute pointer-events-auto"
                style={{
                  /* CSS clamp ensures tooltip stays within viewport regardless of
                     JS viewport-width discrepancies, scrollbars, or CSS transforms.
                     100% here = the fixed inset-0 parent = true viewport size. */
                  top: `clamp(${PAD}px, ${desiredTop}px, calc(100% - ${tipH + PAD}px))`,
                  left: `clamp(${PAD}px, ${desiredLeft}px, calc(100% - ${tipW + PAD}px))`,
                  width: tipW,
                  animation: 'mt-pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
                }}
              >
                <div
                  className={`relative rounded-xl border ${T.popBorder} p-3`}
                  style={{
                    ...T.popBg,
                    boxShadow: '0 16px 48px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
                  }}
                >
                {(() => {
                  const info = DIM_INFO[activeDim];
                  const dim = dimensions.find(dd => dd.code === activeDim);
                  const idx = dimensions.findIndex(dd => dd.code === activeDim);
                  const col = idx >= 0 ? neonColors[idx] : '#60a5fa';
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-extrabold tracking-wide px-1.5 py-0.5 rounded-md"
                          style={{ background: `${col}20`, color: col }}
                        >
                          {activeDim}
                        </span>
                        <span className={`text-2xs font-bold ${T.bodyMuted}`}>
                          Weight: {dim ? `${Math.round(dim.weight * 100)}%` : '—'}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold ${T.titleColor} mb-1 break-words`}>{info.full}</p>
                      <p className={`text-2xs ${T.bodyMuted} leading-relaxed break-words`}>{info.role}</p>
                      {dim && dim.rawScore > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${dim.rawScore}%`, background: col, boxShadow: `0 0 6px ${col}60` }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: col }}>{Math.round(dim.rawScore)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <button
                  onClick={() => setActiveDim(null)}
                  className={`absolute top-2 right-2 p-0.5 rounded-md ${T.closeBtnHover} transition-all hover:rotate-90`}
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              </div>
            </div>,
            document.body,
          );
        })()}
      </div>

      {/* Grade + Stars + Trajectory */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <span className="relative flex items-center gap-1.5">
          <span
            className="text-lg font-black px-3 py-1 rounded-lg border-2"
            style={{
              color: gradeColor,
              borderColor: gradeColor,
              backgroundColor: gradeColor + '20',
              textShadow: isDark ? `0 0 10px ${gradeColor}60` : 'none',
            }}
          >
            {grade}
          </span>
          <button
            ref={infoBtnRef}
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300 hover:scale-125"
            style={{
              background: `linear-gradient(135deg, ${gradeColor}40, ${gradeColor}20)`,
              boxShadow: showInfo ? `0 0 12px ${gradeColor}50` : `0 0 6px ${gradeColor}30`,
              border: `1px solid ${gradeColor}40`,
            }}
            aria-label="Grade info"
          >
            <InformationCircleIcon className="w-3.5 h-3.5 text-secondary-500 dark:text-white/80" />
          </button>
        </span>

        {/* Grade info popover — frosted glassmorphism */}
        {showInfo && createPortal(
          <div
            ref={infoRef}
            className="fixed z-[9999]"
            style={{
              top: infoPos.top,
              left: infoPos.left,
              animation: 'mt-pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <div
              className={`relative w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl border ${T.popBorder} overflow-hidden`}
              style={{
                ...T.popBg,
                boxShadow: [
                  '0 24px 60px -12px rgba(0,0,0,0.4)',
                  `0 0 0 1px ${gradeColor}10`,
                  `0 0 40px -8px ${gradeColor}30`,
                  'inset 0 1px 0 rgba(255,255,255,0.08)',
                ].join(', '),
              }}
            >
              {/* Animated glow border */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${gradeColor}20, transparent 40%, transparent 60%, ${gradeColor}15)`,
                  animation: 'mt-border-glow 3s ease-in-out infinite',
                }}
              />

              {/* Shimmer sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(105deg, transparent 40%, ${gradeColor}08, transparent 60%)`,
                  animation: 'mt-shimmer 4s ease-in-out infinite 0.5s',
                }}
              />

              {/* Accent top bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] z-10"
                style={{ background: `linear-gradient(90deg, ${gradeColor}, ${gradeColor}80)` }}>
                <div className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                    animation: 'mt-shimmer 3s ease-in-out infinite',
                  }}
                />
              </div>

              {/* Header */}
              <div className={`relative z-10 flex items-start justify-between p-3.5 pb-2.5 border-b ${T.headerBorder}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-extrabold tracking-widest px-2 py-0.5 rounded-md"
                      style={{
                        background: `${gradeColor}18`,
                        color: gradeColor,
                        boxShadow: `0 0 8px ${gradeColor}30`,
                      }}
                    >
                      {grade}
                    </span>
                    <span
                      className="text-2xs font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: `${gradeColor}12`, color: gradeColor }}
                    >
                      Score: {Math.round(score)}
                    </span>
                  </div>
                  <h4 className={`text-xs font-semibold ${T.titleColor} leading-snug`}>CPIS Grade Scale</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className={`p-1 rounded-lg ${T.closeBtnHover} transition-all duration-200 flex-shrink-0 ml-2 hover:rotate-90`}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Body — grade rows */}
              <div className="relative z-10 px-3 pt-2 pb-2.5 space-y-0.5">
                <p className={`text-2xs ${T.bodyMuted} mb-1.5 leading-snug`}>
                  Score <strong className={T.titleColor}>{Math.round(score)}</strong> = grade <strong style={{ color: gradeColor }}>{grade}</strong> (8 dimensions)
                </p>
                {GRADE_SCALE.map((g, idx) => {
                  const isActive = g.grade === grade;
                  const isHovered = hoveredGrade === g.grade;
                  return (
                    <div
                      key={g.grade}
                      className="relative rounded-md px-2 py-1 transition-all duration-300 cursor-default"
                      style={{
                        background: isActive
                          ? `${g.color}18`
                          : isHovered ? `${g.color}10` : 'transparent',
                        boxShadow: isActive
                          ? `0 0 16px ${g.glow}, inset 0 0 0 1px ${g.color}30`
                          : isHovered ? `0 0 8px ${g.glow}` : 'none',
                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                        animation: isActive ? 'mt-glow-pulse 2.5s ease-in-out infinite' : undefined,
                        animationDelay: `${idx * 0.05}s`,
                      }}
                      onMouseEnter={() => setHoveredGrade(g.grade)}
                      onMouseLeave={() => setHoveredGrade(null)}
                    >
                      <div className="flex items-center gap-2.5 text-2xs">
                        <span
                          className="font-black w-7 text-center"
                          style={{
                            color: g.color,
                            textShadow: isActive || isHovered ? `0 0 8px ${g.glow}` : 'none',
                            fontSize: isActive ? '13px' : '11px',
                            transition: 'all 0.3s',
                          }}
                        >
                          {g.grade}
                        </span>
                        <span className={`${T.bodyMuted} w-14 font-mono text-2xs`}>{g.range}</span>
                        <span className={`${isActive ? T.titleColor : T.bodyText} text-2xs flex-1`}>{g.desc}</span>
                        {isActive && (
                          <span
                            className="text-2xs font-bold px-1.5 py-px rounded-full"
                            style={{ background: `${g.color}25`, color: g.color, fontSize: '8px' }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom glow accent */}
              <div
                className="absolute bottom-0 left-[10%] right-[10%] h-[1px] z-10"
                style={{
                  background: `linear-gradient(90deg, transparent, ${gradeColor}, transparent)`,
                  opacity: 0.4,
                  filter: `blur(1px) drop-shadow(0 0 4px ${gradeColor}40)`,
                }}
              />
            </div>
          </div>,
          document.body,
        )}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <StarIcon key={i} className={clsx('w-5 h-5', i <= starRating ? 'text-amber-600 dark:text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]' : 'text-secondary-300 dark:text-white/15')} />
          ))}
        </div>
        <span className="text-sm font-bold italic flex items-center gap-1" style={{ color: trajColor, fontFamily: "'Libre Baskerville', Georgia, serif" }}>
          {trajIcon} {trajectory.direction.charAt(0).toUpperCase() + trajectory.direction.slice(1)}
        </span>
      </div>

      {/* Rank label */}
      <p className="text-secondary-900 dark:text-white text-base font-bold tracking-wider text-center"
      >
        {rankLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
      </p>

      {/* Confidence bar */}
      <div className="w-full max-w-[250px] mx-auto">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold" style={{ color: isDark ? pRgba(ap[300], 0.7) : pRgba(ap[700], 1) }}>{Math.round(confidence.lowerBound)}</span>
          <span className="font-bold text-secondary-700 dark:text-white/80">{Math.round(confidence.level * 100)}% Confidence</span>
          <span className="font-semibold" style={{ color: isDark ? pRgba(ap[400], 0.7) : pRgba(ap[600], 1) }}>{Math.round(confidence.upperBound)}</span>
        </div>
        <div className="h-1.5 bg-secondary-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${confidence.level * 100}%`,
              background: `linear-gradient(90deg, ${ac.light}, ${ac.mid}, ${ac.strong})`,
              boxShadow: `0 0 8px ${pRgba(ap[400], 0.5)}`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CPISScoreDisplay;
