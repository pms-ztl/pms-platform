/**
 * AI Chat Widget — floating chat panel available on all pages.
 *
 * Theme-aware: adapts to light/dark mode automatically.
 * Features:
 * - Floating animated button in bottom-right corner
 * - Slide-up glassmorphism chat panel
 * - Agent type selector (grouped by cluster)
 * - Conversation history
 * - Rich markdown rendering (bold, code, lists, headers, links)
 * - Typing indicator with pulse animation
 * - Stylish gradient bubbles with avatars
 * - Copy-to-clipboard for assistant messages
 */

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { aiApi } from '../../lib/api';
import { useAIChatStore } from '../../store/ai-chat';
import { useAIWorkspaceStore } from '../../store/ai-workspace';

// ── Agent Options (grouped by cluster) ─────────────────────

const AGENT_GROUPS = [
  { label: '', options: [{ value: '', label: 'Auto-detect (52 agents)', icon: '🤖' }] },
  {
    label: 'Core PMS',
    options: [
      { value: 'nlp_query', label: 'Data Query', icon: '🔍' },
      { value: 'performance', label: 'Performance', icon: '🎯' },
      { value: 'coaching', label: 'Coaching', icon: '🧑‍🏫' },
      { value: 'career', label: 'Career Dev', icon: '🚀' },
      { value: 'strategic_alignment', label: 'Strategy', icon: '🎯' },
      { value: 'workforce_intel', label: 'Workforce Intel', icon: '🧠' },
      { value: 'report', label: 'Reports', icon: '📋' },
      { value: 'license', label: 'License', icon: '🔑' },
      { value: 'security', label: 'Security', icon: '🔒' },
      { value: 'governance', label: 'Governance', icon: '⚖️' },
      { value: 'talent_marketplace', label: 'Talent Market', icon: '🏪' },
      { value: 'conflict_resolution', label: 'Conflict', icon: '🤝' },
      { value: 'onboarding', label: 'Onboarding', icon: '🎓' },
      { value: 'notification', label: 'Notifications', icon: '🔔' },
      { value: 'excel_validation', label: 'Excel AI', icon: '📄' },
    ],
  },
  {
    label: 'Bio-Performance',
    options: [
      { value: 'neuro_focus', label: 'Neuro Focus', icon: '🧠' },
      { value: 'circadian_sync', label: 'Circadian Sync', icon: '🌙' },
      { value: 'micro_break', label: 'Micro Break', icon: '⏰' },
      { value: 'cortisol_monitor', label: 'Cortisol Monitor', icon: '📉' },
      { value: 'burnout_interceptor', label: 'Burnout Guard', icon: '🛡️' },
      { value: 'sleep_optimizer', label: 'Sleep Optimizer', icon: '💤' },
      { value: 'ergonomics', label: 'Ergonomics', icon: '🪑' },
      { value: 'hydration_nutrition', label: 'Hydration', icon: '💧' },
      { value: 'vocal_tone', label: 'Vocal Tone', icon: '🎤' },
      { value: 'environment_ctrl', label: 'Environment', icon: '🌡️' },
    ],
  },
  {
    label: 'Hyper-Learning',
    options: [
      { value: 'micro_learning', label: 'Micro Learn', icon: '📖' },
      { value: 'sparring_partner', label: 'Sparring', icon: '🥊' },
      { value: 'skill_gap_forecaster', label: 'Skill Forecast', icon: '🔮' },
      { value: 'career_sim', label: 'Career Sim', icon: '🎮' },
      { value: 'knowledge_broker', label: 'Knowledge Broker', icon: '🤝' },
      { value: 'linguistic_refiner', label: 'Linguistic', icon: '✍️' },
      { value: 'curiosity_scout', label: 'Curiosity Scout', icon: '🔭' },
      { value: 'logic_validator', label: 'Logic Check', icon: '🧩' },
      { value: 'shadow_learning', label: 'Shadow Learn', icon: '👥' },
      { value: 'ar_mentor', label: 'AR Mentor', icon: '🤽' },
      { value: 'credential_ledger', label: 'Credentials', icon: '🎖️' },
      { value: 'cross_training', label: 'Cross-Training', icon: '🔀' },
    ],
  },
  {
    label: 'Liquid Workforce',
    options: [
      { value: 'market_value', label: 'Market Value', icon: '📊' },
      { value: 'task_bidder', label: 'Task Bidder', icon: '📦' },
      { value: 'gig_sourcer', label: 'Gig Sourcer', icon: '🎪' },
      { value: 'nano_payment', label: 'Nano Payment', icon: '⭐' },
      { value: 'succession_sentry', label: 'Succession', icon: '👑' },
      { value: 'tax_optimizer', label: 'Tax Optimizer', icon: '💵' },
      { value: 'equity_realizer', label: 'Equity', icon: '💹' },
      { value: 'pension_guard', label: 'Pension Guard', icon: '🏦' },
      { value: 'relocation_bot', label: 'Relocation', icon: '✈️' },
      { value: 'vendor_negotiator', label: 'Vendor Nego', icon: '🔎' },
    ],
  },
  {
    label: 'Culture & Empathy',
    options: [
      { value: 'empathy_coach', label: 'Empathy Coach', icon: '💬' },
      { value: 'culture_weaver', label: 'Culture Weaver', icon: '🌐' },
      { value: 'mood_radiator', label: 'Mood Radiator', icon: '🌡️' },
      { value: 'bias_neutralizer', label: 'Bias Neutralizer', icon: '⚖️' },
      { value: 'conflict_mediator', label: 'Mediator', icon: '🕊️' },
      { value: 'inclusion_monitor', label: 'Inclusion', icon: '🌈' },
      { value: 'gratitude_sentinel', label: 'Gratitude', icon: '🙏' },
      { value: 'social_bonding', label: 'Social Bonding', icon: '🏆' },
      { value: 'legacy_archivist', label: 'Legacy Archive', icon: '📜' },
      { value: 'whistleblower', label: 'Whistleblower', icon: '📢' },
    ],
  },
  {
    label: 'Governance & Logic',
    options: [
      { value: 'posh_sentinel', label: 'POSH Sentinel', icon: '🛡️' },
      { value: 'labor_compliance', label: 'Labor Law', icon: '📜' },
      { value: 'policy_translator', label: 'Policy Translate', icon: '📖' },
      { value: 'data_privacy', label: 'Data Privacy', icon: '🔐' },
      { value: 'audit_trail', label: 'Audit Trail', icon: '🔍' },
      { value: 'conflict_of_interest', label: 'COI Detector', icon: '⚠️' },
      { value: 'leave_optimizer', label: 'Leave Optimizer', icon: '🏖️' },
      { value: 'onboarding_orchestrator', label: 'Onboard Orch', icon: '🎬' },
    ],
  },
];

