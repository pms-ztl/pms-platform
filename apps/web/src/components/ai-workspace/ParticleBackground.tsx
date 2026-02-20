/**
 * ParticleBackground - Subtle animated floating particles for the AI Workspace.
 * Theme-aware: adapts particle colors based on light/dark/deep-dark.
 *
 * Renders 18 small circles that drift slowly across the viewport using pure
 * CSS keyframe animations. Colors vary by theme with very low opacity
 * (0.05-0.15) so they never distract from the main content.
 *
 * The component is absolutely positioned and pointer-events: none so it sits
 * behind all interactive elements.
 */

import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';

// ── Color palettes per theme ──────────────────────────────────────

const COLORS: Record<AITheme, string[]> = {
  light: ['#93c5fd', '#a5b4fc', '#7dd3fc', '#86efac', '#93c5fd', '#a5b4fc'],
  dark: ['#a78bfa', '#818cf8', '#67e8f9', '#c084fc', '#7dd3fc', '#a78bfa'],
  'deep-dark': ['#22d3ee', '#34d399', '#2dd4bf', '#06b6d4', '#10b981', '#22d3ee'],
};

interface ParticleSpec {
  size: number;
  x: string;
  y: string;
  colorIndex: number;
  opacity: number;
  duration: number;
  delay: number;
}

const PARTICLES: ParticleSpec[] = [
  { size: 3, x: '5%',  y: '10%', colorIndex: 0, opacity: 0.10, duration: 18, delay: 0   },
  { size: 4, x: '15%', y: '25%', colorIndex: 1, opacity: 0.08, duration: 22, delay: 1.2 },
  { size: 2, x: '25%', y: '60%', colorIndex: 2, opacity: 0.12, duration: 20, delay: 0.5 },
  { size: 5, x: '35%', y: '15%', colorIndex: 3, opacity: 0.06, duration: 25, delay: 2   },
  { size: 3, x: '45%', y: '75%', colorIndex: 4, opacity: 0.10, duration: 19, delay: 0.8 },
  { size: 2, x: '55%', y: '40%', colorIndex: 0, opacity: 0.15, duration: 23, delay: 1.5 },
  { size: 4, x: '65%', y: '85%', colorIndex: 1, opacity: 0.07, duration: 21, delay: 3   },
  { size: 3, x: '75%', y: '30%', colorIndex: 2, opacity: 0.11, duration: 17, delay: 0.3 },
  { size: 2, x: '85%', y: '55%', colorIndex: 3, opacity: 0.09, duration: 24, delay: 2.5 },
  { size: 5, x: '10%', y: '80%', colorIndex: 4, opacity: 0.05, duration: 26, delay: 1   },
  { size: 3, x: '20%', y: '45%', colorIndex: 0, opacity: 0.13, duration: 20, delay: 3.5 },
  { size: 2, x: '40%', y: '5%',  colorIndex: 1, opacity: 0.08, duration: 18, delay: 0.7 },
  { size: 4, x: '60%', y: '65%', colorIndex: 2, opacity: 0.10, duration: 22, delay: 2.2 },
  { size: 3, x: '70%', y: '10%', colorIndex: 3, opacity: 0.06, duration: 19, delay: 1.8 },
  { size: 2, x: '80%', y: '90%', colorIndex: 4, opacity: 0.14, duration: 21, delay: 0.4 },
  { size: 4, x: '90%', y: '35%', colorIndex: 0, opacity: 0.07, duration: 25, delay: 3.2 },
  { size: 3, x: '50%', y: '50%', colorIndex: 1, opacity: 0.09, duration: 23, delay: 1.4 },
  { size: 2, x: '30%', y: '92%', colorIndex: 2, opacity: 0.11, duration: 17, delay: 2.8 },
];

const keyframesStyle = `
@keyframes ai-particle-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(12px, -18px) scale(1.1);
  }
  50% {
    transform: translate(-8px, -30px) scale(0.95);
  }
  75% {
    transform: translate(15px, -12px) scale(1.05);
  }
}
`;

export function ParticleBackground() {
  const { theme } = useAIWorkspaceStore();
  const palette = COLORS[theme];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{keyframesStyle}</style>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: palette[p.colorIndex % palette.length],
            opacity: theme === 'light' ? p.opacity * 0.6 : p.opacity,
            animation: `ai-particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
