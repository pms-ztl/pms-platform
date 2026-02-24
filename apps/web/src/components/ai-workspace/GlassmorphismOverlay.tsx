/**
 * GlassmorphismOverlay — Animated frosted-glass decoration layer.
 *
 * Renders slowly drifting translucent glass shapes behind the AI workspace
 * content.  Each orb/panel has backdrop-blur, a glowing gradient fill, and a
 * faint luminous border — creating a premium layered-glass feel.
 *
 * Fully theme-aware (light / dark / deep-dark).
 * Pure CSS animations — no JS timers, no canvas, zero layout cost.
 */

import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';

// ── Theme palettes ──────────────────────────────────────────

interface GlassPalette {
  /** Primary accent — used for the main orb fills */
  primary: string;
  /** Secondary accent — used for offset orbs */
  secondary: string;
  /** Tertiary — subtle third colour for depth */
  tertiary: string;
  /** Border glow colour (rgba) */
  borderGlow: string;
  /** Backdrop brightness tweak */
  brightness: string;
}

const PALETTES: Record<AITheme, GlassPalette> = {
  light: {
    primary:    'rgba(99,102,241,0.08)',   // indigo
    secondary:  'rgba(6,182,212,0.06)',    // cyan
    tertiary:   'rgba(139,92,246,0.05)',   // violet
    borderGlow: 'rgba(99,102,241,0.15)',
    brightness: 'brightness(1.05)',
  },
  dark: {
    primary:    'rgba(167,139,250,0.07)',  // purple
    secondary:  'rgba(129,140,248,0.05)',  // indigo
    tertiary:   'rgba(103,232,249,0.04)', // cyan
    borderGlow: 'rgba(167,139,250,0.12)',
    brightness: 'brightness(0.95)',
  },
  'deep-dark': {
    primary:    'rgba(34,211,238,0.06)',   // cyan
    secondary:  'rgba(52,211,153,0.04)',   // emerald
    tertiary:   'rgba(45,212,191,0.03)',   // teal
    borderGlow: 'rgba(34,211,238,0.10)',
    brightness: 'brightness(0.9)',
  },
};

// ── Orb definitions — deterministic positions & sizes ────────

interface GlassOrb {
  /** CSS width / height */
  size: number;
  /** border-radius — use big for circles, lower for rounded panels */
  radius: string;
  /** Starting position (%) */
  x: string;
  y: string;
  /** Which palette colour to use: 0 = primary, 1 = secondary, 2 = tertiary */
  colorIdx: 0 | 1 | 2;
  /** blur strength (px) — backdrop-filter */
  blur: number;
  /** Animation duration (s) */
  duration: number;
  /** Animation delay (s) */
  delay: number;
  /** Optional rotation degrees for panel shapes */
  rotate?: number;
  /** Keyframe variant name suffix */
  variant: 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
}

const ORBS: GlassOrb[] = [
  // Large circle — top-left drift
  { size: 320, radius: '50%', x: '8%',  y: '12%', colorIdx: 0, blur: 24, duration: 28, delay: 0,   variant: 'a' },
  // Medium rounded panel — right side
  { size: 240, radius: '32%', x: '72%', y: '18%', colorIdx: 1, blur: 20, duration: 32, delay: 2,   variant: 'b', rotate: 15 },
  // Small circle — center-left
  { size: 180, radius: '50%', x: '20%', y: '55%', colorIdx: 2, blur: 18, duration: 24, delay: 4,   variant: 'c' },
  // Large panel — bottom-right
  { size: 280, radius: '28%', x: '65%', y: '60%', colorIdx: 0, blur: 22, duration: 30, delay: 1,   variant: 'd', rotate: -10 },
  // Tiny accent circle — top-center
  { size: 120, radius: '50%', x: '45%', y: '8%',  colorIdx: 1, blur: 16, duration: 22, delay: 3,   variant: 'e' },
  // Medium circle — bottom-left
  { size: 200, radius: '50%', x: '12%', y: '75%', colorIdx: 2, blur: 20, duration: 26, delay: 5,   variant: 'f' },
];

