/**
 * AIWorkspaceTransition
 *
 * Fullscreen cinematic overlay that plays for 3 seconds when the user
 * enters or exits the Neural Swarm AI workspace.
 *
 * Total duration: 3 000 ms
 *   0  –  210 ms  → overlay fades in
 *   210 – 2 400 ms → fully visible, animations play
 *   2 400 – 3 000 ms → overlay fades out (pointer-events off at 2 400 ms)
 *   At exactly 1 500 ms the parent flips `isAiMode` in the background.
 *
 * Keyframes live in index.html so they are always available.
 */

import { useEffect, useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import type { AITransitionPhase } from '@/store/ai-workspace';

// ── Fixed node positions (deterministic, no randomness on re-render) ──────

const NODES = [
  { x: '8%',  y: '18%', delay: '0.30s', size: 4 },
  { x: '88%', y: '14%', delay: '0.55s', size: 3 },
  { x: '6%',  y: '68%', delay: '0.80s', size: 5 },
  { x: '92%', y: '62%', delay: '0.20s', size: 3 },
  { x: '22%', y: '88%', delay: '0.65s', size: 4 },
  { x: '78%', y: '82%', delay: '0.40s', size: 3 },
  { x: '50%', y: '8%',  delay: '0.50s', size: 4 },
  { x: '50%', y: '92%', delay: '0.75s', size: 3 },
  { x: '3%',  y: '42%', delay: '1.00s', size: 4 },
  { x: '97%', y: '38%', delay: '0.35s', size: 3 },
  { x: '33%', y: '22%', delay: '1.10s', size: 3 },
  { x: '67%', y: '28%', delay: '0.60s', size: 4 },
  { x: '15%', y: '55%', delay: '0.90s', size: 3 },
  { x: '85%', y: '50%', delay: '0.45s', size: 4 },
  { x: '40%', y: '76%', delay: '0.70s', size: 3 },
  { x: '60%', y: '72%', delay: '0.25s', size: 4 },
];

// ── Accent colours per phase ──────────────────────────────────────────────

function accent(phase: AITransitionPhase) {
  if (phase === 'entering') {
    return {
      color:      '#22d3ee',          // cyan-400
      colorDim:   'rgba(34,211,238,0.14)',
      ringA:      'rgba(34,211,238,0.7)',
      ringB:      'rgba(52,211,153,0.5)',  // emerald
      scanFrom:   'transparent',
      scanMid:    '#22d3ee',
      label1:     'INITIALIZING SWARM…',
      label2:     '✓  SWARM ONLINE',
      color2:     '#34d399',          // emerald-400 after flip
    };
  }
  return {
    color:      '#f97316',          // orange-500
    colorDim:   'rgba(249,115,22,0.14)',
    ringA:      'rgba(249,115,22,0.7)',
    ringB:      'rgba(251,191,36,0.5)',  // amber
    scanFrom:   'transparent',
    scanMid:    '#f97316',
    label1:     'DISCONNECTING…',
    label2:     '✓  RETURNING TO DASHBOARD',
    color2:     '#a78bfa',          // violet after flip
  };
}

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  phase: 'entering' | 'exiting';
}

export function AIWorkspaceTransition({ phase }: Props) {
  const a = accent(phase);

  // Status text flips at 1 500 ms (when parent performs the real mode switch)
  const [statusText,  setStatusText]  = useState(a.label1);
  const [statusColor, setStatusColor] = useState(a.color);
  // Disable pointer-events before the fade-out finishes so clicks reach content beneath
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStatusText(a.label2);
      setStatusColor(a.color2);
    }, 1_500);
    const t2 = setTimeout(() => setFading(true), 2_400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // Run once on mount — a is derived from phase which never changes for this instance
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
      style={{
        background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${a.colorDim} 0%, #050508 65%)`,
        animation: 'aiOverlayLifecycle 3s ease forwards',
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      {/* ── Fine grid ──────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${a.color}0A 1px, transparent 1px),
            linear-gradient(90deg, ${a.color}0A 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
          animation: 'aiGridFade 3s ease forwards',
        }}
      />

      {/* ── Horizontal scanning line ───────────────────────────── */}
      <div
        className="absolute left-0 right-0"
        style={{
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${a.scanMid} 30%, ${a.scanMid} 70%, transparent 100%)`,
          boxShadow: `0 0 14px 4px ${a.color}70`,
          animation: 'aiScanLine 2.2s ease-in-out 0.25s both',
        }}
      />

      {/* ── Expanding rings (3, staggered) ─────────────────────── */}
      {[0, 0.45, 0.9].map((delay, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width:     140,
            height:    140,
            marginLeft: -70,
            marginTop:  -70,
            border: `1.5px solid ${i === 0 ? a.ringA : a.ringB}`,
            animation: `aiRingExpand 1.9s cubic-bezier(0.2, 0, 0.8, 1) ${delay}s infinite`,
          }}
        />
      ))}

      {/* ── Central content block ──────────────────────────────── */}
      <div
        className="relative flex flex-col items-center"
        style={{ gap: 20, marginTop: -50 }}
      >
        {/* Hexagonal logo */}
        <div
          style={{
            width:  80,
            height: 80,
            borderRadius: 18,
            border: `2px solid ${a.color}`,
            background: `radial-gradient(circle, ${a.colorDim} 0%, transparent 80%)`,
            boxShadow: `0 0 32px ${a.color}55, inset 0 0 24px ${a.color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'aiLogoReveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both',
          }}
        >
          <SparklesIcon style={{ width: 36, height: 36, color: a.color }} />
        </div>

        {/* "NEURAL SWARM" title */}
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.9rem, 4.5vw, 3rem)',
            fontWeight: 700,
            color: a.color,
            letterSpacing: '0.06em',
            lineHeight: 1,
            textShadow: `0 0 24px ${a.color}80`,
            animation: 'aiTextReveal 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both',
          }}
        >
          NEURAL SWARM
        </div>

        {/* Phase label */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: '0.72rem',
            fontWeight: 500,
            letterSpacing: '0.14em',
            color: statusColor,
            transition: 'color 0.4s ease',
            animation: 'aiStatusBlink 0.85s ease-in-out 0.85s 2',
          }}
        >
          {statusText}
        </div>
      </div>

      {/* ── Scattered floating nodes ───────────────────────────── */}
      {NODES.map((node, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left:      node.x,
            top:       node.y,
            width:     node.size,
            height:    node.size,
            background: a.color,
            boxShadow: `0 0 6px 1px ${a.color}90`,
            animation: `aiNodePulse 1.3s ease-in-out ${node.delay} infinite`,
          }}
        />
      ))}

      {/* ── Corner decorations ─────────────────────────────────── */}
      {[
        'top-6 left-6',
        'top-6 right-6',
        'bottom-6 left-6',
        'bottom-6 right-6',
      ].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos}`}
          style={{
            width:  28,
            height: 28,
            borderTop:    i < 2 ? `2px solid ${a.color}60` : 'none',
            borderBottom: i >= 2 ? `2px solid ${a.color}60` : 'none',
            borderLeft:   i % 2 === 0 ? `2px solid ${a.color}60` : 'none',
            borderRight:  i % 2 === 1 ? `2px solid ${a.color}60` : 'none',
            borderRadius: i === 0 ? '4px 0 0 0' : i === 1 ? '0 4px 0 0' : i === 2 ? '0 0 0 4px' : '0 0 4px 0',
          }}
        />
      ))}
    </div>
  );
}
