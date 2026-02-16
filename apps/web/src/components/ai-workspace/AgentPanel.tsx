/**
 * AgentPanel - Left sidebar showing the 9 AI agent cards.
 *
 * Each card displays an emoji icon, agent name, and brief description.
 * The currently selected agent gets a glowing gradient border. Each card
 * has its own gradient background color scheme.
 */

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ── Agent Definitions ─────────────────────────────────────────

export type AgentType =
  | 'performance'
  | 'analytics'
  | 'feedback'
  | 'hr'
  | 'report'
  | 'onboarding'
  | 'security'
  | 'notification'
  | 'goals';

interface AgentDef {
  type: AgentType;
  icon: string;
  name: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
}

const AGENTS: AgentDef[] = [
  {
    type: 'performance',
    icon: '\uD83C\uDFAF',
    name: 'Performance',
    description: 'Review scores, ratings & trends',
    gradientFrom: 'from-rose-500/20',
    gradientTo: 'to-orange-500/20',
    glowColor: 'shadow-rose-500/30',
  },
  {
    type: 'analytics',
    icon: '\uD83D\uDCCA',
    name: 'Analytics',
    description: 'Data insights & visualizations',
    gradientFrom: 'from-blue-500/20',
    gradientTo: 'to-cyan-500/20',
    glowColor: 'shadow-blue-500/30',
  },
  {
    type: 'feedback',
    icon: '\uD83D\uDCAC',
    name: 'Feedback',
    description: '360 feedback & sentiment',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-teal-500/20',
    glowColor: 'shadow-emerald-500/30',
  },
  {
    type: 'hr',
    icon: '\uD83D\uDC65',
    name: 'HR',
    description: 'Policies, leave & compliance',
    gradientFrom: 'from-violet-500/20',
    gradientTo: 'to-purple-500/20',
    glowColor: 'shadow-violet-500/30',
  },
  {
    type: 'report',
    icon: '\uD83D\uDCCB',
    name: 'Report',
    description: 'Generate & export reports',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-yellow-500/20',
    glowColor: 'shadow-amber-500/30',
  },
  {
    type: 'goals',
    icon: '\uD83C\uDFC6',
    name: 'Goals',
    description: 'OKRs, cascading & tracking',
    gradientFrom: 'from-indigo-500/20',
    gradientTo: 'to-blue-500/20',
    glowColor: 'shadow-indigo-500/30',
  },
  {
    type: 'onboarding',
    icon: '\uD83C\uDF93',
    name: 'Onboarding',
    description: 'New hire setup & guidance',
    gradientFrom: 'from-pink-500/20',
    gradientTo: 'to-rose-500/20',
    glowColor: 'shadow-pink-500/30',
  },
  {
    type: 'security',
    icon: '\uD83D\uDD12',
    name: 'Security',
    description: 'Audit logs & threat alerts',
    gradientFrom: 'from-red-500/20',
    gradientTo: 'to-rose-500/20',
    glowColor: 'shadow-red-500/30',
  },
  {
    type: 'notification',
    icon: '\uD83D\uDD14',
    name: 'Notification',
    description: 'Alerts, reminders & digests',
    gradientFrom: 'from-cyan-500/20',
    gradientTo: 'to-sky-500/20',
    glowColor: 'shadow-cyan-500/30',
  },
];

// ── Props ─────────────────────────────────────────────────────

interface AgentPanelProps {
  selectedAgent: AgentType | null;
  onSelectAgent: (agent: AgentType) => void;
}

// ── Component ─────────────────────────────────────────────────

export function AgentPanel({ selectedAgent, onSelectAgent }: AgentPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200"
          title="Expand agent panel"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        {AGENTS.map((agent) => (
          <button
            key={agent.type}
            onClick={() => onSelectAgent(agent.type)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all duration-200 ${
              selectedAgent === agent.type
                ? `bg-gradient-to-br ${agent.gradientFrom} ${agent.gradientTo} shadow-lg ${agent.glowColor} ring-1 ring-white/20`
                : 'hover:bg-white/5'
            }`}
            title={agent.name}
          >
            {agent.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-white">AI Agents</h2>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
          title="Collapse panel"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Agent Cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        {AGENTS.map((agent) => {
          const isSelected = selectedAgent === agent.type;

          return (
            <button
              key={agent.type}
              onClick={() => onSelectAgent(agent.type)}
              className={`group w-full rounded-xl p-3 text-left transition-all duration-300 ${
                isSelected
                  ? `bg-gradient-to-br ${agent.gradientFrom} ${agent.gradientTo} shadow-lg ${agent.glowColor} ring-1 ring-white/20`
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border border-transparent hover:border-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-lg transition-transform duration-200 ${
                    isSelected ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                >
                  {agent.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium truncate transition-colors ${
                      isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'
                    }`}
                  >
                    {agent.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {agent.description}
                  </p>
                </div>
              </div>

              {/* Selected indicator bar */}
              {isSelected && (
                <div className="mt-2 h-0.5 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
