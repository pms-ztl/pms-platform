/**
 * ParticleBackground — Live canvas-based neural network animation.
 *
 * Renders a real-time synaptic network with:
 *  • 75 floating neurons (nodes) with glowing cores
 *  • Dynamic synaptic connections that fade with distance
 *  • Pulsing "super-nodes" that act as cluster hubs
 *  • Animated radial gradient background
 *  • Data-pulse particles that travel along active connections
 *  • Full DPR (retina) support
 *  • Theme-aware: light / dark / deep-dark palettes
 */

import { useEffect, useRef } from 'react';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';

// ── Colour palettes ────────────────────────────────────────────────────────

interface Palette {
  bg: [string, string, string]; // radial gradient stops
  nodeRgb: string[];            // 'r,g,b' strings
  lineRgb: string;              // connection colour
  pulseRgb: string;             // travelling pulse colour
  glowMultiplier: number;       // glow intensity
}

const PALETTES: Record<AITheme, Palette> = {
  light: {
    bg: ['#dde8ff', '#eef2ff', '#f0ebff'],
    nodeRgb: ['99,102,241', '139,92,246', '6,182,212', '59,130,246', '168,85,247'],
    lineRgb: '99,102,241',
    pulseRgb: '139,92,246',
    glowMultiplier: 0.55,
  },
  dark: {
    bg: ['#0f0520', '#050d1f', '#0a0622'],
    nodeRgb: ['167,139,250', '129,140,248', '103,232,249', '192,132,252', '125,211,252'],
    lineRgb: '139,92,246',
    pulseRgb: '192,132,252',
    glowMultiplier: 1.0,
  },
  'deep-dark': {
    bg: ['#000008', '#00080e', '#000600'],
    nodeRgb: ['34,211,238', '52,211,153', '45,212,191', '6,182,212', '16,185,129'],
    lineRgb: '34,211,238',
    pulseRgb: '52,211,153',
    glowMultiplier: 1.1,
  },
};

// ── Types ─────────────────────────────────────────────────────────────────

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  ci: number;       // colour index
  phase: number;
  pSpeed: number;   // pulse speed
  isSuper: boolean;
}

