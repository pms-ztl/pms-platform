/**
 * SwarmOverview - Mode 1 of the Neural Swarm UI
 *
 * A visual dashboard showing all 70 AI agents organized into 6 clusters
 * with a neural-network-style visualization. Features:
 *
 * - Hero stat cards (glassmorphism)
 * - Hexagonal neural network SVG with animated connections
 * - Cluster cards grid with expandable agent chips
 * - Live activity feed (simulated swarm chatter)
 *
 * Reads everything from `useAIWorkspaceStore` (no props).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CpuChipIcon,
  Square3Stack3DIcon,
  BoltIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
  SignalIcon,
  HeartIcon,
  BookOpenIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { getAgentIcon, type AgentIconComponent } from './agentIconMap';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';
import { aiApi } from '@/lib/api/ai';
import * as T from './ai-theme';

// ── Cluster data ────────────────────────────────────────────

interface ClusterAgent {
  type: string;
  name: string;
}

interface Cluster {
  id: string;
  name: string;
  icon: AgentIconComponent;
  svgLabel: string;
  color: string;
  glow: string;
  textColor: string;
  bgAccent: string;
  borderAccent: string;
  agentCount: number;
  agents: ClusterAgent[];
}

const CLUSTER_DATA: Cluster[] = [
  {
    id: 'core',
    name: 'Core Intelligence',
    icon: CpuChipIcon,
    svgLabel: 'Core',
    color: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/40',
    textColor: 'text-blue-400',
    bgAccent: 'bg-blue-500/10',
    borderAccent: 'border-blue-500/20',
    agentCount: 20,
    agents: [
      { type: 'performance', name: 'Performance' },
      { type: 'nlp_query', name: 'Data Query' },
      { type: 'coaching', name: 'Coaching' },
      { type: 'career', name: 'Career' },
      { type: 'report', name: 'Reports' },
      { type: 'workforce_intel', name: 'Workforce Intel' },
      { type: 'governance', name: 'Governance' },
      { type: 'strategic_alignment', name: 'Strategy' },
      { type: 'talent_marketplace', name: 'Talent Market' },
      { type: 'conflict_resolution', name: 'Conflict' },
      { type: 'security', name: 'Security' },
      { type: 'notification', name: 'Notification' },
      { type: 'onboarding', name: 'Onboarding' },
      { type: 'license', name: 'License' },
      { type: 'excel_validation', name: 'Excel AI' },
      { type: 'goal_intelligence', name: 'Goal Intel' },
      { type: 'performance_signal', name: 'Perf Signal' },
      { type: 'review_drafter', name: 'Review Drafter' },
      { type: 'compensation_promotion', name: 'Comp & Promo' },
      { type: 'one_on_one_advisor', name: '1:1 Advisor' },
    ],
  },
  {
    id: 'bio_performance',
    name: 'Bio-Performance',
    icon: HeartIcon,
    svgLabel: 'Bio',
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/40',
    textColor: 'text-emerald-400',
    bgAccent: 'bg-emerald-500/10',
    borderAccent: 'border-emerald-500/20',
    agentCount: 10,
    agents: [
      { type: 'neuro_focus', name: 'Neuro Focus' },
      { type: 'circadian_sync', name: 'Circadian Sync' },
      { type: 'micro_break', name: 'Micro Break' },
      { type: 'cortisol_monitor', name: 'Cortisol Monitor' },
      { type: 'ergonomics', name: 'Ergonomics' },
      { type: 'sleep_optimizer', name: 'Sleep Optimizer' },
      { type: 'hydration_nutrition', name: 'Hydration' },
      { type: 'vocal_tone', name: 'Vocal Tone' },
      { type: 'environment_ctrl', name: 'Environment' },
      { type: 'burnout_interceptor', name: 'Burnout Guard' },
    ],
  },
  {
    id: 'hyper_learning',
    name: 'Hyper-Learning',
    icon: BookOpenIcon,
    svgLabel: 'Learn',
    color: 'from-purple-500 to-pink-600',
    glow: 'shadow-purple-500/40',
    textColor: 'text-purple-400',
    bgAccent: 'bg-purple-500/10',
    borderAccent: 'border-purple-500/20',
    agentCount: 12,
    agents: [
      { type: 'shadow_learning', name: 'Shadow Learn' },
      { type: 'micro_learning', name: 'Micro Learn' },
      { type: 'ar_mentor', name: 'AR Mentor' },
      { type: 'sparring_partner', name: 'Sparring' },
      { type: 'skill_gap_forecaster', name: 'Skill Forecast' },
      { type: 'knowledge_broker', name: 'Knowledge Broker' },
      { type: 'credential_ledger', name: 'Credentials' },
      { type: 'linguistic_refiner', name: 'Linguistic' },
      { type: 'curiosity_scout', name: 'Curiosity Scout' },
      { type: 'logic_validator', name: 'Logic Check' },
      { type: 'cross_training', name: 'Cross-Training' },
      { type: 'career_sim', name: 'Career Sim' },
    ],
  },
  {
    id: 'liquid_workforce',
    name: 'Liquid Workforce',
    icon: BriefcaseIcon,
    svgLabel: 'Work',
    color: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/40',
    textColor: 'text-amber-400',
    bgAccent: 'bg-amber-500/10',
    borderAccent: 'border-amber-500/20',
    agentCount: 10,
    agents: [
      { type: 'task_bidder', name: 'Task Bidder' },
      { type: 'gig_sourcer', name: 'Gig Sourcer' },
      { type: 'nano_payment', name: 'Nano Payment' },
      { type: 'market_value', name: 'Market Value' },
      { type: 'tax_optimizer', name: 'Tax Optimizer' },
      { type: 'equity_realizer', name: 'Equity' },
      { type: 'pension_guard', name: 'Pension Guard' },
      { type: 'relocation_bot', name: 'Relocation' },
      { type: 'vendor_negotiator', name: 'Vendor Nego' },
      { type: 'succession_sentry', name: 'Succession' },
    ],
  },
  {
    id: 'culture_empathy',
    name: 'Culture & Empathy',
    icon: UserGroupIcon,
    svgLabel: 'Culture',
    color: 'from-pink-500 to-rose-600',
    glow: 'shadow-pink-500/40',
    textColor: 'text-pink-400',
    bgAccent: 'bg-pink-500/10',
    borderAccent: 'border-pink-500/20',
    agentCount: 10,
    agents: [
      { type: 'culture_weaver', name: 'Culture Weaver' },
      { type: 'bias_neutralizer', name: 'Bias Neutralizer' },
      { type: 'gratitude_sentinel', name: 'Gratitude' },
      { type: 'conflict_mediator', name: 'Mediator' },
      { type: 'inclusion_monitor', name: 'Inclusion' },
      { type: 'empathy_coach', name: 'Empathy Coach' },
      { type: 'social_bonding', name: 'Social Bonding' },
      { type: 'legacy_archivist', name: 'Legacy Archive' },
      { type: 'whistleblower', name: 'Whistleblower' },
      { type: 'mood_radiator', name: 'Mood Radiator' },
    ],
  },
  {
    id: 'governance_logic',
    name: 'Governance & Logic',
    icon: ScaleIcon,
    svgLabel: 'Gov',
    color: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/40',
    textColor: 'text-red-400',
    bgAccent: 'bg-red-500/10',
    borderAccent: 'border-red-500/20',
    agentCount: 8,
    agents: [
      { type: 'posh_sentinel', name: 'POSH Sentinel' },
      { type: 'labor_compliance', name: 'Labor Law' },
      { type: 'policy_translator', name: 'Policy Translate' },
      { type: 'data_privacy', name: 'Data Privacy' },
      { type: 'audit_trail', name: 'Audit Trail' },
      { type: 'conflict_of_interest', name: 'COI Detector' },
      { type: 'leave_optimizer', name: 'Leave Optimizer' },
      { type: 'onboarding_orchestrator', name: 'Onboard Orch' },
    ],
  },
];

// ── Live Activity Feed ──────────────────────────────────────

const ACTIVITY_FEED = [
  { agent: 'Neuro Focus', text: 'Analyzed deep work patterns for 12 engineers', cluster: 'bio_performance', time: '2m ago' },
  { agent: 'Burnout Guard', text: 'Flagged 2 at-risk employees in Product team', cluster: 'bio_performance', time: '5m ago' },
  { agent: 'Culture Weaver', text: 'Detected sentiment shift in Engineering dept', cluster: 'culture_empathy', time: '8m ago' },
  { agent: 'Performance', text: 'Generated Q4 bell curve distributions', cluster: 'core', time: '12m ago' },
  { agent: 'Skill Forecast', text: 'Identified 3 emerging skill gaps in AI/ML', cluster: 'hyper_learning', time: '15m ago' },
  { agent: 'Task Bidder', text: 'Matched 7 open tasks to available talent', cluster: 'liquid_workforce', time: '18m ago' },
  { agent: 'POSH Sentinel', text: 'Completed compliance audit for new policy', cluster: 'governance_logic', time: '22m ago' },
  { agent: 'Coaching', text: 'Delivered personalized growth plans to 15 users', cluster: 'core', time: '25m ago' },
  { agent: 'Circadian Sync', text: 'Optimized meeting schedules for 3 teams', cluster: 'bio_performance', time: '30m ago' },
  { agent: 'Bias Neutralizer', text: 'Reviewed 24 performance reviews for bias', cluster: 'culture_empathy', time: '35m ago' },
];

// ── Animated counter hook ───────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      if (current !== start) {
        start = current;
        setCount(current);
      }
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
}

// ── Hero Stat Card ──────────────────────────────────────────

function HeroStatCard({
  icon: Icon,
  value,
  label,
  gradient,
  glowColor,
  theme,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  value: number;
  label: string;
  gradient: string;
  glowColor: string;
  theme: AITheme;
}) {
  const display = useAnimatedCounter(value);

  const cardBg =
    theme === 'light'
      ? 'bg-white/80 border-gray-200/60 shadow-sm'
      : theme === 'dark'
        ? 'bg-white/[0.06] border-white/[0.08]'
        : 'bg-white/[0.03] border-white/[0.05]';

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl border p-5
        backdrop-blur-xl transition-all duration-300
        hover:scale-[1.03] hover:-translate-y-0.5
        ${cardBg}
      `}
      style={{ boxShadow: `0 0 0 0 ${glowColor}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px -4px ${glowColor}`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 0 ${glowColor}`; }}
    >
      {/* Gradient accent strip */}
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${gradient}`} />
      {/* Subtle bottom color bleed */}
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300`} />

      <div className="relative flex items-center gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
          style={{ boxShadow: `0 4px 16px -2px ${glowColor}` }}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className={`text-3xl font-bold tabular-nums leading-none ${T.textPrimary(theme)}`}>
            {display}
          </p>
          <p className={`mt-1 text-xs font-semibold tracking-wide ${T.textMuted(theme)}`}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Hexagonal node positions (6 around center) ─────────────

