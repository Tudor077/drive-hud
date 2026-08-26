/**
 * A windshield HUD is a mirror: only what the screen lights up is visible, so
 * black is "transparent" and everything else must be bright and saturated.
 * That constraint drives the whole palette — there is no light theme.
 */
export const theme = {
  bg: '#000000',
  surface: '#0A0E12',
  border: '#1C242C',
  text: '#E8F6FF',
  dim: '#6C7A87',
  accent: '#3BE8B0',
  accentDim: '#1B7A5E',
  warn: '#FFB020',
  danger: '#FF3B57',
  rpm: '#54B9FF',
} as const;

/** Available HUD tints — some windshields wash out green, others cyan. */
export const TINTS = {
  mint: '#3BE8B0',
  cyan: '#54E6FF',
  amber: '#FFC24B',
  white: '#EAF4FF',
} as const;

export type TintName = keyof typeof TINTS;
