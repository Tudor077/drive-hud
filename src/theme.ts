/**
 * Two palettes, because a HUD is used two very different ways.
 *
 * At night the phone lies on the dash and the windshield reflects it: black is
 * effectively transparent, and only what the screen lights up is visible. In
 * daylight that reflection is washed out and the phone is read directly, where
 * dark ink on a white ground carries far further under sun glare.
 */
export type ThemeMode = 'night' | 'day';

export type Theme = {
  mode: ThemeMode;
  bg: string;
  surface: string;
  border: string;
  text: string;
  dim: string;
  warn: string;
  danger: string;
  /** Drawn behind the road, so the chevrons keep contrast against it. */
  road: string;
};

export const THEMES: Record<ThemeMode, Theme> = {
  night: {
    mode: 'night',
    bg: '#000000',
    surface: '#0A0E12',
    border: '#1C242C',
    text: '#E8F6FF',
    dim: '#6C7A87',
    warn: '#FFB020',
    danger: '#FF3B57',
    road: '#0A0E12',
  },
  day: {
    mode: 'day',
    bg: '#FFFFFF',
    surface: '#EDF1F5',
    border: '#B6C2CD',
    text: '#04070A',
    dim: '#46525E',
    warn: '#9A5A00',
    danger: '#C41229',
    road: '#E4EAF0',
  },
};

export type TintName = 'mint' | 'cyan' | 'amber' | 'mono';

/**
 * Each tint needs a dark twin: the colours that glow on black are close to
 * invisible on white, and the point of day mode is contrast.
 */
export const TINTS: Record<TintName, Record<ThemeMode, string>> = {
  mint: { night: '#3BE8B0', day: '#00674A' },
  cyan: { night: '#54E6FF', day: '#005E77' },
  amber: { night: '#FFC24B', day: '#7A4A00' },
  mono: { night: '#EAF4FF', day: '#04070A' },
};

export function tintOf(name: TintName, mode: ThemeMode): string {
  return (TINTS[name] ?? TINTS.mint)[mode];
}
