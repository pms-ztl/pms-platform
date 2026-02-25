import { StarIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

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
const CPISScoreDisplay = ({
  score, grade, starRating, rankLabel, dimensions, confidence, trajectory,
}: CPISScoreDisplayProps) => {
  const vb = 380;
  const cx = vb / 2;
  const cy = vb / 2;
  const maxR = 120;
  const orbR = 44;
  const dimCount = dimensions.length || 8;

  const neonColors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#818cf8', '#2dd4bf', '#e879f9'];

  const radarPoints = dimensions.map((d, i) => {
    const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
    const r = ((d.rawScore ?? 0) / 100) * maxR; // no Math.max — 0 stays at center, hidden by orb
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  const rings = [25, 50, 75, 100];

  const gradeColor = grade === 'A+' || grade === 'A' ? '#10b981'
    : grade === 'B+' || grade === 'B' ? '#3b82f6'
    : grade === 'C+' || grade === 'C' ? '#f59e0b'
    : '#ef4444';

  const trajIcon = trajectory.direction === 'improving' ? '▲' : trajectory.direction === 'declining' ? '▼' : '●';
  const trajColor = trajectory.direction === 'improving' ? '#34d399' : trajectory.direction === 'declining' ? '#fb7185' : '#d4d4d8';

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      {/* Radar Chart */}
      <div className="relative w-full max-w-[300px] aspect-square mx-auto">
        {/* Soft ambient glow behind chart */}
        <div className="absolute inset-[-16px] bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-blue-500/20 rounded-full blur-3xl" />

        <svg viewBox={`0 0 ${vb} ${vb}`} className="relative z-10 w-full h-full" style={{ filter: 'drop-shadow(0 0 16px rgba(56,189,248,0.25))' }}>
          <defs>
            <radialGradient id="cpis-fill-v2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15" />
            </radialGradient>
            <linearGradient id="cpis-stroke-v2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
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
              <stop offset="0%" stopColor="rgba(56,189,248,0.25)" />
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
                stroke={`rgba(255,255,255,${ri === 3 ? 0.25 : 0.08})`}
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
                stroke="rgba(255,255,255,0.12)"
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
          <circle cx={cx} cy={cy} r={orbR - 4} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize="38" fontWeight="800"
            style={{ textShadow: '0 0 16px rgba(56,189,248,0.7)' }}
          >
            {Math.round(score)}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="central"
            fill="rgba(147,197,253,0.9)" fontSize="12" fontWeight="700" letterSpacing="3"
          >
            CPIS
          </text>

          {/* Data point dots — only outside the orb, guard against 0/null/NaN */}
          {dimensions.map((d, i) => {
            const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
            const r = ((d.rawScore ?? 0) / 100) * maxR;
            if (!d.rawScore || isNaN(r) || r < orbR + 10) return null;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            return (
              <g key={`pt-${d.code}`}>
                <circle cx={px} cy={py} r="6" fill={neonColors[i]} opacity="0.25" />
                <circle cx={px} cy={py} r="3.5" fill={neonColors[i]} stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" filter="url(#soft-glow)" />
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
            return (
              <g key={`lbl-${d.code}`} opacity={hasScore ? 1 : 0.35}>
                <text x={x} y={y - 8} textAnchor="middle" dominantBaseline="central"
                  fill="rgba(255,255,255,0.85)" fontSize="13" fontWeight="700"
                >
                  {hasScore ? Math.round(d.rawScore) : '—'}
                </text>
                <text x={x} y={y + 9} textAnchor="middle" dominantBaseline="central"
                  fill={hasScore ? neonColors[i] : 'rgba(255,255,255,0.4)'} fontSize="11" fontWeight="800"
                  style={hasScore ? { textShadow: `0 0 6px ${neonColors[i]}70` } : undefined}
                >
                  {d.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Grade + Stars + Trajectory */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <span
          className="text-lg font-black px-3 py-1 rounded-lg border-2"
          style={{
            color: gradeColor,
            borderColor: gradeColor,
            backgroundColor: gradeColor + '20',
            textShadow: `0 0 10px ${gradeColor}60`,
          }}
        >
          {grade}
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <StarIcon key={i} className={clsx('w-5 h-5', i <= starRating ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : 'text-white/15')} />
          ))}
        </div>
        <span className="text-sm font-bold flex items-center gap-1" style={{ color: trajColor }}>
          {trajIcon} {trajectory.direction.charAt(0).toUpperCase() + trajectory.direction.slice(1)}
        </span>
      </div>

      {/* Rank label */}
      <p className="text-white text-base font-bold tracking-wider text-center"
        style={{ textShadow: '0 0 12px rgba(139,92,246,0.4)' }}
      >
        {rankLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
      </p>

      {/* Confidence bar */}
      <div className="w-full max-w-[250px] mx-auto">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-cyan-300/70 font-semibold">{Math.round(confidence.lowerBound)}</span>
          <span className="font-bold text-white/80">{Math.round(confidence.level * 100)}% Confidence</span>
          <span className="text-violet-300/70 font-semibold">{Math.round(confidence.upperBound)}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${confidence.level * 100}%`,
              background: 'linear-gradient(90deg, #22d3ee, #60a5fa, #a78bfa)',
              boxShadow: '0 0 8px rgba(96,165,250,0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CPISScoreDisplay;