interface DataPulse {
  fromIdx: number;
  toIdx: number;
  t: number;        // 0..1 along the connection
  speed: number;
  ci: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const NODE_COUNT   = 75;
const MAX_DIST     = 165;
const MAX_DIST_SQ  = MAX_DIST * MAX_DIST;
const MAX_PULSES   = 20;

// ── Helpers ───────────────────────────────────────────────────────────────

function makeNodes(w: number, h: number): Node[] {
  return Array.from({ length: NODE_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    r: Math.random() * 1.6 + 1.1,
    ci: Math.floor(Math.random() * 5),
    phase: Math.random() * Math.PI * 2,
    pSpeed: Math.random() * 0.014 + 0.007,
    isSuper: Math.random() < 0.07,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────

export function ParticleBackground() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const nodesRef   = useRef<Node[]>([]);
  const pulsesRef  = useRef<DataPulse[]>([]);
  const { theme }  = useAIWorkspaceStore();
  const themeRef   = useRef<AITheme>(theme);

  // keep themeRef current without restarting the animation loop
  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx = ctxRaw as CanvasRenderingContext2D;

    // ── Resize ────────────────────────────────────────────────────
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W   = window.innerWidth;
      const H   = window.innerHeight;
      canvas.width          = W * dpr;
      canvas.height         = H * dpr;
      canvas.style.width    = `${W}px`;
      canvas.style.height   = `${H}px`;
      ctx.scale(dpr, dpr);
      nodesRef.current  = makeNodes(W, H);
      pulsesRef.current = [];
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;

    // ── Draw loop ─────────────────────────────────────────────────
    function draw() {
      const W   = window.innerWidth;
      const H   = window.innerHeight;
      const pal = PALETTES[themeRef.current];
      const gm  = pal.glowMultiplier;
      const isLight = themeRef.current === 'light';
      t += 0.004;

      // Background — slow-drifting radial gradient
      const bx = W * (0.5 + Math.sin(t * 0.4) * 0.12);
      const by = H * (0.5 + Math.cos(t * 0.28) * 0.10);
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.hypot(W, H) * 0.85);
      bg.addColorStop(0,    pal.bg[0]);
      bg.addColorStop(0.52, pal.bg[1]);
      bg.addColorStop(1,    pal.bg[2]);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const nodes = nodesRef.current;

      // ── Update node positions ─────────────────────────────────
      for (const n of nodes) {
        n.x     += n.vx;
        n.y     += n.vy;
        n.phase += n.pSpeed;
        // wrap at edges
        if (n.x < -25)    n.x = W + 25;
        else if (n.x > W + 25) n.x = -25;
        if (n.y < -25)    n.y = H + 25;
        else if (n.y > H + 25) n.y = -25;
      }

      // ── Find active connections & spawn data pulses ───────────
      const activeEdges: [number, number, number][] = []; // [i, j, dist]

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_DIST_SQ) {
            const d = Math.sqrt(d2);
            activeEdges.push([i, j, d]);

            // Draw connection line
            const a = (1 - d / MAX_DIST) * (isLight ? 0.11 : 0.26);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${pal.lineRgb},${a.toFixed(3)})`;
            ctx.lineWidth   = isLight ? 0.45 : 0.65;
            ctx.stroke();
          }
        }
      }

      // Randomly spawn new data pulses
      if (pulsesRef.current.length < MAX_PULSES && activeEdges.length > 0 && Math.random() < 0.06) {
        const [ei, ej] = activeEdges[Math.floor(Math.random() * activeEdges.length)];
        pulsesRef.current.push({
          fromIdx: Math.random() < 0.5 ? ei : ej,
          toIdx:   Math.random() < 0.5 ? ei : ej,
          t:       0,
          speed:   Math.random() * 0.008 + 0.005,
          ci:      Math.floor(Math.random() * 5),
        });
      }

      // ── Update & draw data pulses ─────────────────────────────
      pulsesRef.current = pulsesRef.current.filter((p) => {
        p.t += p.speed;
        if (p.t > 1) return false;

        const from = nodes[p.fromIdx];
        const to   = nodes[p.toIdx];
        if (!from || !to) return false;

        const px = from.x + (to.x - from.x) * p.t;
        const py = from.y + (to.y - from.y) * p.t;
        const pr = isLight ? 1.8 : 2.2;
        const pa = (1 - Math.abs(p.t - 0.5) * 2) * (isLight ? 0.5 : 0.85);
        const rgb = pal.nodeRgb[p.ci];

        // Pulse glow
        const pg = ctx.createRadialGradient(px, py, 0, px, py, pr * 5);
        pg.addColorStop(0, `rgba(${rgb},${(pa * 0.6).toFixed(3)})`);
        pg.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, py, pr * 5, 0, Math.PI * 2);
        ctx.fill();

        // Pulse core
        ctx.fillStyle = `rgba(${rgb},${pa.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      // ── Draw nodes ────────────────────────────────────────────
      for (const n of nodes) {
        const pulse    = 1 + Math.sin(n.phase) * 0.22;
        const baseR    = n.r * (n.isSuper ? 2.8 : 1);
        const r        = baseR * pulse;
        const rgb      = pal.nodeRgb[n.ci];
        const coreA    = (isLight ? 0.55 : 0.88) * gm;
        const glowR    = r * (n.isSuper ? 11 : 5.5);

        // Outer glow halo
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
        halo.addColorStop(0,   `rgba(${rgb},${((isLight ? 0.12 : 0.28) * pulse * gm).toFixed(3)})`);
        halo.addColorStop(0.4, `rgba(${rgb},${((isLight ? 0.04 : 0.10) * pulse * gm).toFixed(3)})`);
        halo.addColorStop(1,   `rgba(${rgb},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Super-node extra ring
        if (n.isSuper) {
          const ringR = glowR * 0.55;
          const ring  = ctx.createRadialGradient(n.x, n.y, ringR * 0.85, n.x, n.y, ringR);
          ring.addColorStop(0, `rgba(${rgb},0)`);
          ring.addColorStop(0.5, `rgba(${rgb},${(0.18 * pulse * gm).toFixed(3)})`);
          ring.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = ring;
          ctx.beginPath();
          ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core with specular highlight
        const core = ctx.createRadialGradient(
          n.x - r * 0.3, n.y - r * 0.35, 0,
          n.x,            n.y,            r
        );
        core.addColorStop(0, `rgba(${rgb},${(Math.min(coreA * 1.15, 1)).toFixed(3)})`);
        core.addColorStop(1, `rgba(${rgb},${(coreA * 0.55).toFixed(3)})`);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []); // intentionally empty — theme changes handled via themeRef

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none select-none"
      aria-hidden="true"
    />
  );
}