const HEX_RADIUS = 140;
const CENTER_X = 250;
const CENTER_Y = 200;

function hexPosition(index: number): { x: number; y: number } {
  const angle = (Math.PI / 3) * index - Math.PI / 2; // start from top
  return {
    x: CENTER_X + HEX_RADIUS * Math.cos(angle),
    y: CENTER_Y + HEX_RADIUS * Math.sin(angle),
  };
}

// Cluster gradient colors for SVG (first color of the tailwind gradient)
const CLUSTER_SVG_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#a855f7', // purple-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#ef4444', // red-500
];

// ── Neural Network Visualization ────────────────────────────

function NeuralNetworkVis({
  theme,
  onClusterClick,
}: {
  theme: AITheme;
  onClusterClick: (clusterId: string) => void;
}) {
  const positions = useMemo(() => CLUSTER_DATA.map((_, i) => hexPosition(i)), []);

  // Build connections (each node connects to its 2 neighbors + the one across)
  const connections = useMemo(() => {
    const lines: { from: number; to: number }[] = [];
    for (let i = 0; i < 6; i++) {
      // adjacent
      lines.push({ from: i, to: (i + 1) % 6 });
      // skip-one for cross connections (only 3 unique diagonals)
      if (i < 3) {
        lines.push({ from: i, to: i + 3 });
      }
    }
    return lines;
  }, []);

  const lineColor =
    theme === 'light' ? 'rgba(148,163,184,0.35)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)';

  const lineColorActive =
    theme === 'light' ? 'rgba(99,102,241,0.3)' : theme === 'dark' ? 'rgba(168,85,247,0.2)' : 'rgba(34,211,238,0.15)';

  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <svg
        viewBox="0 0 500 400"
        className="w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Animated dash for connections */}
          <style>{`
            @keyframes dashFlow {
              to { stroke-dashoffset: -24; }
            }
            .neural-line {
              animation: dashFlow 2s linear infinite;
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.4; r: 36; }
              50% { opacity: 0.7; r: 42; }
            }
            .cluster-glow {
              animation: pulseGlow 3s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* Connection lines */}
        {connections.map(({ from, to }, idx) => {
          const p1 = positions[from];
          const p2 = positions[to];
          const isDiagonal = Math.abs(from - to) === 3;
          return (
            <g key={`conn-${idx}`}>
              {/* Shadow line for depth */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={lineColor}
                strokeWidth={isDiagonal ? 1 : 1.5}
              />
              {/* Animated dashed overlay */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={lineColorActive}
                strokeWidth={isDiagonal ? 1 : 1.5}
                strokeDasharray="6 6"
                className="neural-line"
                style={{ animationDelay: `${idx * 0.3}s` }}
              />
            </g>
          );
        })}

        {/* Center hub node */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={20}
          fill={theme === 'light' ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)'}
          stroke={theme === 'light' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}
          strokeWidth={1}
        />
        <text
          x={CENTER_X}
          y={CENTER_Y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="14"
          fill={theme === 'light' ? '#6366f1' : theme === 'dark' ? '#a78bfa' : '#22d3ee'}
          fontWeight="bold"
        >
          70
        </text>

        {/* Cluster nodes */}
        {CLUSTER_DATA.map((cluster, i) => {
          const pos = positions[i];
          const color = CLUSTER_SVG_COLORS[i];
          return (
            <g
              key={cluster.id}
              className="cursor-pointer"
              onClick={() => onClusterClick(cluster.id)}
              role="button"
              tabIndex={0}
            >
              {/* Pulsing glow */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={36}
                fill={color}
                opacity={0.15}
                className="cluster-glow"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
              {/* Solid outer ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={32}
                fill={theme === 'light' ? 'white' : theme === 'dark' ? 'rgba(15,15,30,0.85)' : 'rgba(0,0,0,0.9)'}
                stroke={color}
                strokeWidth={2}
                opacity={0.95}
              />
              {/* Abbreviated label */}
              <text
                x={pos.x}
                y={pos.y - 6}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fill={color}
                fontWeight="600"
              >
                {cluster.svgLabel}
              </text>
              {/* Agent count */}
              <text
                x={pos.x}
                y={pos.y + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill={color}
                fontWeight="bold"
              >
                {cluster.agentCount}
              </text>
              {/* Cluster name below */}
              <text
                x={pos.x}
                y={pos.y + 50}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill={theme === 'light' ? '#374151' : theme === 'dark' ? '#d1d5db' : '#9ca3af'}
                fontWeight="500"
              >
                {cluster.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Cluster Card ────────────────────────────────────────────

function ClusterCard({
  cluster,
  theme,
  isExpanded,
  onToggle,
  onAgentClick,
  onOrchestrate,
}: {
  cluster: Cluster;
  theme: AITheme;
  isExpanded: boolean;
  onToggle: () => void;
  onAgentClick: (agentType: string) => void;
  onOrchestrate: () => void;
}) {
  const cardBg =
    theme === 'light'
      ? 'bg-white border-gray-200/80 shadow-sm'
      : theme === 'dark'
        ? 'bg-white/[0.04] border-white/[0.08] shadow-none'
        : 'bg-white/[0.02] border-white/[0.05] shadow-none';

  const chipBg =
    theme === 'light'
      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
      : theme === 'dark'
        ? 'bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 border-white/[0.06]'
        : 'bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 border-white/[0.04]';

  const orchestrateBg =
    theme === 'light'
      ? 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
      : theme === 'dark'
        ? 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 border-white/[0.06]'
        : 'bg-white/[0.02] hover:bg-white/[0.06] text-gray-500 border-white/[0.04]';

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl border
        backdrop-blur-xl transition-all duration-300
        hover:scale-[1.01]
        ${cardBg}
      `}
    >
      {/* Gradient header bar */}
      <div className={`h-1.5 bg-gradient-to-r ${cluster.color}`} />

      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cluster.color}`}>
            <cluster.icon className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className={`font-semibold ${T.textPrimary(theme)}`}>
              {cluster.name}
            </h3>
            <p className={`text-xs ${T.textMuted(theme)}`}>
              {cluster.agentCount} agents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Pulsing dot to indicate "active" */}
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-gradient-to-r ${cluster.color} opacity-40`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r ${cluster.color}`} />
          </span>
          {isExpanded ? (
            <ChevronUpIcon className={`h-5 w-5 ${T.textMuted(theme)}`} />
          ) : (
            <ChevronDownIcon className={`h-5 w-5 ${T.textMuted(theme)}`} />
          )}
        </div>
      </button>

      {/* Expanded agent chips */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {cluster.agents.map((agent) => {
              const ChipIcon = getAgentIcon(agent.type);
              return (
                <button
                  key={agent.type}
                  onClick={() => onAgentClick(agent.type)}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full border
                    px-3 py-1.5 text-xs font-medium
                    transition-all duration-200 hover:scale-105
                    ${chipBg}
                  `}
                  title={`Chat with ${agent.name}`}
                >
                  <ChipIcon className={`h-3.5 w-3.5 flex-shrink-0 ${cluster.textColor}`} />
                  {agent.name}
                </button>
              );
            })}
          </div>

          {/* Orchestrate button */}
          <button
            onClick={onOrchestrate}
            className={`
              mt-3 flex w-full items-center justify-center gap-2
              rounded-xl border px-4 py-2.5 text-xs font-semibold
              transition-all duration-200 hover:scale-[1.01]
              ${orchestrateBg}
            `}
          >
            <PlayIcon className="h-4 w-4" />
            Orchestrate Cluster
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Feed Item ──────────────────────────────────────