// ── Theme detection ────────────────────────────────────────

function useIsDark() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

// ── Markdown Renderer (theme-aware) ────────────────────────

function renderMarkdown(content: string, isDark: boolean): string {
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (slightly smaller mono)
  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    isDark
      ? '<pre class="my-2 rounded-lg bg-gray-900/90 p-3 text-[13px] font-mono text-emerald-300 overflow-x-auto border border-gray-700/50 leading-relaxed"><code>$2</code></pre>'
      : '<pre class="my-2 rounded-lg bg-gray-100 p-3 text-[13px] font-mono text-indigo-700 overflow-x-auto border border-gray-200 leading-relaxed"><code>$2</code></pre>',
  );

  // Headers — slightly bigger than body text
  html = html.replace(
    /^#### (.+)$/gm,
    isDark
      ? '<h5 class="mt-2 mb-1 text-[13px] font-bold text-indigo-400">$1</h5>'
      : '<h5 class="mt-2 mb-1 text-[13px] font-bold text-indigo-600">$1</h5>',
  );
  html = html.replace(
    /^### (.+)$/gm,
    isDark
      ? '<h4 class="mt-2.5 mb-1 text-[13px] font-bold uppercase tracking-wide text-indigo-400">$1</h4>'
      : '<h4 class="mt-2.5 mb-1 text-[13px] font-bold uppercase tracking-wide text-indigo-600">$1</h4>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    isDark
      ? '<h3 class="mt-2.5 mb-1 text-[15px] font-bold text-indigo-300">$1</h3>'
      : '<h3 class="mt-2.5 mb-1 text-[15px] font-bold text-indigo-700">$1</h3>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    isDark
      ? '<h2 class="mt-2.5 mb-1.5 text-base font-extrabold text-indigo-200">$1</h2>'
      : '<h2 class="mt-2.5 mb-1.5 text-base font-extrabold text-gray-900">$1</h2>',
  );

  // Bold — inherit size, just add weight + color
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    isDark
      ? '<strong class="font-semibold text-white">$1</strong>'
      : '<strong class="font-semibold text-gray-900">$1</strong>',
  );

  // Italic
  html = html.replace(
    /\*(.+?)\*/g,
    isDark
      ? '<em class="italic text-gray-200">$1</em>'
      : '<em class="italic text-gray-600">$1</em>',
  );

  // Inline code (slightly smaller mono)
  html = html.replace(
    /`([^`]+)`/g,
    isDark
      ? '<code class="rounded bg-white/10 px-1.5 py-0.5 text-[13px] font-mono text-cyan-300 border border-white/5">$1</code>'
      : '<code class="rounded bg-indigo-50 px-1.5 py-0.5 text-[13px] font-mono text-indigo-600 border border-indigo-100">$1</code>',
  );

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    isDark
      ? '<a href="$2" target="_blank" rel="noopener" class="text-cyan-400 underline decoration-cyan-400/30 hover:decoration-cyan-400 transition-colors">$1</a>'
      : '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-300 hover:decoration-indigo-600 transition-colors">$1</a>',
  );

  // Numbered lists — same size as body
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    isDark
      ? '<div class="flex gap-2 my-1 items-start"><span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">$1</span><span class="flex-1">$2</span></div>'
      : '<div class="flex gap-2 my-1 items-start"><span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">$1</span><span class="flex-1">$2</span></div>',
  );

  // Bullet lists — same size as body
  html = html.replace(
    /^[-*]\s+(.+)$/gm,
    isDark
      ? '<div class="flex gap-2 my-1 items-start"><span class="mt-2 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400"></span><span class="flex-1">$1</span></div>'
      : '<div class="flex gap-2 my-1 items-start"><span class="mt-2 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"></span><span class="flex-1">$1</span></div>',
  );

  // Horizontal rules
  html = html.replace(
    /^---+$/gm,
    isDark
      ? '<hr class="my-3 border-t border-white/10" />'
      : '<hr class="my-3 border-t border-gray-200" />',
  );

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="my-1.5">');

  // Single newlines
  html = html.replace(/\n/g, '<br/>');

  return html;
}

// ── Component ──────────────────────────────────────────────

export function AIChatWidget() {
  const { isOpen, activeConversationId, agentType, setOpen, setConversation, setAgentType } =
    useAIChatStore();
  const isDark = useIsDark();
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<
    Array<{ role: string; content: string; id: string; timestamp?: number }>
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversation history
  const { data: conversationData } = useQuery({
    queryKey: ['ai', 'conversation', activeConversationId],
    queryFn: () => (activeConversationId ? aiApi.getConversation(activeConversationId) : null),
    enabled: !!activeConversationId && isOpen,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      aiApi.chat(msg, agentType || undefined, activeConversationId || undefined),
    onSuccess: (response) => {
      const data = (response as any)?.data ?? response;
      if (data.conversationId) setConversation(data.conversationId);
      setLocalMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, id: `assistant-${Date.now()}`, timestamp: Date.now() },
      ]);
      queryClient.invalidateQueries({ queryKey: ['ai'] });
    },
    onError: (error: any) => {
      setLocalMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error?.message ?? 'Unknown error'}. Please try again.`,
          id: `error-${Date.now()}`,
          timestamp: Date.now(),
        },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, chatMutation.isPending]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    if (conversationData) {
      const data = (conversationData as any)?.data ?? conversationData;
      if (data?.messages) {
        setLocalMessages(
          data.messages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({
              role: m.role,
              content: m.content,
              id: m.id,
              timestamp: new Date(m.createdAt).getTime(),
            })),
        );
      }
    }
  }, [conversationData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || chatMutation.isPending) return;
    setLocalMessages((prev) => [
      ...prev,
      { role: 'user', content: message.trim(), id: `user-${Date.now()}`, timestamp: Date.now() },
    ]);
    chatMutation.mutate(message.trim());
    setMessage('');
  };

  const handleNewChat = () => {
    setConversation(null);
    setLocalMessages([]);
  };

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const selectedAgent = AGENT_GROUPS.flatMap((g) => g.options).find(
    (o) => o.value === (agentType ?? ''),
  );

  // ── Theme tokens ──────────────────────────────────────
  const t = {
    panel: isDark
      ? 'linear-gradient(180deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%)'
      : 'linear-gradient(180deg, #ffffff 0%, #f8faff 50%, #f0f4ff 100%)',
    panelBorder: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
    panelShadow: isDark
      ? '0 0 40px rgba(99,102,241,0.15), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 0 40px rgba(99,102,241,0.08), 0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
    headerBg: isDark
      ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.1))'
      : 'linear-gradient(135deg, #6366f1, #7c3aed)',
    headerBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.1)',
    titleColor: 'text-white',
    headerBtnClass: isDark
      ? 'text-gray-400 hover:bg-white/10 hover:text-white'
      : 'text-white/70 hover:bg-white/20 hover:text-white',
    selectorBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    selectorBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    selectorText: isDark ? 'text-gray-300' : 'text-gray-700',
    selectorChevron: isDark ? 'text-gray-500' : 'text-gray-400',
    dropdownBg: isDark
      ? 'linear-gradient(180deg, #1e1e3f, #161630)'
      : 'linear-gradient(180deg, #ffffff, #f8f9ff)',
    dropdownBorder: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
    dropdownShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
    groupLabel: isDark ? 'text-indigo-400/60' : 'text-indigo-500/80',
    optionText: isDark ? 'text-gray-400' : 'text-gray-600',
    optionActive: isDark ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600',
    optionHover: isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
    emptyTitle: isDark ? 'text-white/90' : 'text-gray-800',
    emptySubtitle: isDark ? 'text-gray-400/80' : 'text-gray-500',
    emptyOrbBg: isDark
      ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))'
      : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
    emptyOrbBorder: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.15)',
    suggestionBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.04)',
    suggestionBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.1)',
    suggestionText: isDark ? 'text-gray-300 group-hover:text-white' : 'text-gray-600 group-hover:text-indigo-700',
    userBubbleBg: isDark
      ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
      : 'linear-gradient(135deg, #6366f1, #7c3aed)',
    userBubbleShadow: isDark
      ? '0 2px 12px rgba(99,102,241,0.25)'
      : '0 2px 12px rgba(99,102,241,0.2)',
    assistantBubbleBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
    assistantBubbleBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    assistantBubbleShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
    assistantText: isDark ? 'text-gray-200' : 'text-gray-700',
    userAvatarBg: isDark
      ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
      : 'linear-gradient(135deg, #6366f1, #7c3aed)',
    aiAvatarBg: isDark
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    copyBtnBg: isDark ? 'bg-gray-800/80' : 'bg-white shadow-md',
    copyBtnBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    copyBtnText: isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700',
    timestampText: isDark ? 'text-gray-500/60' : 'text-gray-400/80',
    typingBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    typingBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    typingLabel: isDark ? 'text-gray-400' : 'text-gray-500',
    inputAreaBg: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
    inputAreaBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    inputText: isDark ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400',
    sendBtnActive: isDark
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'linear-gradient(135deg, #6366f1, #7c3aed)',
    sendBtnInactive: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    footerSub: isDark ? 'text-gray-500/50' : 'text-gray-400/70',
    borderSub: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    statusDotText: isDark ? 'text-emerald-300/80' : 'text-white/80',
  };

  // ── Floating Button ────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-500 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
          boxShadow: '0 0 24px rgba(99, 102, 241, 0.4), 0 8px 32px rgba(0,0,0,0.3)',
        }}
        title="Open AI Assistant"
      >
        <SparklesIcon className="h-6 w-6 text-white transition-transform duration-500 group-hover:rotate-12" />
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
        />
      </button>
    );
  }

  // ── Chat Panel ─────────────────────────────────────────
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[420px] flex-col overflow-hidden rounded-3xl shadow-2xl"
      style={{
        background: t.panel,
        border: `1px solid ${t.panelBorder}`,
        boxShadow: t.panelShadow,
        animation: 'swarm-mode-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-between px-4 py-3.5"
        style={{
          background: t.headerBg,
          borderBottom: `1px solid ${t.headerBorder}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
            }}
          >
            <SparklesIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className={`text-sm font-bold tracking-tight ${t.titleColor}`}>Neural Swarm</h3>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className={`text-[10px] font-medium ${t.statusDotText}`}>65 Agents Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              useAIWorkspaceStore.getState().setAiMode(true);
              setOpen(false);
              if (window.location.pathname !== '/dashboard') window.location.href = '/dashboard';
            }}
            className={`rounded-lg p-2 transition-all ${t.headerBtnClass}`}
            title="Open full AI Workspace"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleNewChat}
            className={`rounded-lg p-2 transition-all ${t.headerBtnClass}`}
            title="New conversation"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className={`rounded-lg p-2 transition-all ${t.headerBtnClass}`}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Agent Selector ─────────────────────────────── */}
      <div className="relative px-3 py-2" style={{ borderBottom: `1px solid ${t.borderSub}` }}>
        <button
          onClick={() => setAgentSelectorOpen(!agentSelectorOpen)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-all"
          style={{
            background: t.selectorBg,
            border: `1px solid ${t.selectorBorder}`,
          }}
        >
          <span className="text-base">{selectedAgent?.icon ?? '🤖'}</span>
          <span className={`flex-1 text-left font-medium ${t.selectorText}`}>
            {selectedAgent?.label ?? 'Auto-detect'}
          </span>
          <svg
            className={`h-3.5 w-3.5 transition-transform ${t.selectorChevron} ${agentSelectorOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {agentSelectorOpen && (
          <div
            className="absolute left-3 right-3 top-full z-20 mt-1 max-h-[250px] overflow-y-auto rounded-xl py-1"
            style={{
              background: t.dropdownBg,
              border: `1px solid ${t.dropdownBorder}`,
              boxShadow: t.dropdownShadow,
            }}
          >
            {AGENT_GROUPS.map((group) => (
              <div key={group.label || 'default'}>
                {group.label && (
                  <div className={`px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider ${t.groupLabel}`}>
                    {group.label}
                  </div>
                )}
                {group.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setAgentType(opt.value || null);
                      setAgentSelectorOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-all ${t.optionHover} ${
                      (agentType ?? '') === opt.value ? t.optionActive : t.optionText
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {localMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <div className="relative mb-5">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: t.emptyOrbBg,
                  border: `1px solid ${t.emptyOrbBorder}`,
                  boxShadow: '0 0 30px rgba(99,102,241,0.1)',
                }}
              >
                <SparklesIcon className="h-7 w-7 text-indigo-400" />
              </div>
              <span
                className="absolute -inset-2 rounded-3xl animate-pulse opacity-20"
                style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', filter: 'blur(8px)' }}
              />
            </div>
            <p className={`text-sm font-semibold ${t.emptyTitle}`}>How can I help you today?</p>
            <p className={`mt-1 text-xs ${t.emptySubtitle}`}>
              Ask about performance, goals, team data, or anything else.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {[
                { text: 'Who are my top performers?', emoji: '🏆' },
                { text: 'How many licenses left?', emoji: '🔑' },
                { text: 'Help me set Q2 goals', emoji: '🎯' },
              ].map((suggestion) => (
                <button
                  key={suggestion.text}
                  onClick={() => {
                    setMessage(suggestion.text);
                    inputRef.current?.focus();
                  }}
                  className="group flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-all hover:scale-[1.02]"
                  style={{
                    background: t.suggestionBg,
                    border: `1px solid ${t.suggestionBorder}`,
                  }}
                >
                  <span>{suggestion.emoji}</span>
                  <span className={`transition-colors ${t.suggestionText}`}>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {localMessages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            {msg.role === 'assistant' ? (
              <div
                className="flex-shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: t.aiAvatarBg, boxShadow: '0 0 8px rgba(99,102,241,0.3)' }}
              >
                <SparklesIcon className="h-3.5 w-3.5 text-white" />
              </div>
            ) : (
              <div
                className="flex-shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: t.userAvatarBg, boxShadow: '0 0 8px rgba(99,102,241,0.2)' }}
              >
                U
              </div>
            )}

            {/* Bubble */}
            <div className="group relative max-w-[82%]">
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'rounded-tr-md text-white' : `rounded-tl-md ${t.assistantText}`
                }`}
                style={
                  msg.role === 'user'
                    ? { background: t.userBubbleBg, boxShadow: t.userBubbleShadow }
                    : {
                        background: t.assistantBubbleBg,
                        border: `1px solid ${t.assistantBubbleBorder}`,
                        boxShadow: t.assistantBubbleShadow,
                      }
                }
              >
                {msg.role === 'assistant' ? (
                  <div
                    className="ai-msg-content break-words [&_p]:my-1.5 [&_pre]:my-2"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content, isDark) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                )}
              </div>

              {/* Copy */}
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className={`absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-lg opacity-0 transition-all group-hover:opacity-100 ${t.copyBtnBg} ${t.copyBtnText}`}
                  style={{ border: `1px solid ${t.copyBtnBorder}` }}
                  title="Copy to clipboard"
                >
                  {copiedId === msg.id ? (
                    <CheckIcon className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ClipboardDocumentIcon className="h-3 w-3" />
                  )}
                </button>
              )}

              {/* Timestamp */}
              {msg.timestamp && (
                <div className={`mt-1 text-[10px] ${t.timestampText} ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing */}
        {chatMutation.isPending && (
          <div className="flex gap-2.5">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: t.aiAvatarBg, boxShadow: '0 0 8px rgba(99,102,241,0.3)' }}
            >
              <SparklesIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <div
              className="rounded-2xl rounded-tl-md px-4 py-3"
              style={{ background: t.typingBg, border: `1px solid ${t.typingBorder}` }}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] mr-1 ${t.typingLabel}`}>Thinking</span>
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: '#8b5cf6', animationDelay: '150ms' }} />
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: '#06b6d4', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="px-3 py-3"
        style={{ borderTop: `1px solid ${t.inputAreaBorder}`, background: t.inputAreaBg }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-1"
          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
        >
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything..."
            disabled={chatMutation.isPending}
            className={`flex-1 bg-transparent py-2.5 text-sm focus:outline-none disabled:opacity-50 ${t.inputText}`}
          />
          <button
            type="submit"
            disabled={!message.trim() || chatMutation.isPending}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all disabled:opacity-30"
            style={{
              background:
                message.trim() && !chatMutation.isPending ? t.sendBtnActive : t.sendBtnInactive,
              boxShadow:
                message.trim() && !chatMutation.isPending ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
            }}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1">
          <span className={`text-[9px] ${t.footerSub}`}>Powered by</span>
          <span
            className="text-[9px] font-semibold"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Neural Swarm AI
          </span>
        </div>
      </form>
    </div>
  );
}
