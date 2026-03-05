import { useMemo } from 'react';
import { useThemeStore } from '@/store/theme';
import {
  primaryHex,
  primaryRgba,
  generateAccentPalette,
  generateAccentShades,
  SEMANTIC_COLORS,
  SEMANTIC_RATING_COLORS,
  SEMANTIC_MOOD_COLORS,
  SEMANTIC_RISK_COLORS,
  SEMANTIC_FEEDBACK_COLORS,
} from '@/lib/chart-colors';

// ---------------------------------------------------------------------------
// useChartColors — reactive hook that re-computes when accent changes
// ---------------------------------------------------------------------------
// Usage:
//   const cc = useChartColors();
//   <Line stroke={cc.primary} />
//   <Bar fill={cc.palette(3)[0]} />
//   <Tooltip cursor={{ fill: cc.cursorFill }} />
// ---------------------------------------------------------------------------

export interface ChartColors {
  /** Primary accent (500 shade) hex */
  primary: string;
  /** Lighter accent (300 shade) hex */
  primaryLight: string;
  /** Darker accent (700 shade) hex */
  primaryDark: string;
  /** Extra-light accent (200 shade) hex */
  primaryExtraLight: string;
  /** Extra-dark accent (800 shade) hex */
  primaryExtraDark: string;
  /** Get hex for any shade 50-950 */
  hex: (shade: number) => string;
  /** Get rgba for any shade 50-950 */
  rgba: (shade: number, alpha: number) => string;
  /** Generate N harmonious colors from accent via hue rotation */
  palette: (count: number) => string[];
  /** Three shades [light, medium, dark] for gradients */
  shades: [string, string, string];
  /** Transparent accent fill for Tooltip cursor */
  cursorFill: string;
  /** Semantic fixed-meaning colors */
  semantic: typeof SEMANTIC_COLORS;
  /** 5-color rating scale (1-5) */
  ratingColors: typeof SEMANTIC_RATING_COLORS;
  /** 5-color mood scale (1-5) */
  moodColors: typeof SEMANTIC_MOOD_COLORS;
  /** 4-color risk scale (low-critical) */
  riskColors: typeof SEMANTIC_RISK_COLORS;
  /** 2-color feedback scale (praise, constructive) */
  feedbackColors: typeof SEMANTIC_FEEDBACK_COLORS;
  /** Grid/axis line color (theme-adaptive) */
  gridColor: string;
  /** Tick text color (theme-adaptive) */
  tickColor: string;
}

export function useChartColors(): ChartColors {
  const accentColor = useThemeStore((s) => s.accentColor);
  const theme = useThemeStore((s) => s.theme);

  return useMemo<ChartColors>(() => {
    const isDark = theme === 'deep-dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return {
      primary: primaryHex(500),
      primaryLight: primaryHex(300),
      primaryDark: primaryHex(700),
      primaryExtraLight: primaryHex(200),
      primaryExtraDark: primaryHex(800),
      hex: primaryHex,
      rgba: primaryRgba,
      palette: (count: number) => generateAccentPalette(count),
      shades: generateAccentShades(),
      cursorFill: primaryRgba(500, 0.08),
      semantic: SEMANTIC_COLORS,
      ratingColors: SEMANTIC_RATING_COLORS,
      moodColors: SEMANTIC_MOOD_COLORS,
      riskColors: SEMANTIC_RISK_COLORS,
      feedbackColors: SEMANTIC_FEEDBACK_COLORS,
      gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      tickColor: isDark ? '#94a3b8' : '#64748b',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accentColor, theme]);
}