function ActivityItem({
  entry,
  theme,
}: {
  entry: typeof ACTIVITY_FEED[number];
  theme: AITheme;
}) {
  const cluster = CLUSTER_DATA.find((c) => c.id === entry.cluster);

  return (
    <div
      className={`
        flex items-start gap-3 rounded-xl px-4 py-3
        transition-colors duration-200
        ${theme === 'light' ? 'hover:bg-gray-50' : theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-white/[0.02]'}
      `}
    >
      {/* Dot indicator */}
      <div className="mt-1.5 flex-shrink-0">
        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${cluster?.color ?? 'from-gray-400 to-gray-500'}`} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm ${T.textPrimary(theme)}`}>
          <span className={`font-semibold ${cluster?.textColor ?? ''}`}>
            {entry.agent}
          </span>
          {' '}
          <span className={T.textSecondary(theme)}>
            {entry.text}
          </span>
        </p>
        <p className={`mt-0.5 text-xs ${T.textMuted(theme)}`}>
          {entry.time}
        </p>
      </div>
    </div>
  );
}

// ── Live Activity Feed (Real-Time Agent Status) ────────────

function LiveActivityFeed({ theme }: { theme: AITheme }) {
  const [activeAgents, setActiveAgents] = useState<Array<{
    id: string;
    agentType: string;
    title: string;
    status: string;
    currentStep: number;
    totalSteps: number;
    startedAt: string | null;
    isProactive: boolean;
    parentTaskId: string | null;
    user: { firstName: string; lastName: string };
  }>>([]);

  // Poll for active agents every 8 seconds
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const data = await aiApi.getActiveAgents();
        if (mounted) setActiveAgents(data);
      } catch {
        // Silently fail — feed is non-critical
      }
    };
    poll();
    const interval = setInterval(poll, 8000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const hasLiveData = activeAgents.length > 0;

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${hasLiveData ? 'bg-green-400' : 'bg-gray-400'} opacity-60`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${hasLiveData ? 'bg-green-500' : 'bg-gray-500'}`} />
        </span>
        <h2 className={`text-lg font-semibold ${T.textPrimary(theme)}`}>
          Live Swarm Activity
        </h2>
        {hasLiveData && (
          <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
            {activeAgents.length} active
          </span>
        )}
      </div>
      <div
        className={`
          max-h-[340px] overflow-y-auto rounded-2xl border backdrop-blur-xl
          ${T.scrollbar(theme)}
          ${theme === 'light'
            ? 'border-gray-200/60 bg-white/50'
            : theme === 'dark'
              ? 'border-white/[0.06] bg-white/[0.02]'
              : 'border-white/[0.04] bg-white/[0.01]'
          }
        `}
      >
        <div className="divide-y divide-transparent p-2">
          {/* Real-time active tasks */}
          {activeAgents.map((agent) => {
            const progress = agent.totalSteps > 0
              ? Math.round((agent.currentStep / agent.totalSteps) * 100)
              : 0;
            const statusText =
              agent.status === 'planning' ? 'Planning...' :
              agent.status === 'executing' ? `Step ${agent.currentStep + 1}/${agent.totalSteps}` :
              agent.status === 'awaiting_approval' ? 'Awaiting approval' : agent.status;

            return (
              <div
                key={agent.id}
                className={`
                  flex items-start gap-3 rounded-xl px-4 py-3
                  transition-colors duration-200
                  ${theme === 'light' ? 'hover:bg-gray-50' : theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-white/[0.02]'}
                `}
              >
                <div className="mt-1.5 flex-shrink-0">
                  <div className={`h-2 w-2 rounded-full ${
                    agent.status === 'executing' ? 'bg-amber-400 animate-pulse' :
                    agent.status === 'awaiting_approval' ? 'bg-orange-400' :
                    'bg-blue-400 animate-pulse'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${T.textPrimary(theme)}`}>
                    <span className={`font-semibold ${T.accentText(theme)}`}>
                      {agent.agentType.replace(/_/g, ' ')}
                    </span>{' '}
                    <span className={T.textSecondary(theme)}>
                      {agent.title}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xs font-medium ${
                      agent.status === 'executing' ? 'text-amber-400' :
                      agent.status === 'awaiting_approval' ? 'text-orange-400' :
                      'text-blue-400'
                    }`}>
                      {statusText}
                    </span>
                    {agent.isProactive && (
                      <span className="text-2xs text-cyan-400">Proactive</span>
                    )}
                    {agent.parentTaskId && (
                      <span className="text-2xs text-purple-400">Sub-task</span>
                    )}
                    {agent.totalSteps > 0 && (
                      <div className={`flex-1 h-1 rounded-full max-w-[80px] ${theme === 'light' ? 'bg-gray-200' : 'bg-white/5'}`}>
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${T.accentGradient(theme)} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Fallback: static activity feed when no live data */}
          {!hasLiveData && ACTIVITY_FEED.map((entry, i) => (
            <ActivityItem key={i} entry={entry} theme={theme} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export function SwarmOverview() {
  const { theme, setSwarmMode, setSelectedAgent, addOrchestrationAgent } =
    useAIWorkspaceStore();

  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  // Scroll-to cluster from the neural vis
  const handleClusterClickFromVis = useCallback((clusterId: string) => {
    setExpandedCluster((prev) => (prev === clusterId ? null : clusterId));
    // Scroll the cluster into view
    const el = document.getElementById(`cluster-card-${clusterId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleAgentClick = useCallback(
    (agentType: string) => {
      setSelectedAgent(agentType);
      setSwarmMode('chat');
    },
    [setSelectedAgent, setSwarmMode],
  );

  const handleOrchestrate = useCallback(
    (cluster: Cluster) => {
      cluster.agents.forEach((a) => addOrchestrationAgent(a.type));
      setSwarmMode('orchestrate');
    },
    [addOrchestrationAgent, setSwarmMode],
  );

  // Section title gradient
  const titleGradient = `bg-gradient-to-r ${T.accentGradient(theme)} bg-clip-text text-transparent`;

  return (
    <div className={`relative min-h-full transition-colors duration-300 ${theme === 'light' ? 'bg-gray-50' : ''}`}>
      {/* Ambient floating background orbs — dark themes only */}
      {theme !== 'light' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-64 -left-64 h-[44rem] w-[44rem] rounded-full blur-3xl"
            style={{
              background: theme === 'deep-dark'
                ? 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 68%)'
                : 'radial-gradient(circle, rgba(167,139,250,0.09) 0%, transparent 68%)',
              animation: 'floatOrb 20s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -bottom-64 -right-64 h-[44rem] w-[44rem] rounded-full blur-3xl"
            style={{
              background: theme === 'deep-dark'
                ? 'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 68%)'
                : 'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 68%)',
              animation: 'floatOrb 26s ease-in-out infinite reverse',
              animationDelay: '4s',
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[32rem] w-[32rem] rounded-full blur-3xl"
            style={{
              background: theme === 'deep-dark'
                ? 'radial-gradient(circle, rgba(45,212,191,0.05) 0%, transparent 68%)'
                : 'radial-gradient(circle, rgba(192,132,252,0.06) 0%, transparent 68%)',
              animation: 'floatOrb 32s ease-in-out infinite',
              animationDelay: '8s',
            }}
          />
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Hero Header ───────────────────────────────────── */}
        <div
          className={`relative mb-8 overflow-hidden rounded-2xl border p-8 text-center backdrop-blur-xl
            ${theme === 'light'
              ? 'border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-purple-50/60'
              : theme === 'dark'
              ? 'border-white/[0.06] bg-gradient-to-br from-indigo-950/60 to-purple-950/40'
              : 'border-white/[0.04] bg-gradient-to-br from-black/60 to-indigo-950/30'}`}
        >
          {/* Decorative ambient orbs */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

          {/* Live badge */}
          <div className="mb-4 flex items-center justify-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider
                ${theme === 'light'
                  ? 'border-emerald-300/60 bg-emerald-50 text-emerald-700'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
            <span className={`text-xs font-medium tracking-wide ${T.textMuted(theme)}`}>
              Swarm Intelligence Active
            </span>
          </div>

          <h1
            className={`mb-3 ${titleGradient}`}
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              lineHeight: 1.1,
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Neural</span>
            {' '}
            <span style={{ fontWeight: 700 }}>Swarm</span>
          </h1>
          <p className={`text-sm ${T.textSecondary(theme)} max-w-md mx-auto leading-relaxed`}>
            70 AI agents across 6 intelligent clusters, working in harmony to power your performance intelligence.
          </p>
        </div>

        {/* ── Hero Stats Row ────────────────────────────────── */}
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
          <HeroStatCard
            icon={CpuChipIcon}
            value={70}
            label="Total Agents"
            gradient="from-blue-500 to-indigo-600"
            glowColor="rgba(99,102,241,0.35)"
            theme={theme}
          />
          <HeroStatCard
            icon={Square3Stack3DIcon}
            value={6}
            label="Active Clusters"
            gradient="from-emerald-500 to-teal-600"
            glowColor="rgba(16,185,129,0.35)"
            theme={theme}
          />
          <HeroStatCard
            icon={BoltIcon}
            value={38}
            label="Economy Tier"
            gradient="from-amber-500 to-orange-600"
            glowColor="rgba(245,158,11,0.35)"
            theme={theme}
          />
          <HeroStatCard
            icon={SparklesIcon}
            value={8}
            label="Premium Tier"
            gradient="from-purple-500 to-pink-600"
            glowColor="rgba(168,85,247,0.35)"
            theme={theme}
          />
        </div>

        {/* ── Neural Network Visualization ───────────────────── */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <SignalIcon className={`h-5 w-5 ${T.accentText(theme)}`} />
            <h2 className={`text-lg font-semibold ${T.textPrimary(theme)}`}>
              Cluster Topology
            </h2>
          </div>
          <div
            className={`
              overflow-hidden rounded-2xl border backdrop-blur-xl
              ${theme === 'light'
                ? 'border-gray-200/60 bg-white/50'
                : theme === 'dark'
                  ? 'border-white/[0.06] bg-white/[0.02]'
                  : 'border-white/[0.04] bg-white/[0.01]'
              }
            `}
          >
            <NeuralNetworkVis theme={theme} onClusterClick={handleClusterClickFromVis} />
            <p className={`pb-4 text-center text-xs ${T.textMuted(theme)}`}>
              Click any node to explore its agents
            </p>
          </div>
        </div>

        {/* ── Cluster Cards Grid ────────────────────────────── */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Square3Stack3DIcon className={`h-5 w-5 ${T.accentText(theme)}`} />
            <h2 className={`text-lg font-semibold ${T.textPrimary(theme)}`}>
              Agent Clusters
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CLUSTER_DATA.map((cluster) => (
              <div key={cluster.id} id={`cluster-card-${cluster.id}`}>
                <ClusterCard
                  cluster={cluster}
                  theme={theme}
                  isExpanded={expandedCluster === cluster.id}
                  onToggle={() =>
                    setExpandedCluster((prev) =>
                      prev === cluster.id ? null : cluster.id,
                    )
                  }
                  onAgentClick={handleAgentClick}
                  onOrchestrate={() => handleOrchestrate(cluster)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Live Activity Feed ────────────────────────────── */}
        <LiveActivityFeed theme={theme} />

      </div>
    </div>
  );
}
