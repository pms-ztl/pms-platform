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
  | 'nlp_query'
  | 'excel_validation'
  | 'license'
  | 'career'
  | 'report'
  | 'onboarding'
  | 'security'
  | 'notification'
  | 'coaching'
  | 'workforce_intel'
  | 'governance'
  | 'conflict_resolution'
  | 'talent_marketplace'
  | 'strategic_alignment';

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
  // ── Core Agents ──
  {
    type: 'performance',
    icon: '\uD83C\uDFAF',
    name: 'Performance',
    description: 'Reviews, ratings & goal coaching',
    gradientFrom: 'from-rose-500/20',
    gradientTo: 'to-orange-500/20',
    glowColor: 'shadow-rose-500/30',
  },
  {
    type: 'strategic_alignment',
    icon: '\uD83C\uDFAF',
    name: 'Strategy',
    description: 'OKR alignment & 1:1 snapshots',
    gradientFrom: 'from-indigo-500/20',
    gradientTo: 'to-blue-500/20',
    glowColor: 'shadow-indigo-500/30',
  },
  {
    type: 'coaching',
    icon: '\uD83E\uDDD1\u200D\uD83C\uDFEB',
    name: 'Coaching',
    description: 'Personalized micro-coaching',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-teal-500/20',
    glowColor: 'shadow-emerald-500/30',
  },
  {
    type: 'workforce_intel',
    icon: '\uD83E\uDDE0',
    name: 'Workforce Intel',
    description: 'Burnout, attrition & retention',
    gradientFrom: 'from-purple-500/20',
    gradientTo: 'to-fuchsia-500/20',
    glowColor: 'shadow-purple-500/30',
  },
  {
    type: 'governance',
    icon: '\u2696\uFE0F',
    name: 'Governance',
    description: 'Bias audits & fairness checks',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-yellow-500/20',
    glowColor: 'shadow-amber-500/30',
  },
  {
    type: 'talent_marketplace',
    icon: '\uD83C\uDFEA',
    name: 'Talent Market',
    description: 'Mobility, skill matching & goals',
    gradientFrom: 'from-sky-500/20',
    gradientTo: 'to-blue-500/20',
    glowColor: 'shadow-sky-500/30',
  },
  {
    type: 'conflict_resolution',
    icon: '\uD83E\uDD1D',
    name: 'Conflict',
    description: 'Team dynamics & mediation',
    gradientFrom: 'from-orange-500/20',
    gradientTo: 'to-red-500/20',
    glowColor: 'shadow-orange-500/30',
  },
  // ── Utility Agents ──
  {
    type: 'career',
    icon: '\uD83D\uDE80',
    name: 'Career',
    description: 'Growth paths & skill gaps',
    gradientFrom: 'from-violet-500/20',
    gradientTo: 'to-purple-500/20',
    glowColor: 'shadow-violet-500/30',
  },
  {
    type: 'report',
    icon: '\uD83D\uDCCB',
    name: 'Report',
    description: 'Generate & export reports',
    gradientFrom: 'from-blue-500/20',
    gradientTo: 'to-cyan-500/20',
    glowColor: 'shadow-blue-500/30',
  },
  {
    type: 'nlp_query',
    icon: '\uD83D\uDD0D',
    name: 'Data Query',
    description: 'Ask anything about your data',
    gradientFrom: 'from-gray-500/20',
    gradientTo: 'to-slate-500/20',
    glowColor: 'shadow-gray-500/30',
  },
  {
    type: 'security',
    icon: '\uD83D\uDD12',
    name: 'Security',
    description: 'Threats, audits & compliance',
    gradientFrom: 'from-red-500/20',
    gradientTo: 'to-rose-500/20',
    glowColor: 'shadow-red-500/30',
  },
  {
    type: 'notification',
    icon: '\uD83D\uDD14',
    name: 'Notification',
    description: 'Smart alerts & digests',
    gradientFrom: 'from-cyan-500/20',
    gradientTo: 'to-sky-500/20',
    glowColor: 'shadow-cyan-500/30',
  },
  {
    type: 'onboarding',
    icon: '\uD83C\uDF93',
    name: 'Onboarding',
    description: 'New hire setup & checklists',
    gradientFrom: 'from-pink-500/20',
    gradientTo: 'to-rose-500/20',
    glowColor: 'shadow-pink-500/30',
  },
  {
    type: 'license',
    icon: '\uD83D\uDD11',
    name: 'License',
    description: 'Seats, plans & billing',
    gradientFrom: 'from-lime-500/20',
    gradientTo: 'to-green-500/20',
    glowColor: 'shadow-lime-500/30',
  },
  {
    type: 'excel_validation',
    icon: '\uD83D\uDCC4',
    name: 'Excel AI',
    description: 'Smart data validation & import',
    gradientFrom: 'from-teal-500/20',
    gradientTo: 'to-emerald-500/20',
    glowColor: 'shadow-teal-500/30',
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
