import { useQuery } from '@tanstack/react-query';
import {
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BoltIcon,
  TrophyIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

import { goalsApi, reviewsApi, feedbackApi, performanceMathApi, oneOnOnesApi, type Goal, type OneOnOne } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CalendarPlanner } from '@/components/calendar';

// ─── Animated SVG Components ────────────────────────────────────────────────
const AnimatedWaves = () => (
  <svg className="absolute bottom-0 left-0 w-full h-24 opacity-20" viewBox="0 0 1440 120" preserveAspectRatio="none">
    <path
      className="animate-pulse"
      fill="currentColor"
      d="M0,64L48,69.3C96,75,192,85,288,90.7C384,96,480,96,576,85.3C672,75,768,53,864,48C960,43,1056,53,1152,58.7C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
    />
  </svg>
);

const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl animate-pulse" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-violet-400/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    {/* 3D floating particles */}
    <div className="absolute top-20 left-[10%] w-2 h-2 bg-white/50 rounded-full animate-levitate" style={{ animationDuration: '3s' }} />
    <div className="absolute top-40 left-[20%] w-3 h-3 bg-cyan-300/50 rounded-full animate-levitate" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
    <div className="absolute top-32 right-[15%] w-2 h-2 bg-violet-300/50 rounded-full animate-levitate" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
    <div className="absolute bottom-20 right-[25%] w-4 h-4 bg-emerald-300/40 rounded-full animate-levitate" style={{ animationDuration: '4.5s', animationDelay: '0.3s' }} />
    <div className="absolute top-1/2 left-[40%] w-1.5 h-1.5 bg-white/30 rounded-full animate-levitate" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
    <div className="absolute top-[20%] right-[35%] w-2.5 h-2.5 bg-primary-300/40 rounded-full animate-levitate" style={{ animationDuration: '3.8s', animationDelay: '2s' }} />
  </div>
);

/** CPIS Score Display — vivid neon radar + central score orb */
const CPISScoreDisplay = ({
  score, grade, starRating, rankLabel, dimensions, confidence, trajectory,
}: {
  score: number; grade: string; starRating: number; rankLabel: string;
  dimensions: Array<{ code: string; rawScore: number; weight: number; name: string }>;
  confidence: { level: number; lowerBound: number; upperBound: number };
  trajectory: { direction: string; slope: number };
}) => {
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
  const trajIcon = trajectory.direction === 'improving' ? '▲' : trajectory.direction === 'declining' ? '▼' : '●';
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

// ─── Risk badge helper ──────────────────────────────────────────────────────
function riskBadge(level: string) {
  const map: Record<string, { color: string; bg: string }> = {
    LOW: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    MEDIUM: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    HIGH: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
    CRITICAL: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
  };
  const s = map[level] || map.MEDIUM;
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', s.color, s.bg)}>
      {level}
    </span>
  );
}

function ratingStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <StarIcon
          key={i}
          className={clsx('w-4 h-4', i <= Math.round(rating) ? 'text-amber-400' : 'text-secondary-300 dark:text-secondary-600')}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-secondary-700 dark:text-secondary-300">{rating.toFixed(1)}</span>
    </div>
  );
}

const MANAGER_ROLES = ['Super Admin', 'SUPER_ADMIN', 'HR_ADMIN', 'HR Admin', 'MANAGER', 'Manager', 'ADMIN', 'Tenant Admin', 'TENANT_ADMIN'];

