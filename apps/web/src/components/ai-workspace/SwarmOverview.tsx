/**
 * SwarmOverview - Mode 1 of the Neural Swarm UI
 *
 * A visual dashboard showing all 65 AI agents organized into 6 clusters
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
} from '@heroicons/react/24/outline';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';
import * as T from './ai-theme';

// ── Cluster data ────────────────────────────────────────────

interface ClusterAgent {
  type: string;
  name: string;
  icon: string;
}

interface Cluster {
  id: string;
  name: string;
  icon: string;
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
    icon: '\u2699\uFE0F',
    color: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/40',
    textColor: 'text-blue-400',
    bgAccent: 'bg-blue-500/10',
    borderAccent: 'border-blue-500/20',
    agentCount: 15,
    agents: [
      { type: 'performance', name: 'Performance', icon: '\uD83C\uDFAF' },
      { type: 'nlp_query', name: 'Data Query', icon: '\uD83D\uDD0D' },
      { type: 'coaching', name: 'Coaching', icon: '\uD83E\uDDD1\u200D\uD83C\uDFEB' },
      { type: 'career', name: 'Career', icon: '\uD83D\uDE80' },
      { type: 'report', name: 'Reports', icon: '\uD83D\uDCCB' },
      { type: 'workforce_intel', name: 'Workforce Intel', icon: '\uD83E\uDDE0' },
      { type: 'governance', name: 'Governance', icon: '\u2696\uFE0F' },
      { type: 'strategic_alignment', name: 'Strategy', icon: '\uD83C\uDFAF' },
      { type: 'talent_marketplace', name: 'Talent Market', icon: '\uD83C\uDFEA' },
      { type: 'conflict_resolution', name: 'Conflict', icon: '\uD83E\uDD1D' },
      { type: 'security', name: 'Security', icon: '\uD83D\uDD12' },
      { type: 'notification', name: 'Notification', icon: '\uD83D\uDD14' },
      { type: 'onboarding', name: 'Onboarding', icon: '\uD83C\uDF93' },
      { type: 'license', name: 'License', icon: '\uD83D\uDD11' },
      { type: 'excel_validation', name: 'Excel AI', icon: '\uD83D\uDCC4' },
    ],
  },
  {
    id: 'bio_performance',
    name: 'Bio-Performance',
    icon: '\uD83E\uDDEC',
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/40',
    textColor: 'text-emerald-400',
    bgAccent: 'bg-emerald-500/10',
    borderAccent: 'border-emerald-500/20',
    agentCount: 10,
    agents: [
      { type: 'neuro_focus', name: 'Neuro Focus', icon: '\uD83E\uDDE0' },
      { type: 'circadian_sync', name: 'Circadian Sync', icon: '\uD83C\uDF19' },
      { type: 'micro_break', name: 'Micro Break', icon: '\u23F0' },
      { type: 'cortisol_monitor', name: 'Cortisol Monitor', icon: '\uD83D\uDCC9' },
      { type: 'ergonomics', name: 'Ergonomics', icon: '\uD83E\uDE91' },
      { type: 'sleep_optimizer', name: 'Sleep Optimizer', icon: '\uD83D\uDCA4' },
      { type: 'hydration_nutrition', name: 'Hydration', icon: '\uD83D\uDCA7' },
      { type: 'vocal_tone', name: 'Vocal Tone', icon: '\uD83C\uDFA4' },
      { type: 'environment_ctrl', name: 'Environment', icon: '\uD83C\uDF21\uFE0F' },
      { type: 'burnout_interceptor', name: 'Burnout Guard', icon: '\uD83D\uDEE1\uFE0F' },
    ],
  },
  {
    id: 'hyper_learning',
    name: 'Hyper-Learning',
    icon: '\uD83D\uDCDA',
    color: 'from-purple-500 to-pink-600',
    glow: 'shadow-purple-500/40',
    textColor: 'text-purple-400',
    bgAccent: 'bg-purple-500/10',
    borderAccent: 'border-purple-500/20',
    agentCount: 12,
    agents: [
      { type: 'shadow_learning', name: 'Shadow Learn', icon: '\uD83D\uDC65' },
      { type: 'micro_learning', name: 'Micro Learn', icon: '\uD83D\uDCD6' },
      { type: 'ar_mentor', name: 'AR Mentor', icon: '\uD83E\uDD3D' },
      { type: 'sparring_partner', name: 'Sparring', icon: '\uD83E\uDD4A' },
      { type: 'skill_gap_forecaster', name: 'Skill Forecast', icon: '\uD83D\uDD2E' },
      { type: 'knowledge_broker', name: 'Knowledge Broker', icon: '\uD83E\uDD1D' },
      { type: 'credential_ledger', name: 'Credentials', icon: '\uD83C\uDF96\uFE0F' },
      { type: 'linguistic_refiner', name: 'Linguistic', icon: '\u270D\uFE0F' },
      { type: 'curiosity_scout', name: 'Curiosity Scout', icon: '\uD83D\uDD2D' },
      { type: 'logic_validator', name: 'Logic Check', icon: '\uD83E\uDDE9' },
      { type: 'cross_training', name: 'Cross-Training', icon: '\uD83D\uDD00' },
      { type: 'career_sim', name: 'Career Sim', icon: '\uD83C\uDFAE' },
    ],
  },
  {
    id: 'liquid_workforce',
    name: 'Liquid Workforce',
    icon: '\uD83D\uDCB0',
    color: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/40',
    textColor: 'text-amber-400',
    bgAccent: 'bg-amber-500/10',
    borderAccent: 'border-amber-500/20',
    agentCount: 10,
    agents: [
      { type: 'task_bidder', name: 'Task Bidder', icon: '\uD83D\uDCE6' },
      { type: 'gig_sourcer', name: 'Gig Sourcer', icon: '\uD83C\uDFAA' },
      { type: 'nano_payment', name: 'Nano Payment', icon: '\u2B50' },
      { type: 'market_value', name: 'Market Value', icon: '\uD83D\uDCCA' },
      { type: 'tax_optimizer', name: 'Tax Optimizer', icon: '\uD83D\uDCB5' },
      { type: 'equity_realizer', name: 'Equity', icon: '\uD83D\uDCB9' },
      { type: 'pension_guard', name: 'Pension Guard', icon: '\uD83C\uDFE6' },
      { type: 'relocation_bot', name: 'Relocation', icon: '\u2708\uFE0F' },
      { type: 'vendor_negotiator', name: 'Vendor Nego', icon: '\uD83D\uDD0E' },
      { type: 'succession_sentry', name: 'Succession', icon: '\uD83D\uDC51' },
    ],
  },
  {
    id: 'culture_empathy',
    name: 'Culture & Empathy',
    icon: '\u2764\uFE0F',
    color: 'from-pink-500 to-rose-600',
    glow: 'shadow-pink-500/40',
    textColor: 'text-pink-400',
    bgAccent: 'bg-pink-500/10',
    borderAccent: 'border-pink-500/20',
    agentCount: 10,
    agents: [
      { type: 'culture_weaver', name: 'Culture Weaver', icon: '\uD83C\uDF10' },
      { type: 'bias_neutralizer', name: 'Bias Neutralizer', icon: '\u2696\uFE0F' },
      { type: 'gratitude_sentinel', name: 'Gratitude', icon: '\uD83D\uDE4F' },
      { type: 'conflict_mediator', name: 'Mediator', icon: '\uD83D\uDD4A\uFE0F' },
      { type: 'inclusion_monitor', name: 'Inclusion', icon: '\uD83C\uDF08' },
      { type: 'empathy_coach', name: 'Empathy Coach', icon: '\uD83D\uDCAC' },
      { type: 'social_bonding', name: 'Social Bonding', icon: '\uD83C\uDFC6' },
      { type: 'legacy_archivist', name: 'Legacy Archive', icon: '\uD83D\uDCDC' },
      { type: 'whistleblower', name: 'Whistleblower', icon: '\uD83D\uDCE2' },
      { type: 'mood_radiator', name: 'Mood Radiator', icon: '\uD83C\uDF21\uFE0F' },
    ],
  },
  {
    id: 'governance_logic',
    name: 'Governance & Logic',
    icon: '\uD83D\uDCDC',
    color: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/40',
    textColor: 'text-red-400',
    bgAccent: 'bg-red-500/10',
    borderAccent: 'border-red-500/20',
    agentCount: 8,
    agents: [
      { type: 'posh_sentinel', name: 'POSH Sentinel', icon: '\uD83D\uDEE1\uFE0F' },
      { type: 'labor_compliance', name: 'Labor Law', icon: '\uD83D\uDCDC' },
      { type: 'policy_translator', name: 'Policy Translate', icon: '\uD83D\uDCD6' },
      { type: 'data_privacy', name: 'Data Privacy', icon: '\uD83D\uDD10' },
      { type: 'audit_trail', name: 'Audit Trail', icon: '\uD83D\uDD0D' },
      { type: 'conflict_of_interest', name: 'COI Detector', icon: '\u26A0\uFE0F' },
      { type: 'leave_optimizer', name: 'Leave Optimizer', icon: '\uD83C\uDFD6\uFE0F' },
      { type: 'onboarding_orchestrator', name: 'Onboard Orch', icon: '\uD83C\uDFAC' },
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
  theme,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  value: number;
  label: string;
  gradient: string;
  theme: AITheme;
}) {
  const display = useAnimatedCounter(value);

  const cardBg =
    theme === 'light'
      ? 'bg-white/70 border-gray-200/60'
      : theme === 'dark'
        ? 'bg-white/[0.06] border-white/[0.08]'
        : 'bg-white/[0.03] border-white/[0.05]';

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border p-5
        backdrop-blur-xl transition-all duration-300
        hover:scale-[1.02] hover:shadow-lg
        ${cardBg}
      `}
    >
      {/* Gradient accent strip */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />

      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className={`text-3xl font-bold tabular-nums ${T.textPrimary(theme)}`}>
            {display}
          </p>
          <p className={`text-sm font-medium ${T.textSecondary(theme)}`}>
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
          65
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
              {/* Icon */}
              <text
                x={pos.x}
                y={pos.y - 6}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="18"
              >
                {cluster.icon}
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
          <span className="text-2xl">{cluster.icon}</span>
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
            {cluster.agents.map((agent) => (
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
                <span className="text-sm">{agent.icon}</span>
                {agent.name}
              </button>
            ))}
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
    <div className={`min-h-full ${T.bg(theme)} transition-colors duration-300`}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Hero Header ───────────────────────────────────── */}
        <div className="mb-8 text-center">
          <h1 className={`text-3xl font-bold sm:text-4xl ${titleGradient}`}>
            Neural Swarm
          </h1>
          <p className={`mt-2 text-sm ${T.textSecondary(theme)}`}>
            65 AI agents across 6 intelligent clusters, working in harmony.
          </p>
        </div>

        {/* ── Hero Stats Row ────────────────────────────────── */}
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <HeroStatCard
            icon={CpuChipIcon}
            value={65}
            label="Total Agents"
            gradient="from-blue-500 to-indigo-600"
            theme={theme}
          />
          <HeroStatCard
            icon={Square3Stack3DIcon}
            value={6}
            label="Active Clusters"
            gradient="from-emerald-500 to-teal-600"
            theme={theme}
          />
          <HeroStatCard
            icon={BoltIcon}
            value={38}
            label="Economy Tier"
            gradient="from-amber-500 to-orange-600"
            theme={theme}
          />
          <HeroStatCard
            icon={SparklesIcon}
            value={8}
            label="Premium Tier"
            gradient="from-purple-500 to-pink-600"
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
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <h2 className={`text-lg font-semibold ${T.textPrimary(theme)}`}>
              Live Swarm Activity
            </h2>
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
              {ACTIVITY_FEED.map((entry, i) => (
                <ActivityItem key={i} entry={entry} theme={theme} />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
