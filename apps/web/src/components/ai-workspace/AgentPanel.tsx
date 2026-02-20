/**
 * AgentPanel - Left sidebar showing 52 AI agent cards organized by cluster.
 * Features:
 * - Cluster accordion sections (expand/collapse)
 * - Theme-aware (light/dark/deep-dark)
 * - Collapsed icon-only mode
 * - Cluster-colored headers
 */

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import * as T from './ai-theme';

// ── Agent Type (all 52) ─────────────────────────────────────

export type AgentType =
  // Core (15)
  | 'performance' | 'nlp_query' | 'excel_validation' | 'license' | 'career'
  | 'report' | 'onboarding' | 'security' | 'notification' | 'coaching'
  | 'workforce_intel' | 'governance' | 'conflict_resolution'
  | 'talent_marketplace' | 'strategic_alignment'
  // Bio-Performance (10)
  | 'neuro_focus' | 'circadian_sync' | 'micro_break' | 'cortisol_monitor'
  | 'ergonomics' | 'sleep_optimizer' | 'hydration_nutrition' | 'vocal_tone'
  | 'environment_ctrl' | 'burnout_interceptor'
  // Hyper-Learning (12)
  | 'shadow_learning' | 'micro_learning' | 'ar_mentor' | 'sparring_partner'
  | 'skill_gap_forecaster' | 'knowledge_broker' | 'credential_ledger'
  | 'linguistic_refiner' | 'curiosity_scout' | 'logic_validator'
  | 'cross_training' | 'career_sim'
  // Liquid Workforce (10)
  | 'task_bidder' | 'gig_sourcer' | 'nano_payment' | 'market_value'
  | 'tax_optimizer' | 'equity_realizer' | 'pension_guard' | 'relocation_bot'
  | 'vendor_negotiator' | 'succession_sentry'
  // Culture & Empathy (10)
  | 'culture_weaver' | 'bias_neutralizer' | 'gratitude_sentinel'
  | 'conflict_mediator' | 'inclusion_monitor' | 'empathy_coach'
  | 'social_bonding' | 'legacy_archivist' | 'whistleblower' | 'mood_radiator'
  // Governance & Logic (8)
  | 'posh_sentinel' | 'labor_compliance' | 'policy_translator' | 'data_privacy'
  | 'audit_trail' | 'conflict_of_interest' | 'leave_optimizer'
  | 'onboarding_orchestrator';

// ── Agent Definition ───────────────────────────────────────

interface AgentDef {
  type: AgentType;
  icon: string;
  name: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
}

// ── Cluster Definition ─────────────────────────────────────

interface ClusterDef {
  id: string;
  name: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  agents: AgentDef[];
}

// ── Cluster Data ───────────────────────────────────────────

