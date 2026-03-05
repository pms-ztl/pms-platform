// ---------------------------------------------------------------------------
// chart-colors.ts — Accent-adaptive chart color utilities
// ---------------------------------------------------------------------------
// Provides helpers to read the active accent CSS variables and generate
// harmonious multi-series palettes via HSL hue rotation.
// Recharts needs actual hex strings (SVG fill/stroke), not CSS var() refs.
// ---------------------------------------------------------------------------

/* ---- CSS variable readers ------------------------------------------------ */

/** Read a CSS custom property from :root, fallback to provided default */
function cssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Read --c-primary-{shade} and return a hex color string */
export function primaryHex(shade: number): string {
  const raw = cssVar(`--c-primary-${shade}`, '99 102 241'); // indigo fallback
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length < 3) return '#6366f1';
  return '#' + parts.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

/** Read --c-primary-{shade} and return an rgba() string */
export function primaryRgba(shade: number, alpha: number): string {
  const raw = cssVar(`--c-primary-${shade}`, '99 102 241');
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length < 3) return `rgba(99,102,241,${alpha})`;
  return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
}

/* ---- Color math --------------------------------------------------------- */

export function hexToHsl(hex: string): [number, number, number] {
  const h6 = hex.replace('#', '');
  const r = parseInt(h6.substring(0, 2), 16) / 255;
  const g = parseInt(h6.substring(2, 4), 16) / 255;
  const b = parseInt(h6.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;

  return [hue * 360, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;

  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* ---- Palette generation ------------------------------------------------- */

/**
 * Generate `count` distinct harmonious colors based on the current accent.
 * Uses hue rotation in 40-degree steps to ensure each series is visually
 * distinct yet feels cohesive with the accent.
 *
 * @param count  Number of colors needed
 * @param shade  Which accent shade to base on (default 500)
 */
export function generateAccentPalette(count: number, shade = 500): string[] {
  const base = primaryHex(shade);
  if (count <= 1) return [base];

  const [h, s, l] = hexToHsl(base);
  const step = 40; // degrees of hue rotation

  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return base;
    const newH = (h + step * i) % 360;
    // Slightly vary saturation/lightness for more depth
    const sVar = Math.max(35, Math.min(90, s + (i % 2 === 0 ? -5 : 5)));
    const lVar = Math.max(35, Math.min(65, l + (i % 2 === 0 ? 3 : -3)));
    return hslToHex(newH, sVar, lVar);
  });
}

/**
 * Generate lighter/darker shade variants of the accent for gradient fills.
 * Returns [light, medium, dark].
 */
export function generateAccentShades(): [string, string, string] {
  return [primaryHex(300), primaryHex(500), primaryHex(700)];
}

/* ---- Semantic colors (NEVER change with accent) ------------------------- */

export const SEMANTIC_COLORS = Object.freeze({
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
  neutral: '#64748b',
});

/** Performance rating 1-5 scale: red → orange → amber → teal → emerald */
export const SEMANTIC_RATING_COLORS = Object.freeze([
  '#ef4444', // 1 — Needs Improvement (red)
  '#f97316', // 2 — Below Average (orange)
  '#f59e0b', // 3 — Average (amber)
  '#14b8a6', // 4 — Good (teal)
  '#10b981', // 5 — Excellent (emerald)
] as const);

/** Mood / sentiment 1-5 scale: red → orange → amber → cyan → emerald */
export const SEMANTIC_MOOD_COLORS = Object.freeze([
  '#ef4444', // 1 — Very Negative
  '#f97316', // 2 — Negative
  '#f59e0b', // 3 — Neutral
  '#06b6d4', // 4 — Positive
  '#10b981', // 5 — Very Positive
] as const);

/** Risk levels: emerald (low) → amber (medium) → red (high) → rose (critical) */
export const SEMANTIC_RISK_COLORS = Object.freeze([
  '#10b981', // Low
  '#f59e0b', // Medium
  '#ef4444', // High
  '#e11d48', // Critical
] as const);

/** Feedback types: emerald (praise) → amber (constructive) */
export const SEMANTIC_FEEDBACK_COLORS = Object.freeze([
  '#10b981', // Praise
  '#f59e0b', // Constructive
] as const);