// ─── Upcoming 1-on-1 Meetings Widget ─────────────────────────────────────────
function UpcomingOneOnOnes() {
  const { user } = useAuthStore();
  const { data: upcoming } = useQuery({
    queryKey: ['one-on-ones-upcoming'],
    queryFn: () => oneOnOnesApi.getUpcoming(),
  });

  if (!upcoming || upcoming.length === 0) return null;

  return (
    <div className="glass-deep rounded-2xl overflow-hidden">
      <div className="card-header bg-gradient-to-r from-teal-50/80 to-cyan-50/50 dark:from-teal-500/[0.06] dark:to-cyan-500/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg group-hover:shadow-glow-accent transition-shadow duration-300">
              <CalendarDaysIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Upcoming 1-on-1s</h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Your next scheduled meetings</p>
            </div>
          </div>
          <a href="/one-on-ones" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
            View all →
          </a>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          {upcoming.slice(0, 3).map((meeting: OneOnOne) => {
            const otherPerson = meeting.managerId === user?.id ? meeting.employee : meeting.manager;
            const meetingDate = new Date(meeting.scheduledAt);
            const isToday = new Date().toDateString() === meetingDate.toDateString();

            return (
              <a
                key={meeting.id}
                href={`/one-on-ones/${meeting.id}`}
                className="flex items-center gap-4 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-md transition-all border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
              >
                <div className={clsx(
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm',
                  isToday ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-secondary-400 to-secondary-500'
                )}>
                  {otherPerson.firstName[0]}{otherPerson.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                    {otherPerson.firstName} {otherPerson.lastName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                    <span>{isToday ? 'Today' : meetingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>·</span>
                    <span>{meetingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    <span>·</span>
                    <span>{meeting.duration} min</span>
                  </div>
                  {meeting.agenda && meeting.agenda.length > 0 && (
                    <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5 truncate">
                      {meeting.agenda[0].topic}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {isToday && (
                    <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full px-2 py-0.5 text-xs font-medium">
                      Today
                    </span>
                  )}
                  {meeting.status === 'IN_PROGRESS' && (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 text-xs font-medium animate-pulse">
                      Live
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuthStore();
  const isManager = (user?.roles ?? []).some((r) => MANAGER_ROLES.includes(r));

  // ── Real data queries ──────────────────────────────────────────────────
  const { data: goalsData } = useQuery({
    queryKey: ['my-goals'],
    queryFn: () => goalsApi.getMyGoals({ status: 'ACTIVE' }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewsApi.listMyReviews({ asReviewee: true }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: feedbackData } = useQuery({
    queryKey: ['received-feedback'],
    queryFn: () => feedbackApi.listReceived({ page: 1 }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── Math engine query: real computed performance score ──────────────────
  const { data: perfScore, isLoading: perfLoading } = useQuery({
    queryKey: ['performance-score', user?.id],
    queryFn: () => performanceMathApi.getScore(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: 1,
  });

  // ── CPIS query: Comprehensive Performance Intelligence Score ──────────
  const { data: cpisData } = useQuery({
    queryKey: ['cpis-score', user?.id],
    queryFn: () => performanceMathApi.getCPIS(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Goal risk for each goal ────────────────────────────────────────────
  const goalIds = goalsData?.data?.map((g: any) => g.id) || [];
  const { data: goalRisks } = useQuery({
    queryKey: ['goal-risks', goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return [];
      const results = await Promise.allSettled(
        goalIds.slice(0, 5).map((id: string) => performanceMathApi.getGoalRisk(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
    },
    enabled: goalIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Goal mappings (task-to-goal) ───────────────────────────────────────
  const { data: goalMappings } = useQuery({
    queryKey: ['goal-mappings', goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return [];
      const results = await Promise.allSettled(
        goalIds.slice(0, 5).map((id: string) => performanceMathApi.getGoalMapping(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
    },
    enabled: goalIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Team goal tree for manager cascade overview ──────────────────────
  const { data: teamTreeData } = useQuery({
    queryKey: ['goals-team-tree-dashboard'],
    queryFn: () => goalsApi.getTeamTree(),
    enabled: isManager,
    staleTime: 60_000,
  });

  // ── Derived values ─────────────────────────────────────────────────────
  const overallScore = cpisData?.score ?? perfScore?.overallScore ?? 0;
  const derivedRating = cpisData?.starRating ?? perfScore?.derivedRating ?? 0;
  const confidence = cpisData?.confidence?.level ?? perfScore?.confidence ?? 0;
  const goalAttainment = perfScore?.goalAttainment ?? 0;
  const reviewScoreVal = perfScore?.reviewScore ?? 0;
  const feedbackScoreVal = perfScore?.feedbackScore ?? 0;
  const percentile = perfScore?.percentile;
  const cpisGrade = cpisData?.grade ?? '';
  const cpisRankLabel = cpisData?.rankLabel ?? '';
  const cpisDimensions: Array<{ code: string; rawScore: number; weight: number; name: string }> = cpisData?.dimensions ?? [];
  const cpisTrajectory = cpisData?.trajectory ?? { direction: 'stable', slope: 0 };
  const cpisConfidence = cpisData?.confidence ?? { level: 0, lowerBound: 0, upperBound: 100, dataPoints: 0 };

  const avgProgress = goalsData?.data?.length > 0
    ? Math.round(goalsData.data.reduce((sum: number, g: any) => sum + g.progress, 0) / goalsData.data.length)
    : 0;

  const atRiskGoals = goalRisks?.filter((r: any) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL') || [];
  const pendingReviews = reviewsData?.filter((r: any) => r.status === 'NOT_STARTED' || r.status === 'IN_PROGRESS') || [];

  // ── Build real activity from actual DB data ────────────────────────────
  const recentActivity: Array<{ icon: any; color: string; title: string; desc: string; time: string }> = [];

  // Add completed goals
  goalsData?.data?.filter((g: any) => g.progress >= 100).slice(0, 2).forEach((g: any) => {
    recentActivity.push({
      icon: CheckCircleIcon,
      color: 'emerald',
      title: 'Goal completed',
      desc: g.title,
      time: g.dueDate ? `Due ${new Date(g.dueDate).toLocaleDateString()}` : 'Completed',
    });
  });

  // Add recent feedback
  feedbackData?.data?.slice(0, 2).forEach((f: any) => {
    recentActivity.push({
      icon: ChatBubbleLeftRightIcon,
      color: 'primary',
      title: f.type === 'PRAISE' ? 'Praise received' : 'Feedback received',
      desc: f.isAnonymous ? 'Anonymous feedback' : `From ${f.fromUser?.firstName || 'Someone'} ${f.fromUser?.lastName || ''}`,
      time: new Date(f.createdAt).toLocaleDateString(),
    });
  });

  // Add pending reviews
  pendingReviews.slice(0, 1).forEach((r: any) => {
    recentActivity.push({
      icon: ClipboardDocumentCheckIcon,
      color: 'violet',
      title: 'Review pending',
      desc: r.cycle?.name || 'Review cycle',
      time: r.type === 'SELF' ? 'Self assessment' : `Review for ${r.reviewee?.firstName || 'team member'}`,
    });
  });

  // Add at-risk goals
  atRiskGoals.slice(0, 1).forEach((r: any) => {
    recentActivity.push({
      icon: ExclamationTriangleIcon,
      color: 'amber',
      title: `Goal at ${r.riskLevel} risk`,
      desc: r.goalTitle || 'Goal requires attention',
      time: `${r.riskScore}% risk score`,
    });
  });

  // Fallback if no activity
  if (recentActivity.length === 0) {
    recentActivity.push({
      icon: SparklesIcon,
      color: 'primary',
      title: 'Welcome!',
      desc: 'Start creating goals and requesting feedback to see your activity here.',
      time: 'Just now',
    });
  }

  // ── Stats computed from math engine ────────────────────────────────────
  const stats = [
    {
      name: 'Active Goals',
      value: goalsData?.data?.length ?? 0,
      icon: FlagIcon,
      change: atRiskGoals.length > 0
        ? `${atRiskGoals.length} at risk`
        : goalsData?.data?.length ? `${avgProgress}% avg progress` : 'No goals yet',
      changeType: atRiskGoals.length > 0 ? 'negative' : 'positive',
      gradient: 'from-blue-500 to-cyan-400',
      bgGradient: 'from-blue-500/10 to-cyan-400/10',
      iconBg: 'bg-blue-500',
    },
    {
      name: 'Pending Reviews',
      value: pendingReviews.length,
      icon: ClipboardDocumentCheckIcon,
      change: pendingReviews.length > 0 ? 'Action needed' : 'All complete',
      changeType: pendingReviews.length > 0 ? 'neutral' : 'positive',
      gradient: 'from-violet-500 to-purple-400',
      bgGradient: 'from-violet-500/10 to-purple-400/10',
      iconBg: 'bg-violet-500',
    },
    {
      name: 'Feedback Received',
      value: feedbackData?.meta?.total ?? 0,
      icon: ChatBubbleLeftRightIcon,
      change: feedbackScoreVal > 0 ? `Sentiment: ${Math.round(feedbackScoreVal)}/100` : 'No feedback yet',
      changeType: feedbackScoreVal >= 60 ? 'positive' : feedbackScoreVal >= 40 ? 'neutral' : 'negative',
      gradient: 'from-emerald-500 to-teal-400',
      bgGradient: 'from-emerald-500/10 to-teal-400/10',
      iconBg: 'bg-emerald-500',
    },
    {
      name: 'CPIS Score',
      value: perfLoading ? '...' : Math.round(overallScore),
      suffix: '/100',
      icon: TrophyIcon,
      change: cpisData
        ? `${cpisGrade} · ${cpisRankLabel}`
        : perfScore
        ? `${confidence >= 0.7 ? 'High' : confidence >= 0.4 ? 'Medium' : 'Low'} confidence (${Math.round(confidence * 100)}%)`
        : 'Computing...',
      changeType: overallScore >= 70 ? 'positive' : overallScore >= 50 ? 'neutral' : 'negative',
      gradient: 'from-amber-500 to-orange-400',
      bgGradient: 'from-amber-500/10 to-orange-400/10',
      iconBg: 'bg-amber-500',
    },
  ];

  // ── Build real achievement badges from computed data ────────────────────
  const achievements: Array<{ icon: any; label: string; color: string; bg: string }> = [];
  if (cpisGrade === 'A+' || cpisGrade === 'A') achievements.push({ icon: TrophyIcon, label: cpisGrade === 'A+' ? 'Elite Grade A+' : 'Grade A', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' });
  else if (overallScore >= 80) achievements.push({ icon: TrophyIcon, label: 'Top Performer', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' });
  if (cpisDimensions.find((d: any) => d.code === 'GAI' && d.rawScore >= 85)) achievements.push({ icon: FlagIcon, label: 'Goal Crusher', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' });
  else if (goalAttainment >= 90) achievements.push({ icon: FlagIcon, label: 'Goal Crusher', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' });
  if (cpisDimensions.find((d: any) => d.code === 'CIS' && d.rawScore >= 70)) achievements.push({ icon: UserGroupIcon, label: 'Team Player', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' });
  else if (feedbackScoreVal >= 70) achievements.push({ icon: ChatBubbleLeftRightIcon, label: 'Well Regarded', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' });
  if (cpisDimensions.find((d: any) => d.code === 'GTS' && d.rawScore >= 70)) achievements.push({ icon: ArrowTrendingUpIcon, label: 'Growth Mindset', color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' });
  else if (reviewScoreVal >= 80) achievements.push({ icon: StarIcon, label: 'Review Star', color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' });
  if (cpisTrajectory.direction === 'improving') achievements.push({ icon: RocketLaunchIcon, label: 'Trending Up', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' });
  if (atRiskGoals.length === 0 && (goalsData?.data?.length ?? 0) > 0) achievements.push({ icon: ShieldCheckIcon, label: 'On Track', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // ── Helper to get risk for a specific goal ─────────────────────────────
  const getRiskForGoal = (goalId: string) => goalRisks?.find((r: any) => r.goalId === goalId);
  const getMappingForGoal = (goalId: string) => goalMappings?.find((m: any) => m.goalId === goalId);

  return (
    <div className="space-y-8 pb-8">
      {/* ═══════════════════ Hero Section ═══════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-accent-600 p-8 text-white shadow-2xl shine-sweep">
        <FloatingOrbs />
        <AnimatedWaves />

        {/* Glassmorphism overlay layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />

        <div className="absolute top-6 right-6 opacity-20">
          <div className="relative animate-float-3d">
            <RocketLaunchIcon className="w-20 h-20" />
          </div>
        </div>
        <div className="absolute bottom-20 right-40 opacity-15">
          <SparklesIcon className="w-14 h-14 animate-spin-slow" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
              <CalendarDaysIcon className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-3 text-shimmer">
              {getGreeting()}, {user?.firstName}!
              <span className="inline-block ml-3 animate-bounce" style={{ animationDuration: '2s' }}>
                {overallScore >= 80 ? '🚀' : overallScore >= 50 ? '👋' : '💪'}
              </span>
            </h1>
            <p className="text-white/90 text-lg max-w-xl leading-relaxed">
              {cpisData
                ? overallScore >= 80
                  ? `Outstanding! You're ranked as "${cpisRankLabel}" with a ${cpisGrade} grade across 8 performance dimensions.`
                  : overallScore >= 60
                  ? `${cpisRankLabel} — CPIS ${Math.round(overallScore)}/100. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : 'Keep building momentum!'}`
                  : `CPIS ${Math.round(overallScore)}/100 — ${cpisRankLabel}. Focus on your growth areas to improve your score.`
                : perfScore
                ? `Performance Score: ${Math.round(perfScore.overallScore)}/100. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : 'Keep it up!'}`
                : 'Computing your Comprehensive Performance Intelligence Score...'}
            </p>

            {/* Real Achievement Badges (earned from math engine) */}
            {achievements.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mt-5">
                {achievements.map((achievement, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3.5 py-1.5 hover:bg-white/20 transition-all duration-300 cursor-pointer group border border-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] elastic-scale"
                  >
                    <achievement.icon className="w-4 h-4 text-white group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                    <span className="text-xs font-semibold">{achievement.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Snapshot — 3 mini stat cards to fill the left side */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <FlagIcon className="w-4 h-4 text-cyan-300" />
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wide">Goals</span>
                </div>
                <p className="text-2xl font-bold text-white">{goalsData?.data?.length ?? 0}</p>
                <p className="text-xs text-white/50 mt-0.5">{avgProgress}% avg progress</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-300" />
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wide">Feedback</span>
                </div>
                <p className="text-2xl font-bold text-white">{feedbackData?.meta?.total ?? 0}</p>
                <p className="text-xs text-white/50 mt-0.5">{feedbackScoreVal > 0 ? `${Math.round(feedbackScoreVal)}/100 sentiment` : 'No data yet'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-violet-300" />
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wide">Reviews</span>
                </div>
                <p className="text-2xl font-bold text-white">{reviewsData?.length ?? 0}</p>
                <p className="text-xs text-white/50 mt-0.5">{pendingReviews.length > 0 ? `${pendingReviews.length} pending` : 'All complete'}</p>
              </div>
            </div>

            {/* CPIS Top Dimensions — horizontal mini-bars */}
            {cpisDimensions.length > 0 && (
              <div className="mt-5 space-y-2.5">
                <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Performance Dimensions</p>
                {cpisDimensions.slice(0, 4).map((dim: any, i: number) => {
                  const barColors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24'];
                  return (
                    <div key={dim.code} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white/70 w-8 text-right">{dim.code}</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.min(100, dim.rawScore)}%`,
                            backgroundColor: barColors[i],
                            boxShadow: `0 0 6px ${barColors[i]}60`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white/80 w-8">{Math.round(dim.rawScore)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CPIS Score Visualization — 8-dimension radar chart */}
          <div className="flex-shrink-0 flex flex-col items-center bg-black/20 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_24px_60px_-10px_rgba(0,0,0,0.5)] hover:bg-black/25 transition-all duration-500 lg:max-w-[400px]">
            {cpisData ? (
              <CPISScoreDisplay
                score={overallScore}
                grade={cpisGrade}
                starRating={derivedRating}
                rankLabel={cpisRankLabel}
                dimensions={cpisDimensions}
                confidence={cpisConfidence}
                trajectory={cpisTrajectory}
              />
            ) : perfLoading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                <p className="text-white/60 text-sm">Computing CPIS...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="text-4xl font-bold text-white">{Math.round(overallScore)}</div>
                <p className="text-white/60 text-sm">Performance Score</p>
                {percentile !== null && percentile > 0 && (
                  <p className="text-white/50 text-xs">Top {Math.max(1, 100 - percentile)}%</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ CPIS Dimension Breakdown ═══════════════════ */}
      {cpisDimensions.length > 0 && (
        <div className="glass-deep rounded-2xl overflow-hidden depth-shadow">
          <div className="card-header bg-gradient-to-r from-cyan-50/80 to-violet-50/50 dark:from-cyan-500/[0.06] dark:to-violet-500/[0.03]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl shadow-lg">
                  <BeakerIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">CPIS Dimensions</h2>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">8-dimensional performance intelligence breakdown</p>
                </div>
              </div>
              {cpisData?.confidence && (
                <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400 bg-secondary-100 dark:bg-white/5 px-3 py-1 rounded-full">
                  {cpisData.confidence.dataPoints} data points
                </span>
              )}
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(() => {
                const dimColors = [
                  'from-blue-500 to-cyan-400',
                  'from-violet-500 to-purple-400',
                  'from-emerald-500 to-teal-400',
                  'from-amber-500 to-orange-400',
                  'from-rose-500 to-pink-400',
                  'from-indigo-500 to-blue-400',
                  'from-teal-500 to-cyan-400',
                  'from-fuchsia-500 to-violet-400',
                ];
                const dimIcons = [FlagIcon, ClipboardDocumentCheckIcon, ChatBubbleLeftRightIcon, UserGroupIcon, ShieldCheckIcon, ArrowTrendingUpIcon, LightBulbIcon, RocketLaunchIcon];
                return cpisDimensions.map((dim: any, index: number) => {
                  const gradeColor = dim.grade === 'A+' || dim.grade === 'A' ? 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'
                    : dim.grade === 'B+' || dim.grade === 'B' ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
                    : dim.grade === 'C+' || dim.grade === 'C' ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/30'
                    : 'text-red-500 bg-red-100 dark:bg-red-900/30';
                  const IconComp = dimIcons[index] || BeakerIcon;
                  return (
                    <div
                      key={dim.code}
                      className="group relative p-4 rounded-xl bg-secondary-50/80 dark:bg-secondary-800/40 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700 cascade-in"
                      style={{ animationDelay: `${index * 0.06}s` }}
                    >
                      {/* Top accent */}
                      <div className={clsx('absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity', dimColors[index])} />
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className={clsx('p-1.5 rounded-lg bg-gradient-to-br shadow-sm', dimColors[index])}>
                            <IconComp className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-secondary-700 dark:text-secondary-300 block leading-tight">{dim.name}</span>
                            <span className="text-[9px] text-secondary-400 dark:text-secondary-500">{Math.round(dim.weight * 100)}% weight</span>
                          </div>
                        </div>
                        <span className={clsx('text-[10px] font-black px-1.5 py-0.5 rounded', gradeColor)}>
                          {dim.grade}
                        </span>
                      </div>
                      <div className="flex items-end gap-1 mb-2">
                        <span className="text-2xl font-bold text-secondary-900 dark:text-white">{Math.round(dim.rawScore)}</span>
                        <span className="text-xs text-secondary-400 mb-0.5">/100</span>
                      </div>
                      <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700/60 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', dimColors[index])}
                          style={{ width: `${Math.min(100, dim.rawScore)}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Strengths & Growth Areas */}
            {(cpisData?.strengths?.length > 0 || cpisData?.growthAreas?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-secondary-200/60 dark:border-secondary-700/40">
                {cpisData.strengths?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 shadow-sm">
                      <TrophyIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Top Strengths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cpisData.strengths.map((s: string) => (
                          <span key={s} className="text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {cpisData.growthAreas?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 shadow-sm">
                      <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Growth Areas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cpisData.growthAreas.map((g: string) => (
                          <span key={g} className="text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{g}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ Legacy Performance Breakdown (when CPIS not available) ═══════════════════ */}
      {!cpisDimensions.length && perfScore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-container">
          {[
            { label: 'Goal Attainment', value: Math.round(goalAttainment), weight: perfScore.weights.goals, color: 'from-blue-500 to-cyan-400', icon: FlagIcon },
            { label: 'Review Score', value: Math.round(reviewScoreVal), weight: perfScore.weights.reviews, color: 'from-violet-500 to-purple-400', icon: ClipboardDocumentCheckIcon },
            { label: 'Feedback Sentiment', value: Math.round(feedbackScoreVal), weight: perfScore.weights.feedback, color: 'from-emerald-500 to-teal-400', icon: ChatBubbleLeftRightIcon },
            { label: 'Overall Score', value: Math.round(perfScore.overallScore), weight: 1.0, color: 'from-amber-500 to-orange-400', icon: BeakerIcon },
          ].map((item, index) => (
            <div
              key={item.label}
              className="glass-stat p-5 cascade-in holo-shimmer magnetic-glow"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={clsx('p-1.5 rounded-lg bg-gradient-to-br', item.color)}>
                      <item.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-secondary-400 dark:text-secondary-500 bg-secondary-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                    {Math.round(item.weight * 100)}%
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-secondary-900 dark:text-white">{item.value}</span>
                  <span className="text-sm text-secondary-400 mb-0.5">/100</span>
                </div>
                <div className="mt-3 h-1.5 bg-secondary-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', item.color)}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ Stats Grid ═══════════════════ */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 perspective-container">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="group glass-stat card-3d-tilt p-6 cursor-pointer cascade-in spotlight-reveal frosted-noise"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Top gradient line */}
            <div className={clsx('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500', stat.gradient)} />

            {/* Background orb */}
            <div className={clsx('absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-125 transition-all duration-700', stat.gradient)} />

            <div className="relative z-10">
              <div className={clsx('inline-flex p-3 rounded-xl shadow-lg mb-4 group-hover:scale-110 group-hover:shadow-xl transition-all duration-300', stat.iconBg)}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">{stat.name}</p>
              <p className="text-3xl font-bold text-secondary-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left duration-300 counter-reveal">
                {stat.value}
                {stat.suffix && <span className="text-lg text-secondary-400">{stat.suffix}</span>}
              </p>
              <div className="mt-4 flex items-center gap-2">
                {stat.changeType === 'positive' && <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />}
                {stat.changeType === 'negative' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
                <span className={clsx(
                  'text-sm font-medium',
                  stat.changeType === 'positive' && 'text-emerald-600 dark:text-emerald-400',
                  stat.changeType === 'negative' && 'text-red-600 dark:text-red-400',
                  stat.changeType === 'neutral' && 'text-secondary-500 dark:text-secondary-400'
                )}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ═══════════════════ Goals with Risk Indicators ═══════════════════ */}
        <div className="lg:col-span-2 glass-deep rounded-2xl overflow-hidden group depth-shadow holo-shimmer">
          <div className="card-header flex items-center justify-between bg-gradient-to-r from-secondary-50/80 to-secondary-100/50 dark:from-white/[0.02] dark:to-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 group-hover:shadow-glow-sm transition-all duration-300">
                <FlagIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">My Goals</h2>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">
                  {goalMappings && goalMappings.length > 0
                    ? `Composite scores computed from ${goalMappings.reduce((s: number, m: any) => s + (m.childGoals?.length || 0), 0)} sub-goals`
                    : 'Mathematical risk assessment per goal'}
                </p>
              </div>
            </div>
            <a href="/goals" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 group/link neon-underline">
              View all
              <span className="group-hover/link:translate-x-1 transition-transform">→</span>
            </a>
          </div>
          <div className="card-body">
            {goalsData?.data?.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/30 dark:to-cyan-900/30 rounded-full animate-pulse" />
                  <div className="absolute inset-2 bg-white dark:bg-secondary-800 rounded-full flex items-center justify-center">
                    <FlagIcon className="w-10 h-10 text-secondary-300 dark:text-secondary-600" />
                  </div>
                </div>
                <p className="text-secondary-500 dark:text-secondary-400 mb-2">No active goals yet</p>
                <a href="/goals" className="btn-primary inline-flex gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  Create your first goal
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {goalsData?.data?.slice(0, 5).map((goal: any) => {
                  const risk = getRiskForGoal(goal.id);
                  const mapping = getMappingForGoal(goal.id);
                  return (
                    <div
                      key={goal.id}
                      className="group/item relative p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-primary-500 to-cyan-500"
                        style={{ opacity: goal.progress / 100 }}
                      />

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0 pl-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                              {goal.title}
                            </h3>
                            {risk && riskBadge(risk.riskLevel)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <CalendarDaysIcon className="w-3 h-3" />
                              Due {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'No date'}
                            </span>
                            {risk && risk.daysRemaining > 0 && (
                              <span>{risk.daysRemaining}d remaining</span>
                            )}
                            {mapping && mapping.compositeScore > 0 && (
                              <span className="text-primary-600 dark:text-primary-400 font-medium">
                                Composite: {mapping.compositeScore}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {goal.progress >= 100 && (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                          )}
                          <span className={clsx(
                            'text-lg font-bold',
                            goal.progress >= 100 ? 'text-emerald-500' : 'text-secondary-900 dark:text-white'
                          )}>
                            {goal.progress}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden ml-3">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden',
                            goal.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : goal.progress >= 70 ? 'bg-gradient-to-r from-primary-500 to-cyan-400'
                              : goal.progress >= 30 ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                              : 'bg-gradient-to-r from-rose-500 to-pink-400'
                          )}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>

                      {/* Risk detail row */}
                      {risk && risk.riskLevel !== 'LOW' && (
                        <div className="mt-2 ml-3 flex items-center gap-4 text-xs">
                          <span className="text-secondary-400">
                            Schedule: <span className="font-medium text-secondary-600 dark:text-secondary-300">{risk.components.scheduleRisk}%</span>
                          </span>
                          <span className="text-secondary-400">
                            Velocity: <span className="font-medium text-secondary-600 dark:text-secondary-300">{risk.components.velocityRisk}%</span>
                          </span>
                          {risk.projectedCompletion < 100 && (
                            <span className="text-orange-500 font-medium">
                              Projected: {Math.round(risk.projectedCompletion)}% at deadline
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ Quick Actions ═══════════════════ */}
        <div className="glass-deep rounded-2xl overflow-hidden depth-shadow">
          <div className="card-header bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-500/[0.06] dark:to-orange-500/[0.03]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg glow-breathe" style={{ animationDuration: '4s' }}>
                <BoltIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Quick Actions</h2>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">Tasks awaiting you</p>
              </div>
            </div>
          </div>
          <div className="card-body space-y-3">
            {pendingReviews.slice(0, 2).map((review: any) => (
              <div
                key={review.id}
                className="group p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow group-hover:scale-110 transition-transform">
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white">
                      {review.type === 'SELF' ? 'Complete self-assessment' : `Review for ${review.reviewee?.firstName}`}
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{review.cycle?.name}</p>
                  </div>
                </div>
                <a href={`/reviews/${review.id}`} className="btn-primary text-xs mt-3 w-full justify-center group-hover:shadow-lg">
                  Start Review
                </a>
              </div>
            ))}

            {/* At-risk goals as action items */}
            {atRiskGoals.slice(0, 2).map((risk: any) => {
              const goalTitle = goalsData?.data?.find((g: any) => g.id === risk.goalId)?.title || 'Goal needs attention';
              const velocity = risk.requiredVelocity;
              const velocityText = !velocity || !isFinite(velocity) || velocity >= 999
                ? 'Past due — immediate action needed'
                : `Needs ${velocity.toFixed(1)}%/day to finish on time`;
              return (
                <div
                  key={risk.goalId}
                  className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow">
                      <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{goalTitle}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        Risk: {risk.riskScore}% &bull; {velocityText}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {pendingReviews.length === 0 && atRiskGoals.length === 0 && (
              <div className="text-center py-8">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full animate-pulse" />
                  <div className="absolute inset-1 bg-white dark:bg-secondary-800 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>
                <p className="text-secondary-900 dark:text-white font-medium">All caught up!</p>
                <p className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">No pending tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ Upcoming 1-on-1 Meetings ═══════════════════ */}
      <UpcomingOneOnOnes />

      {/* Calendar Planner */}
      <CalendarPlanner />

      {/* ═══════════════════ Manager Goal Cascade Overview ═══════════════════ */}
      {isManager && teamTreeData && teamTreeData.length > 0 && (() => {
        // Compute cascade stats
        const countAll = (goals: Goal[]): { total: number; completed: number; progressSum: number; owners: Set<string> } => {
          const result = { total: 0, completed: 0, progressSum: 0, owners: new Set<string>() };
          const walk = (gs: Goal[]) => {
            for (const g of gs) {
              result.total++;
              result.progressSum += g.progress;
              if (g.progress >= 100 || g.status === 'COMPLETED') result.completed++;
              if (g.owner?.id) result.owners.add(g.owner.id);
              if (g.childGoals && g.childGoals.length > 0) walk(g.childGoals);
            }
          };
          walk(goals);
          return result;
        };
        const cascadeStats = countAll(teamTreeData);
        const avgTeamProgress = cascadeStats.total > 0 ? Math.round(cascadeStats.progressSum / cascadeStats.total) : 0;

        return (
          <div className="glass-deep rounded-2xl overflow-hidden morph-border depth-shadow">
            <div className="card-header bg-gradient-to-r from-purple-50/80 to-violet-50/50 dark:from-purple-500/[0.06] dark:to-violet-500/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl shadow-lg shadow-primary-500/20">
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Goal Cascade Overview</h2>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      Cascading goals across your team
                    </p>
                  </div>
                </div>
                <a href="/goals" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
                  View tree →
                </a>
              </div>
            </div>
            <div className="card-body">
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-purple-50 dark:bg-purple-500/[0.08] border-purple-100 dark:border-purple-500/10">
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{cascadeStats.total}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Total Goals</p>
                </div>
                <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-emerald-50 dark:bg-emerald-500/[0.08] border-emerald-100 dark:border-emerald-500/10">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{cascadeStats.completed}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Completed</p>
                </div>
                <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-blue-50 dark:bg-blue-500/[0.08] border-blue-100 dark:border-blue-500/10">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{avgTeamProgress}%</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Avg Progress</p>
                </div>
                <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-amber-50 dark:bg-amber-500/[0.08] border-amber-100 dark:border-amber-500/10">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{cascadeStats.owners.size}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Team Members</p>
                </div>
              </div>

              {/* Top-level cascaded goals */}
              <div className="space-y-3">
                {teamTreeData.slice(0, 5).map((goal: Goal) => {
                  const childCount = goal.childGoals?.length || 0;
                  return (
                    <a
                      key={goal.id}
                      href={`/goals/${goal.id}`}
                      className="block p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-md transition-all border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={clsx(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                            goal.type === 'COMPANY' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : goal.type === 'DEPARTMENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : goal.type === 'TEAM' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                              : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                          )}>
                            {goal.type?.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-medium text-secondary-900 dark:text-white truncate">{goal.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {childCount > 0 && (
                            <span className="text-xs text-secondary-400 dark:text-secondary-500">
                              {childCount} sub-goal{childCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="text-sm font-bold text-secondary-900 dark:text-white">{goal.progress}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-500',
                            goal.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : goal.progress >= 50 ? 'bg-gradient-to-r from-primary-500 to-cyan-400'
                              : 'bg-gradient-to-r from-amber-500 to-orange-400'
                          )}
                          style={{ width: `${Math.min(goal.progress, 100)}%` }}
                        />
                      </div>
                      {/* Show owner if different from current user */}
                      {goal.owner && goal.owner.id !== user?.id && (
                        <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1.5">
                          Owner: {goal.owner.firstName} {goal.owner.lastName}
                        </p>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════ Real Activity Timeline ═══════════════════ */}
      <div className="glass-deep rounded-2xl overflow-hidden depth-shadow frosted-noise">
        <div className="card-header bg-gradient-to-r from-secondary-50/80 to-secondary-100/50 dark:from-white/[0.02] dark:to-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-primary-500/20">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Recent Activity</h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Real events from your data</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="space-y-1">
            {recentActivity.map((item, index) => (
              <div key={index} className="flex gap-4 group p-3 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors cursor-pointer cascade-in" style={{ animationDelay: `${index * 0.08}s` }}>
                <div className="relative">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg',
                    item.color === 'emerald' && 'bg-gradient-to-br from-emerald-500 to-teal-500',
                    item.color === 'primary' && 'bg-gradient-to-br from-primary-500 to-cyan-500',
                    item.color === 'violet' && 'bg-gradient-to-br from-violet-500 to-purple-500',
                    item.color === 'amber' && 'bg-gradient-to-br from-amber-500 to-orange-500'
                  )}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  {index < recentActivity.length - 1 && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-secondary-300 to-transparent dark:from-secondary-600" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{item.title}</p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">{item.desc}</p>
                  <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
