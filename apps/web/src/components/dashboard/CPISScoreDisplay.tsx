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

/** CPIS Score Display — vivid neon radar + central score orb */
const CPISScoreDisplay = ({
  score, grade, starRating, rankLabel, dimensions, confidence, trajectory,
}: CPISScoreDisplayProps) => {
  // SVG viewBox is fixed; the container scales it responsively
  const vb = 380; // viewBox size
  const cx = vb / 2;
  const cy = vb / 2;
  const maxR = 120;
  const dimCount = dimensions.length || 8;

  // Neon dimension colors for each axis
  const neonColors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#818cf8', '#2dd4bf', '#e879f9'];

  // Generate radar polygon points
  const radarPoints = dimensions.map((d, i) => {
    const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
    const r = Math.max(6, (d.rawScore / 100) * maxR);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  // Grid rings
  const rings = [25, 50, 75, 100];

  // Grade color
  const gradeColor = grade === 'A+' || grade === 'A' ? '#10b981'
    : grade === 'B+' || grade === 'B' ? '#3b82f6'
    : grade === 'C+' || grade === 'C' ? '#f59e0b'
    : '#ef4444';

  // Trajectory
  const trajIcon = trajectory.direction === 'improving' ? '\u25B2' : trajectory.direction === 'declining' ? '\u25BC' : '\u25CF';
  const trajColor = trajectory.direction === 'improving' ? '#34d399' : trajectory.direction === 'declining' ? '#fb7185' : '#d4d4d8';

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      {/* Radar Chart — uses viewBox so it scales with container */}
      <div className="relative w-full max-w-[300px] aspect-square mx-auto">
        {/* Multi-layer glow backdrop */}
        <div className="absolute inset-[-20px] bg-gradient-to-br from-cyan-400/25 via-blue-500/20 to-violet-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-[-10px] bg-gradient-to-tr from-emerald-400/15 to-fuchsia-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

        <svg viewBox={`0 0 ${vb} ${vb}`} className="relative z-10 w-full h-full" style={{ filter: 'drop-shadow(0 0 20px rgba(56,189,248,0.3))' }}>
          <defs>
            <radialGradient id="cpis-fill-v2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.40" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.20" />
            </radialGradient>
            <linearGradient id="cpis-stroke-v2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <filter id="neon-glow">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
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
            <linearGradient id="outer-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Outer decorative ring */}
          <circle cx={cx} cy={cy} r={maxR + 20} fill="none" stroke="url(#outer-ring-grad)" strokeWidth="1.5" strokeDasharray="5 8" opacity="0.6" />

          {/* Grid rings — visible concentric octagons */}
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
                stroke={`rgba(255,255,255,${ri === 3 ? 0.3 : 0.12})`}
                strokeWidth={ri === 3 ? '1.2' : '0.8'}
              />
            );
          })}

          {/* Axis lines with score ticks */}
          {dimensions.map((d, i) => {
            const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
            return (
              <g key={`axis-${i}`}>
                <line
                  x1={cx} y1={cy}
                  x2={cx + maxR * Math.cos(angle)}
                  y2={cy + maxR * Math.sin(angle)}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="0.8"
                />
                {(() => {
                  const r = Math.max(6, (d.rawScore / 100) * maxR);
                  const px = cx + r * Math.cos(angle);
                  const py = cy + r * Math.sin(angle);
                  const perpX = -Math.sin(angle) * 4;
                  const perpY = Math.cos(angle) * 4;
                  return (
                    <line
                      x1={px - perpX} y1={py - perpY}
                      x2={px + perpX} y2={py + perpY}
                      stroke={neonColors[i]}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  );
                })()}
              </g>
            );
          })}

          {/* Data polygon — filled area */}
          {dimensions.length > 0 && (
            <>
              <polygon
                points={radarPoints}
                fill="url(#cpis-fill-v2)"
                stroke="url(#cpis-stroke-v2)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                filter="url(#neon-glow)"
              />
              <polygon
                points={dimensions.map((d, i) => {
                  const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
                  const r = Math.max(4, (d.rawScore / 100) * maxR * 0.6);
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ')}
                fill="rgba(56,189,248,0.08)"
                stroke="none"
              />
            </>
          )}

          {/* Data points — bright neon dots */}
          {dimensions.map((d, i) => {
            const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
            const r = Math.max(6, (d.rawScore / 100) * maxR);
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            return (
              <g key={`pt-${d.code}`}>
                <circle cx={px} cy={py} r="8" fill={neonColors[i]} opacity="0.2" />
                <circle cx={px} cy={py} r="4.5" fill={neonColors[i]} stroke="white" strokeWidth="2" filter="url(#soft-glow)" />
              </g>
            );
          })}

          {/* Dimension labels — stacked: score + code at single anchor point */}
          {dimensions.map((d, i) => {
            const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
            const labelR = maxR + 40;
            const x = cx + labelR * Math.cos(angle);
            const y = cy + labelR * Math.sin(angle);
            return (
              <g key={`lbl-${d.code}`}>
                <text
                  x={x} y={y - 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255,255,255,0.85)"
                  fontSize="14"
                  fontWeight="700"
                >
                  {Math.round(d.rawScore)}
                </text>
                <text
                  x={x} y={y + 9}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={neonColors[i]}
                  fontSize="12"
                  fontWeight="800"
                  style={{ textShadow: `0 0 8px ${neonColors[i]}80` }}
                >
                  {d.code}
                </text>
              </g>
            );
          })}

          {/* Center orb — dark glass with score */}
          <circle cx={cx} cy={cy} r="44" fill="rgba(0,0,0,0.6)" stroke="url(#cpis-stroke-v2)" strokeWidth="2.5" filter="url(#soft-glow)" />
          <circle cx={cx} cy={cy} r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize="38" fontWeight="800"
            style={{ textShadow: '0 0 16px rgba(56,189,248,0.6)' }}
          >
            {Math.round(score)}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="central"
            fill="rgba(147,197,253,0.95)" fontSize="13" fontWeight="700" letterSpacing="3"
          >
            CPIS
          </text>
        </svg>
      </div>

      {/* Grade + Stars + Trajectory row */}
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
          {trajIcon} {trajectory.direction}
        </span>
      </div>

      {/* Rank label */}
      <p className="text-white text-base font-bold tracking-wider uppercase text-center"
        style={{ textShadow: '0 0 12px rgba(139,92,246,0.4)' }}
      >
        {rankLabel}
      </p>

      {/* Confidence bar */}
      <div className="w-full max-w-[250px] mx-auto">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-cyan-300/70 font-semibold">{Math.round(confidence.lowerBound)}</span>
          <span className="font-bold text-white/80">{Math.round(confidence.level * 100)}% conf.</span>
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
