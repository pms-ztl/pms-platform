// Accent color palettes — each is a full Tailwind-compatible shade scale (50–950)
// Values are space-separated RGB channels for use with Tailwind's opacity modifier

export type AccentColor =
  | 'violet'
  | 'blue'
  | 'indigo'
  | 'teal'
  | 'emerald'
  | 'orange'
  | 'rose'
  | 'red'
  | 'amber'
  | 'cyan'
  | 'slate';

export interface AccentPalette {
  50: string; 100: string; 200: string; 300: string; 400: string;
  500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
}

export interface AccentMeta {
  label: string;
  hex: string;        // preview swatch color (500 shade)
  palette: AccentPalette;
}

export const ACCENT_COLORS: Record<AccentColor, AccentMeta> = {
  violet: {
    label: 'Violet',
    hex: '#8b5cf6',
    palette: {
      50:  '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253',
      400: '167 139 250', 500: '139 92 246',  600: '124 58 237',  700: '109 40 217',
      800: '91 33 182',   900: '76 29 149',   950: '46 16 101',
    },
  },
  indigo: {
    label: 'Indigo',
    hex: '#6366f1',
    palette: {
      50:  '238 242 255', 100: '224 231 255', 200: '199 210 254', 300: '165 180 252',
      400: '129 140 248', 500: '99 102 241',  600: '79 70 229',   700: '67 56 202',
      800: '55 48 163',   900: '49 46 129',   950: '30 27 75',
    },
  },
  blue: {
    label: 'Blue',
    hex: '#3b82f6',
    palette: {
      50:  '239 246 255', 100: '219 234 254', 200: '191 219 254', 300: '147 197 253',
      400: '96 165 250',  500: '59 130 246',  600: '37 99 235',   700: '29 78 216',
      800: '30 64 175',   900: '30 58 138',   950: '23 37 84',
    },
  },
  cyan: {
    label: 'Cyan',
    hex: '#06b6d4',
    palette: {
      50:  '236 254 255', 100: '207 250 254', 200: '165 243 252', 300: '103 232 249',
      400: '34 211 238',  500: '6 182 212',   600: '8 145 178',   700: '14 116 144',
      800: '21 94 117',   900: '22 78 99',    950: '8 51 68',
    },
  },
  teal: {
    label: 'Teal',
    hex: '#14b8a6',
    palette: {
      50:  '240 253 250', 100: '204 251 241', 200: '153 246 228', 300: '94 234 212',
      400: '45 212 191',  500: '20 184 166',  600: '13 148 136',  700: '15 118 110',
      800: '17 94 89',    900: '20 78 74',    950: '4 47 46',
    },
  },
  emerald: {
    label: 'Emerald',
    hex: '#10b981',
    palette: {
      50:  '236 253 245', 100: '209 250 229', 200: '167 243 208', 300: '110 231 183',
      400: '52 211 153',  500: '16 185 129',  600: '5 150 105',   700: '4 120 87',
      800: '6 95 70',     900: '6 78 59',     950: '2 44 34',
    },
  },
  amber: {
    label: 'Amber',
    hex: '#f59e0b',
    palette: {
      50:  '255 251 235', 100: '254 243 199', 200: '253 230 138', 300: '252 211 77',
      400: '251 191 36',  500: '245 158 11',  600: '217 119 6',   700: '180 83 9',
      800: '146 64 14',   900: '120 53 15',   950: '69 26 3',
    },
  },
  orange: {
    label: 'Orange',
    hex: '#f97316',
    palette: {
      50:  '255 247 237', 100: '255 237 213', 200: '254 215 170', 300: '253 186 116',
      400: '251 146 60',  500: '249 115 22',  600: '234 88 12',   700: '194 65 12',
      800: '154 52 18',   900: '124 45 18',   950: '67 20 7',
    },
  },
  rose: {
    label: 'Rose',
    hex: '#f43f5e',
    palette: {
      50:  '255 241 242', 100: '255 228 230', 200: '254 205 211', 300: '253 164 175',
      400: '251 113 133', 500: '244 63 94',   600: '225 29 72',   700: '190 18 60',
      800: '159 18 57',   900: '136 19 55',   950: '76 5 25',
    },
  },
  red: {
    label: 'Red',
    hex: '#ef4444',
    palette: {
      50:  '254 242 242', 100: '254 226 226', 200: '254 202 202', 300: '252 165 165',
      400: '248 113 113', 500: '239 68 68',   600: '220 38 38',   700: '185 28 28',
      800: '153 27 27',   900: '127 29 29',   950: '69 10 10',
    },
  },
  slate: {
    label: 'Slate',
    hex: '#64748b',
    palette: {
      50:  '248 250 252', 100: '241 245 249', 200: '226 232 240', 300: '203 213 225',
      400: '148 163 184', 500: '100 116 139', 600: '71 85 105',   700: '51 65 85',
      800: '30 41 59',    900: '15 23 42',    950: '2 6 23',
    },
  },
};

// Apply accent color CSS custom properties to the document root
export function applyAccentColor(color: AccentColor) {
  const root = document.documentElement;
  const { palette } = ACCENT_COLORS[color];

  root.style.setProperty('--c-primary-50',  palette[50]);
  root.style.setProperty('--c-primary-100', palette[100]);
  root.style.setProperty('--c-primary-200', palette[200]);
  root.style.setProperty('--c-primary-300', palette[300]);
  root.style.setProperty('--c-primary-400', palette[400]);
  root.style.setProperty('--c-primary-500', palette[500]);
  root.style.setProperty('--c-primary-600', palette[600]);
  root.style.setProperty('--c-primary-700', palette[700]);
  root.style.setProperty('--c-primary-800', palette[800]);
  root.style.setProperty('--c-primary-900', palette[900]);
  root.style.setProperty('--c-primary-950', palette[950]);
}