// ── Keyframe CSS (injected once) ─────────────────────────────

const KEYFRAMES = `
@keyframes glassFloat_a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(30px, -20px) scale(1.04); }
  50%      { transform: translate(-15px, 25px) scale(0.97); }
  75%      { transform: translate(20px, 15px) scale(1.02); }
}
@keyframes glassFloat_b {
  0%, 100% { transform: translate(0, 0) rotate(15deg) scale(1); }
  33%      { transform: translate(-25px, 18px) rotate(20deg) scale(1.03); }
  66%      { transform: translate(20px, -22px) rotate(10deg) scale(0.98); }
}
@keyframes glassFloat_c {
  0%, 100% { transform: translate(0, 0) scale(1); }
  30%      { transform: translate(18px, 22px) scale(1.05); }
  60%      { transform: translate(-20px, -10px) scale(0.96); }
}
@keyframes glassFloat_d {
  0%, 100% { transform: translate(0, 0) rotate(-10deg) scale(1); }
  40%      { transform: translate(-22px, -18px) rotate(-15deg) scale(1.02); }
  70%      { transform: translate(15px, 20px) rotate(-5deg) scale(0.98); }
}
@keyframes glassFloat_e {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(12px, -15px) scale(1.08); }
}
@keyframes glassFloat_f {
  0%, 100% { transform: translate(0, 0) scale(1); }
  35%      { transform: translate(-18px, 15px) scale(1.03); }
  65%      { transform: translate(22px, -12px) scale(0.97); }
}
@keyframes glassPulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}
@keyframes glassShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

let injected = false;
function injectKeyframes() {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

// ── Component ────────────────────────────────────────────────

export function GlassmorphismOverlay() {
  const { theme } = useAIWorkspaceStore();
  const pal = PALETTES[theme];

  // Inject keyframes on first render
  injectKeyframes();

  const colorForIdx = (idx: 0 | 1 | 2) =>
    idx === 0 ? pal.primary : idx === 1 ? pal.secondary : pal.tertiary;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
      style={{ zIndex: 1 }}
    >
      {/* ── Floating glass orbs ── */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            borderRadius: orb.radius,
            background: `
              radial-gradient(ellipse at 30% 20%, ${colorForIdx(orb.colorIdx)} 0%, transparent 70%)
            `,
            backdropFilter: `blur(${orb.blur}px) saturate(1.15) ${pal.brightness}`,
            WebkitBackdropFilter: `blur(${orb.blur}px) saturate(1.15) ${pal.brightness}`,
            border: `1px solid ${pal.borderGlow}`,
            boxShadow: `
              inset 0 1px 0 0 rgba(255,255,255,${theme === 'light' ? '0.18' : '0.05'}),
              0 0 40px 0 ${colorForIdx(orb.colorIdx)}
            `,
            animation: `glassFloat_${orb.variant} ${orb.duration}s ease-in-out ${orb.delay}s infinite, glassPulse ${orb.duration * 0.6}s ease-in-out ${orb.delay}s infinite`,
            opacity: 0.7,
            transform: orb.rotate ? `rotate(${orb.rotate}deg)` : undefined,
            transition: 'background 0.6s ease, border-color 0.6s ease, box-shadow 0.6s ease',
          }}
        />
      ))}

      {/* ── Shimmer stripe — a subtle diagonal shine that sweeps across ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(
            115deg,
            transparent 0%,
            transparent 40%,
            ${pal.borderGlow} 50%,
            transparent 60%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          animation: 'glassShimmer 12s ease-in-out infinite',
          opacity: theme === 'light' ? 0.25 : 0.12,
          mixBlendMode: 'overlay',
        }}
      />

      {/* ── Soft vignette for depth ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, ${
            theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.15)'
          } 100%)`,
        }}
      />
    </div>
  );
}
