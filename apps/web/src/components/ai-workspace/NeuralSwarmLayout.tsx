/**
 * NeuralSwarmLayout - Main layout for the Neural Swarm UI.
 *
 * Wraps all 3 swarm modes (Overview, Chat, Orchestrate) with a stunning
 * glassmorphism header featuring a mode-switching segmented control.
 *
 * Supports 3 themes: light, dark, deep-dark via T.* helpers.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  CpuChipIcon,
  ArrowLeftOnRectangleIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme, SwarmMode } from '@/store/ai-workspace';
import * as T from './ai-theme';
import { ParticleBackground } from './ParticleBackground';
import { FloatingAIToggle } from './FloatingAIToggle';
import { SwarmOverview } from './SwarmOverview';
import { SwarmChat } from './SwarmChat';
import { SwarmOrchestration } from './SwarmOrchestration';
import { SwarmTasks } from './SwarmTasks';
import { useAITasksStore } from '@/store/ai-tasks';

// ── Mode configuration ──────────────────────────────────────────

interface ModeConfig {
  key: SwarmMode;
  label: string;
  icon: typeof GlobeAltIcon;
}

const MODES: ModeConfig[] = [
  { key: 'overview', label: 'Overview', icon: GlobeAltIcon },
  { key: 'chat', label: 'Chat', icon: ChatBubbleLeftRightIcon },
  { key: 'orchestrate', label: 'Orchestrate', icon: BoltIcon },
  { key: 'tasks', label: 'Tasks', icon: QueueListIcon },
];

// ── Theme-specific style helpers ────────────────────────────────

function headerGlass(theme: AITheme): string {
  switch (theme) {
    case 'light':
      return 'bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm';
    case 'dark':
      return 'bg-black/40 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/20';
    case 'deep-dark':
      return 'bg-black/60 backdrop-blur-xl border-b border-white/[0.04] shadow-lg shadow-black/40';
  }
}

function modeSwitcherContainer(theme: AITheme): string {
  switch (theme) {
    case 'light':
      return 'bg-gray-100 ring-1 ring-gray-200/50';
    case 'dark':
      return 'bg-white/5 ring-1 ring-white/[0.06]';
    case 'deep-dark':
      return 'bg-white/[0.03] ring-1 ring-white/[0.04]';
  }
}

function activeModeButton(theme: AITheme): string {
  switch (theme) {
    case 'light':
      return 'bg-blue-600 text-white shadow-md shadow-blue-500/30';
    case 'dark':
      return 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/25';
    case 'deep-dark':
      return 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-md shadow-cyan-500/25';
  }
}

function inactiveModeButton(theme: AITheme): string {
  switch (theme) {
    case 'light':
      return 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/60';
    case 'dark':
      return 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]';
    case 'deep-dark':
      return 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]';
  }
}

function logoPillBg(theme: AITheme): string {
  switch (theme) {
    case 'light':
      return 'bg-gradient-to-br from-blue-500/15 to-indigo-500/15';
    case 'dark':
      return 'bg-gradient-to-br from-purple-500/20 to-blue-500/20';
    case 'deep-dark':
      return 'bg-gradient-to-br from-cyan-500/15 to-emerald-500/15';
  }
}

function badgeBg(theme: AITheme): string {
  switch (theme) {
    case 'light':
      return 'bg-blue-500 text-white';
    case 'dark':
      return 'bg-purple-500 text-white';
    case 'deep-dark':
      return 'bg-cyan-500 text-black';
  }
}

function pulsingDotColor(theme: AITheme): string {
  switch (theme) {
    case 'light':
      return 'bg-emerald-500';
    case 'dark':
      return 'bg-emerald-400';
    case 'deep-dark':
      return 'bg-emerald-400';
  }
}

// ── Component ───────────────────────────────────────────────────

export function NeuralSwarmLayout() {
  const { theme, swarmMode, setSwarmMode, orchestrationAgents, aiTransitionPhase, setAiTransitionPhase } =
    useAIWorkspaceStore();
  const pendingApprovalCount = useAITasksStore((s) => s.pendingApprovals.length);

  // Track the previous mode for fade transitions
  const [displayedMode, setDisplayedMode] = useState<SwarmMode>(swarmMode);
  const [transitioning, setTransitioning] = useState(false);

  const handleModeSwitch = useCallback(
    (mode: SwarmMode) => {
      if (mode === swarmMode) return;
      setTransitioning(true);
      // Start fade-out, then swap content after the CSS opacity transition (200ms) completes
      setTimeout(() => {
        setSwarmMode(mode);
        setDisplayedMode(mode);
        // Allow a frame for the new component to mount, then fade in
        requestAnimationFrame(() => {
          setTransitioning(false);
        });
      }, 250);
    },
    [swarmMode, setSwarmMode],
  );

  // Reset to Overview on mount — prevents persisted Orchestrate mode flashing on first load
  useEffect(() => {
    setSwarmMode('overview');
    setDisplayedMode('overview');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync if store changes externally
  useEffect(() => {
    if (swarmMode !== displayedMode && !transitioning) {
      setDisplayedMode(swarmMode);
    }
  }, [swarmMode, displayedMode, transitioning]);

  // ── Rendered mode content ──────────────────────────────────

  const renderModeContent = () => {
    switch (displayedMode) {
      case 'overview':
        return <SwarmOverview />;
      case 'chat':
        return <SwarmChat />;
      case 'orchestrate':
        return <SwarmOrchestration />;
      case 'tasks':
        return <SwarmTasks />;
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col ${T.bg(theme)} overflow-hidden`}
    >
      {/* Particle background layer */}
      <ParticleBackground />

      {/* ── Sticky Header ──────────────────────────────────────── */}
      <header
        className={`relative z-20 flex items-center justify-between px-4 py-3 lg:px-6 ${headerGlass(theme)}`}
      >
        {/* Left: Logo + title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo pill */}
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${logoPillBg(theme)} transition-colors duration-300`}
          >
            <CpuChipIcon
              className={`h-5 w-5 ${T.accentText(theme)} transition-colors duration-300`}
            />
          </div>

          {/* Title block */}
          <div className="hidden sm:flex flex-col min-w-0">
            <span
              className={`bg-gradient-to-r ${T.accentGradient(theme)} bg-clip-text text-sm font-bold leading-tight text-transparent transition-all duration-300`}
            >
              Neural Swarm
            </span>
            <span
              className={`text-[11px] leading-tight ${T.textMuted(theme)} transition-colors duration-300`}
            >
              70 Agents | 6 Clusters
            </span>
          </div>
        </div>

        {/* Center: Mode switcher */}
        <div className="flex items-center justify-center">
          <div
            className={`flex items-center rounded-xl p-1 ${modeSwitcherContainer(theme)} transition-colors duration-300`}
          >
            {MODES.map((mode) => {
              const isActive = swarmMode === mode.key;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => handleModeSwitch(mode.key)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? activeModeButton(theme)
                      : inactiveModeButton(theme)
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{mode.label}</span>

                  {/* Agent count badge for orchestrate mode */}
                  {mode.key === 'orchestrate' &&
                    isActive &&
                    orchestrationAgents.length > 0 && (
                      <span
                        className={`ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${badgeBg(theme)} transition-colors duration-300`}
                      >
                        {orchestrationAgents.length}
                      </span>
                    )}

                  {/* Pending approvals badge for tasks mode */}
                  {mode.key === 'tasks' && pendingApprovalCount > 0 && (
                    <span
                      className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none bg-orange-500 text-white animate-pulse"
                    >
                      {pendingApprovalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: status + exit */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Pulsing dot + status */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${pulsingDotColor(theme)}`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${pulsingDotColor(theme)}`}
              />
            </span>
            <span
              className={`hidden md:block text-xs font-medium ${T.accentText(theme)} transition-colors duration-300`}
            >
              Swarm Active
            </span>
          </div>

          {/* Divider */}
          <div className={`hidden sm:block h-5 w-px ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} />

          {/* Exit AI Mode button */}
          <button
            onClick={() => {
              if (aiTransitionPhase === 'idle') setAiTransitionPhase('exiting');
            }}
            title="Exit Neural Swarm AI"
            className={`
              flex items-center gap-1.5 rounded-lg px-3 py-1.5
              text-xs font-semibold border transition-all duration-200
              ${theme === 'light'
                ? 'border-gray-200/80 text-gray-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50/70'
                : 'border-white/[0.09] text-gray-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10'
              }
            `}
          >
            <ArrowLeftOnRectangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 overflow-hidden">
        <div
          className={`flex-1 overflow-y-auto transition-opacity duration-200 ease-in-out ${
            transitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {renderModeContent()}
        </div>
      </main>

      {/* Floating theme toggle */}
      <FloatingAIToggle />
    </div>
  );
}