const AGENT_CLUSTERS: ClusterDef[] = [
  {
    id: 'core',
    name: 'Core PMS',
    icon: '\u2699\uFE0F',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-500',
    agents: [
      { type: 'performance', icon: '\uD83C\uDFAF', name: 'Performance', description: 'Reviews, ratings & goal coaching', gradientFrom: 'from-rose-500/20', gradientTo: 'to-orange-500/20', glowColor: 'shadow-rose-500/30' },
      { type: 'strategic_alignment', icon: '\uD83C\uDFAF', name: 'Strategy', description: 'OKR alignment & 1:1 snapshots', gradientFrom: 'from-indigo-500/20', gradientTo: 'to-blue-500/20', glowColor: 'shadow-indigo-500/30' },
      { type: 'coaching', icon: '\uD83E\uDDD1\u200D\uD83C\uDFEB', name: 'Coaching', description: 'Personalized micro-coaching', gradientFrom: 'from-emerald-500/20', gradientTo: 'to-teal-500/20', glowColor: 'shadow-emerald-500/30' },
      { type: 'workforce_intel', icon: '\uD83E\uDDE0', name: 'Workforce Intel', description: 'Burnout, attrition & retention', gradientFrom: 'from-purple-500/20', gradientTo: 'to-fuchsia-500/20', glowColor: 'shadow-purple-500/30' },
      { type: 'governance', icon: '\u2696\uFE0F', name: 'Governance', description: 'Bias audits & fairness checks', gradientFrom: 'from-amber-500/20', gradientTo: 'to-yellow-500/20', glowColor: 'shadow-amber-500/30' },
      { type: 'talent_marketplace', icon: '\uD83C\uDFEA', name: 'Talent Market', description: 'Mobility, skill matching & goals', gradientFrom: 'from-sky-500/20', gradientTo: 'to-blue-500/20', glowColor: 'shadow-sky-500/30' },
      { type: 'conflict_resolution', icon: '\uD83E\uDD1D', name: 'Conflict', description: 'Team dynamics & mediation', gradientFrom: 'from-orange-500/20', gradientTo: 'to-red-500/20', glowColor: 'shadow-orange-500/30' },
      { type: 'career', icon: '\uD83D\uDE80', name: 'Career', description: 'Growth paths & skill gaps', gradientFrom: 'from-violet-500/20', gradientTo: 'to-purple-500/20', glowColor: 'shadow-violet-500/30' },
      { type: 'report', icon: '\uD83D\uDCCB', name: 'Report', description: 'Generate & export reports', gradientFrom: 'from-blue-500/20', gradientTo: 'to-cyan-500/20', glowColor: 'shadow-blue-500/30' },
      { type: 'nlp_query', icon: '\uD83D\uDD0D', name: 'Data Query', description: 'Ask anything about your data', gradientFrom: 'from-gray-500/20', gradientTo: 'to-slate-500/20', glowColor: 'shadow-gray-500/30' },
      { type: 'security', icon: '\uD83D\uDD12', name: 'Security', description: 'Threats, audits & compliance', gradientFrom: 'from-red-500/20', gradientTo: 'to-rose-500/20', glowColor: 'shadow-red-500/30' },
      { type: 'notification', icon: '\uD83D\uDD14', name: 'Notification', description: 'Smart alerts & digests', gradientFrom: 'from-cyan-500/20', gradientTo: 'to-sky-500/20', glowColor: 'shadow-cyan-500/30' },
      { type: 'onboarding', icon: '\uD83C\uDF93', name: 'Onboarding', description: 'New hire setup & checklists', gradientFrom: 'from-pink-500/20', gradientTo: 'to-rose-500/20', glowColor: 'shadow-pink-500/30' },
      { type: 'license', icon: '\uD83D\uDD11', name: 'License', description: 'Seats, plans & billing', gradientFrom: 'from-lime-500/20', gradientTo: 'to-green-500/20', glowColor: 'shadow-lime-500/30' },
      { type: 'excel_validation', icon: '\uD83D\uDCC4', name: 'Excel AI', description: 'Smart data validation & import', gradientFrom: 'from-teal-500/20', gradientTo: 'to-emerald-500/20', glowColor: 'shadow-teal-500/30' },
    ],
  },
  {
    id: 'bio_performance',
    name: 'Bio-Performance',
    icon: '\uD83E\uDDEC',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-500',
    agents: [
      { type: 'neuro_focus', icon: '\uD83E\uDDE0', name: 'Neuro Focus', description: 'Deep work & attention optimization', gradientFrom: 'from-violet-500/20', gradientTo: 'to-purple-500/20', glowColor: 'shadow-violet-500/30' },
      { type: 'circadian_sync', icon: '\uD83C\uDF19', name: 'Circadian Sync', description: 'Body clock & energy cycles', gradientFrom: 'from-amber-500/20', gradientTo: 'to-orange-500/20', glowColor: 'shadow-amber-500/30' },
      { type: 'micro_break', icon: '\u23F0', name: 'Micro Break', description: 'Pomodoro & rest intervals', gradientFrom: 'from-green-500/20', gradientTo: 'to-emerald-500/20', glowColor: 'shadow-green-500/30' },
      { type: 'cortisol_monitor', icon: '\uD83D\uDCC9', name: 'Cortisol Monitor', description: 'Stress & anxiety patterns', gradientFrom: 'from-red-500/20', gradientTo: 'to-orange-500/20', glowColor: 'shadow-red-500/30' },
      { type: 'ergonomics', icon: '\uD83E\uDE91', name: 'Ergonomics', description: 'Posture & workspace setup', gradientFrom: 'from-blue-500/20', gradientTo: 'to-sky-500/20', glowColor: 'shadow-blue-500/30' },
      { type: 'sleep_optimizer', icon: '\uD83D\uDCA4', name: 'Sleep Optimizer', description: 'Sleep quality & schedule', gradientFrom: 'from-indigo-500/20', gradientTo: 'to-violet-500/20', glowColor: 'shadow-indigo-500/30' },
      { type: 'hydration_nutrition', icon: '\uD83D\uDCA7', name: 'Hydration', description: 'Water, nutrition & energy', gradientFrom: 'from-cyan-500/20', gradientTo: 'to-blue-500/20', glowColor: 'shadow-cyan-500/30' },
      { type: 'vocal_tone', icon: '\uD83C\uDFA4', name: 'Vocal Tone', description: 'Communication style analysis', gradientFrom: 'from-pink-500/20', gradientTo: 'to-rose-500/20', glowColor: 'shadow-pink-500/30' },
      { type: 'environment_ctrl', icon: '\uD83C\uDF21\uFE0F', name: 'Environment', description: 'Lighting, noise & temperature', gradientFrom: 'from-teal-500/20', gradientTo: 'to-emerald-500/20', glowColor: 'shadow-teal-500/30' },
      { type: 'burnout_interceptor', icon: '\uD83D\uDEE1\uFE0F', name: 'Burnout Guard', description: 'Early burnout detection', gradientFrom: 'from-orange-500/20', gradientTo: 'to-red-500/20', glowColor: 'shadow-orange-500/30' },
    ],
  },
  {
    id: 'hyper_learning',
    name: 'Hyper-Learning',
    icon: '\uD83D\uDCDA',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-500',
    agents: [
      { type: 'shadow_learning', icon: '\uD83D\uDC65', name: 'Shadow Learn', description: 'Job shadowing & peer observation', gradientFrom: 'from-gray-500/20', gradientTo: 'to-slate-500/20', glowColor: 'shadow-gray-500/30' },
      { type: 'micro_learning', icon: '\uD83D\uDCD6', name: 'Micro Learn', description: 'Bite-sized daily lessons', gradientFrom: 'from-blue-500/20', gradientTo: 'to-indigo-500/20', glowColor: 'shadow-blue-500/30' },
      { type: 'ar_mentor', icon: '\uD83E\uDD3D', name: 'AR Mentor', description: 'Interactive simulation training', gradientFrom: 'from-violet-500/20', gradientTo: 'to-fuchsia-500/20', glowColor: 'shadow-violet-500/30' },
      { type: 'sparring_partner', icon: '\uD83E\uDD4A', name: 'Sparring', description: 'Debate & critical thinking', gradientFrom: 'from-red-500/20', gradientTo: 'to-orange-500/20', glowColor: 'shadow-red-500/30' },
      { type: 'skill_gap_forecaster', icon: '\uD83D\uDD2E', name: 'Skill Forecast', description: 'Future skill demand prediction', gradientFrom: 'from-purple-500/20', gradientTo: 'to-blue-500/20', glowColor: 'shadow-purple-500/30' },
      { type: 'knowledge_broker', icon: '\uD83E\uDD1D', name: 'Knowledge Broker', description: 'Expert discovery & transfer', gradientFrom: 'from-emerald-500/20', gradientTo: 'to-teal-500/20', glowColor: 'shadow-emerald-500/30' },
      { type: 'credential_ledger', icon: '\uD83C\uDF96\uFE0F', name: 'Credentials', description: 'Certification tracking', gradientFrom: 'from-amber-500/20', gradientTo: 'to-yellow-500/20', glowColor: 'shadow-amber-500/30' },
      { type: 'linguistic_refiner', icon: '\u270D\uFE0F', name: 'Linguistic', description: 'Writing & communication', gradientFrom: 'from-sky-500/20', gradientTo: 'to-blue-500/20', glowColor: 'shadow-sky-500/30' },
      { type: 'curiosity_scout', icon: '\uD83D\uDD2D', name: 'Curiosity Scout', description: 'Innovation & trend discovery', gradientFrom: 'from-pink-500/20', gradientTo: 'to-rose-500/20', glowColor: 'shadow-pink-500/30' },
      { type: 'logic_validator', icon: '\uD83E\uDDE9', name: 'Logic Check', description: 'Argument & reasoning validation', gradientFrom: 'from-indigo-500/20', gradientTo: 'to-violet-500/20', glowColor: 'shadow-indigo-500/30' },
      { type: 'cross_training', icon: '\uD83D\uDD00', name: 'Cross-Training', description: 'Multi-department skills', gradientFrom: 'from-teal-500/20', gradientTo: 'to-green-500/20', glowColor: 'shadow-teal-500/30' },
      { type: 'career_sim', icon: '\uD83C\uDFAE', name: 'Career Sim', description: 'What-if career scenarios', gradientFrom: 'from-fuchsia-500/20', gradientTo: 'to-purple-500/20', glowColor: 'shadow-fuchsia-500/30' },
    ],
  },
  {
    id: 'liquid_workforce',
    name: 'Liquid Workforce',
    icon: '\uD83D\uDCB0',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-500',
    agents: [
      { type: 'task_bidder', icon: '\uD83D\uDCE6', name: 'Task Bidder', description: 'Optimal task allocation', gradientFrom: 'from-blue-500/20', gradientTo: 'to-sky-500/20', glowColor: 'shadow-blue-500/30' },
      { type: 'gig_sourcer', icon: '\uD83C\uDFAA', name: 'Gig Sourcer', description: 'Internal gig matching', gradientFrom: 'from-purple-500/20', gradientTo: 'to-violet-500/20', glowColor: 'shadow-purple-500/30' },
      { type: 'nano_payment', icon: '\u2B50', name: 'Nano Payment', description: 'Micro-recognition & rewards', gradientFrom: 'from-yellow-500/20', gradientTo: 'to-amber-500/20', glowColor: 'shadow-yellow-500/30' },
      { type: 'market_value', icon: '\uD83D\uDCCA', name: 'Market Value', description: 'Salary benchmarking', gradientFrom: 'from-green-500/20', gradientTo: 'to-emerald-500/20', glowColor: 'shadow-green-500/30' },
      { type: 'tax_optimizer', icon: '\uD83D\uDCB5', name: 'Tax Optimizer', description: 'Tax-efficient strategies', gradientFrom: 'from-lime-500/20', gradientTo: 'to-green-500/20', glowColor: 'shadow-lime-500/30' },
      { type: 'equity_realizer', icon: '\uD83D\uDCB9', name: 'Equity', description: 'Stock options & vesting', gradientFrom: 'from-indigo-500/20', gradientTo: 'to-blue-500/20', glowColor: 'shadow-indigo-500/30' },
      { type: 'pension_guard', icon: '\uD83C\uDFE6', name: 'Pension Guard', description: 'Retirement planning', gradientFrom: 'from-gray-500/20', gradientTo: 'to-slate-500/20', glowColor: 'shadow-gray-500/30' },
      { type: 'relocation_bot', icon: '\u2708\uFE0F', name: 'Relocation', description: 'City comparison & COL', gradientFrom: 'from-sky-500/20', gradientTo: 'to-cyan-500/20', glowColor: 'shadow-sky-500/30' },
      { type: 'vendor_negotiator', icon: '\uD83D\uDD0E', name: 'Vendor Nego', description: 'Contract optimization', gradientFrom: 'from-orange-500/20', gradientTo: 'to-red-500/20', glowColor: 'shadow-orange-500/30' },
      { type: 'succession_sentry', icon: '\uD83D\uDC51', name: 'Succession', description: 'Leadership pipeline', gradientFrom: 'from-rose-500/20', gradientTo: 'to-pink-500/20', glowColor: 'shadow-rose-500/30' },
    ],
  },
  {
    id: 'culture_empathy',
    name: 'Culture & Empathy',
    icon: '\u2764\uFE0F',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-rose-500',
    agents: [
      { type: 'culture_weaver', icon: '\uD83C\uDF10', name: 'Culture Weaver', description: 'Org values & diagnostics', gradientFrom: 'from-violet-500/20', gradientTo: 'to-purple-500/20', glowColor: 'shadow-violet-500/30' },
      { type: 'bias_neutralizer', icon: '\u2696\uFE0F', name: 'Bias Neutralizer', description: 'Bias detection & fair language', gradientFrom: 'from-amber-500/20', gradientTo: 'to-yellow-500/20', glowColor: 'shadow-amber-500/30' },
      { type: 'gratitude_sentinel', icon: '\uD83D\uDE4F', name: 'Gratitude', description: 'Appreciation analytics', gradientFrom: 'from-emerald-500/20', gradientTo: 'to-green-500/20', glowColor: 'shadow-emerald-500/30' },
      { type: 'conflict_mediator', icon: '\uD83D\uDD4A\uFE0F', name: 'Mediator', description: 'Interpersonal conflict resolution', gradientFrom: 'from-blue-500/20', gradientTo: 'to-sky-500/20', glowColor: 'shadow-blue-500/30' },
      { type: 'inclusion_monitor', icon: '\uD83C\uDF08', name: 'Inclusion', description: 'Diversity & belonging metrics', gradientFrom: 'from-pink-500/20', gradientTo: 'to-fuchsia-500/20', glowColor: 'shadow-pink-500/30' },
      { type: 'empathy_coach', icon: '\uD83D\uDCAC', name: 'Empathy Coach', description: 'Emotional intelligence training', gradientFrom: 'from-teal-500/20', gradientTo: 'to-cyan-500/20', glowColor: 'shadow-teal-500/30' },
      { type: 'social_bonding', icon: '\uD83C\uDFC6', name: 'Social Bonding', description: 'Team building activities', gradientFrom: 'from-orange-500/20', gradientTo: 'to-amber-500/20', glowColor: 'shadow-orange-500/30' },
      { type: 'legacy_archivist', icon: '\uD83D\uDCDC', name: 'Legacy Archive', description: 'Institutional knowledge', gradientFrom: 'from-gray-500/20', gradientTo: 'to-slate-500/20', glowColor: 'shadow-gray-500/30' },
      { type: 'whistleblower', icon: '\uD83D\uDCE2', name: 'Whistleblower', description: 'Ethical reporting guidance', gradientFrom: 'from-red-500/20', gradientTo: 'to-rose-500/20', glowColor: 'shadow-red-500/30' },
      { type: 'mood_radiator', icon: '\uD83C\uDF21\uFE0F', name: 'Mood Radiator', description: 'Team sentiment dashboard', gradientFrom: 'from-indigo-500/20', gradientTo: 'to-violet-500/20', glowColor: 'shadow-indigo-500/30' },
    ],
  },
  {
    id: 'governance_logic',
    name: 'Governance & Logic',
    icon: '\uD83D\uDCDC',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-rose-500',
    agents: [
      { type: 'posh_sentinel', icon: '\uD83D\uDEE1\uFE0F', name: 'POSH Sentinel', description: 'Harassment prevention', gradientFrom: 'from-red-500/20', gradientTo: 'to-rose-500/20', glowColor: 'shadow-red-500/30' },
      { type: 'labor_compliance', icon: '\uD83D\uDCDC', name: 'Labor Law', description: 'Working hours & regulations', gradientFrom: 'from-blue-500/20', gradientTo: 'to-indigo-500/20', glowColor: 'shadow-blue-500/30' },
      { type: 'policy_translator', icon: '\uD83D\uDCD6', name: 'Policy Translate', description: 'Plain language rules', gradientFrom: 'from-teal-500/20', gradientTo: 'to-emerald-500/20', glowColor: 'shadow-teal-500/30' },
      { type: 'data_privacy', icon: '\uD83D\uDD10', name: 'Data Privacy', description: 'GDPR & data protection', gradientFrom: 'from-purple-500/20', gradientTo: 'to-violet-500/20', glowColor: 'shadow-purple-500/30' },
      { type: 'audit_trail', icon: '\uD83D\uDD0D', name: 'Audit Trail', description: 'Activity logs & compliance', gradientFrom: 'from-gray-500/20', gradientTo: 'to-slate-500/20', glowColor: 'shadow-gray-500/30' },
      { type: 'conflict_of_interest', icon: '\u26A0\uFE0F', name: 'COI Detector', description: 'Competing interests check', gradientFrom: 'from-amber-500/20', gradientTo: 'to-orange-500/20', glowColor: 'shadow-amber-500/30' },
      { type: 'leave_optimizer', icon: '\uD83C\uDFD6\uFE0F', name: 'Leave Optimizer', description: 'PTO & vacation planning', gradientFrom: 'from-sky-500/20', gradientTo: 'to-blue-500/20', glowColor: 'shadow-sky-500/30' },
      { type: 'onboarding_orchestrator', icon: '\uD83C\uDFAC', name: 'Onboard Orch', description: 'New hire coordination', gradientFrom: 'from-green-500/20', gradientTo: 'to-emerald-500/20', glowColor: 'shadow-green-500/30' },
    ],
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
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set(['core']));
  const { theme } = useAIWorkspaceStore();

  const toggleCluster = (id: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Collapsed icon-only view
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-3 overflow-y-auto">
        <button
          onClick={() => setCollapsed(false)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
            theme === 'light'
              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          title="Expand agent panel"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        {AGENT_CLUSTERS.map((cluster) => (
          <div key={cluster.id} className="flex flex-col items-center gap-1">
            <span className="text-xs mt-2 mb-0.5" title={cluster.name}>{cluster.icon}</span>
            {cluster.agents.map((agent) => (
              <button
                key={agent.type}
                onClick={() => onSelectAgent(agent.type)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-all duration-200 ${
                  selectedAgent === agent.type
                    ? `bg-gradient-to-br ${agent.gradientFrom} ${agent.gradientTo} shadow-lg ${agent.glowColor} ${T.selectedRing(theme)}`
                    : theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5'
                }`}
                title={agent.name}
              >
                {agent.icon}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Expanded view with accordion clusters
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className={`text-sm font-semibold ${T.textPrimary(theme)}`}>
          AI Agents <span className={`text-xs font-normal ${T.textMuted(theme)}`}>(52)</span>
        </h2>
        <button
          onClick={() => setCollapsed(true)}
          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
            theme === 'light'
              ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
          title="Collapse panel"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cluster Accordion */}
      <div className={`flex-1 overflow-y-auto px-2 pb-3 ${T.scrollbar(theme)}`}>
        {AGENT_CLUSTERS.map((cluster) => {
          const isExpanded = expandedClusters.has(cluster.id);
          const hasSelected = cluster.agents.some(a => a.type === selectedAgent);

          return (
            <div key={cluster.id} className="mb-1">
              {/* Cluster Header */}
              <button
                onClick={() => toggleCluster(cluster.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-200 ${
                  hasSelected
                    ? theme === 'light'
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-white/[0.08] text-white'
                    : theme === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                <span className="text-sm">{cluster.icon}</span>
                <span className="flex-1 text-xs font-semibold truncate">{cluster.name}</span>
                <span className={`text-[10px] ${T.textMuted(theme)}`}>{cluster.agents.length}</span>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {/* Agent Cards */}
              {isExpanded && (
                <div className="mt-1 space-y-1 pl-1">
                  {cluster.agents.map((agent) => {
                    const isSelected = selectedAgent === agent.type;

                    return (
                      <button
                        key={agent.type}
                        onClick={() => onSelectAgent(agent.type)}
                        className={`group w-full rounded-lg p-2 text-left transition-all duration-200 ${
                          isSelected
                            ? `bg-gradient-to-br ${agent.gradientFrom} ${agent.gradientTo} shadow-md ${agent.glowColor} ${T.selectedRing(theme)}`
                            : theme === 'light'
                            ? 'bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                            : 'bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-sm transition-transform duration-200 ${
                            isSelected ? 'scale-110' : 'group-hover:scale-105'
                          }`}>
                            {agent.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium truncate transition-colors ${
                              isSelected
                                ? T.textPrimary(theme)
                                : theme === 'light'
                                ? 'text-gray-700 group-hover:text-gray-900'
                                : 'text-gray-300 group-hover:text-white'
                            }`}>
                              {agent.name}
                            </p>
                            <p className={`text-[10px] truncate ${T.textMuted(theme)}`}>
                              {agent.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
