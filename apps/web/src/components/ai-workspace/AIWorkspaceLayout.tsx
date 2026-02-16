/**
 * AIWorkspaceLayout - Full-screen 3-column responsive layout for the AI Workspace.
 *
 * Structure:
 * ┌──────────────────────────────────────────────────────────────┐
 * │  WorkspaceStatsBar (top)                                     │
 * ├────────────┬──────────────────────────────┬──────────────────┤
 * │            │                              │                  │
 * │ AgentPanel │      AIChatPanel             │   InsightFeed    │
 * │  (280px)   │       (flex-1)               │    (320px)       │
 * │            │                              │                  │
 * ├────────────┴──────────────────────────────┴──────────────────┤
 * │  QuickActionsRibbon                                          │
 * │  ConversationBar (bottom)                                    │
 * └──────────────────────────────────────────────────────────────┘
 *
 * On mobile (< lg): single column with slide-out panels via hamburger toggles.
 * All panels use glassmorphism: bg-white/5 backdrop-blur-xl border-white/10.
 */

import { useState, useCallback } from 'react';
import {
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { ParticleBackground } from './ParticleBackground';
import { WorkspaceStatsBar } from './WorkspaceStatsBar';
import { AgentPanel, type AgentType } from './AgentPanel';
import { AIChatPanel } from './AIChatPanel';
import { InsightFeed } from './InsightFeed';
import { QuickActionsRibbon } from './QuickActionsRibbon';
import { ConversationBar } from './ConversationBar';

// ── Component ─────────────────────────────────────────────────

export function AIWorkspaceLayout() {
  // State
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showInsightPanel, setShowInsightPanel] = useState(false);

  // Quick-action prompt injection: when set, AIChatPanel picks it up and clears it
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const handleSelectAgent = useCallback((agent: AgentType) => {
    setSelectedAgent(agent);
    setShowAgentPanel(false); // close mobile drawer
  }, []);

  const handleConversationChange = useCallback((id: string) => {
    setConversationId(id);
  }, []);

  const handleNewChat = useCallback(() => {
    setConversationId(null);
    setSelectedAgent(null);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setConversationId(id);
  }, []);

  const handleQuickAction = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
  }, []);

  return (
    <div className="relative flex h-screen w-full flex-col bg-gray-950 overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />

      {/* ── Top Bar ───────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-4 py-2 lg:px-6">
        {/* Mobile: Agent panel toggle */}
        <button
          onClick={() => setShowAgentPanel(!showAgentPanel)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors lg:hidden"
          title="Toggle agents"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
            <SparklesIcon className="h-4 w-4 text-purple-400" />
          </div>
          <span className="hidden sm:block text-sm font-semibold text-white">
            AI Workspace
          </span>
        </div>

        {/* Stats Bar (desktop) */}
        <div className="hidden lg:block">
          <WorkspaceStatsBar />
        </div>

        {/* Mobile: Insight panel toggle */}
        <button
          onClick={() => setShowInsightPanel(!showInsightPanel)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors lg:hidden"
          title="Toggle insights"
        >
          <LightBulbIcon className="h-5 w-5" />
        </button>
      </header>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 overflow-hidden px-2 lg:px-4 gap-2 lg:gap-3">
        {/* ─ Left: Agent Panel (Desktop) ─ */}
        <aside className="hidden lg:flex w-[280px] flex-shrink-0 flex-col rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <AgentPanel
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
          />
        </aside>

        {/* ─ Left: Agent Panel (Mobile Overlay) ─ */}
        {showAgentPanel && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setShowAgentPanel(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-gray-950/95 backdrop-blur-xl border-r border-white/10 lg:hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-sm font-semibold text-white">AI Agents</span>
                <button
                  onClick={() => setShowAgentPanel(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <AgentPanel
                selectedAgent={selectedAgent}
                onSelectAgent={handleSelectAgent}
              />
            </aside>
          </>
        )}

        {/* ─ Center: Chat Panel ─ */}
        <main className="flex flex-1 flex-col rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden min-w-0">
          <AIChatPanel
            selectedAgent={selectedAgent}
            conversationId={conversationId}
            onConversationChange={handleConversationChange}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={() => setPendingPrompt(null)}
            key={conversationId ?? 'new'}
          />
        </main>

        {/* ─ Right: Insight Feed (Desktop) ─ */}
        <aside className="hidden lg:flex w-[320px] flex-shrink-0 flex-col rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <InsightFeed />
        </aside>

        {/* ─ Right: Insight Feed (Mobile Overlay) ─ */}
        {showInsightPanel && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setShowInsightPanel(false)}
            />
            <aside className="fixed inset-y-0 right-0 z-50 w-[320px] flex flex-col bg-gray-950/95 backdrop-blur-xl border-l border-white/10 lg:hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-sm font-semibold text-white">Insights</span>
                <button
                  onClick={() => setShowInsightPanel(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <InsightFeed />
            </aside>
          </>
        )}
      </div>

      {/* ── Bottom Section ────────────────────────────────────── */}
      <footer className="relative z-10 flex flex-col border-t border-white/5">
        {/* Quick Actions Ribbon */}
        <div className="border-b border-white/5">
          <QuickActionsRibbon onAction={handleQuickAction} />
        </div>

        {/* Conversation Bar */}
        <ConversationBar
          activeConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />
      </footer>
    </div>
  );
}
