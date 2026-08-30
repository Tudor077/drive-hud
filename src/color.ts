/**
 * Just enough colour maths to build a readable palette out of two chosen
 * colours, so the rest of the display can be derived rather than picked.
 */

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** sRGB gamma to linear light, which is what luminance is measured in. */
function toLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative luminance, 0 for black and 1 for white. Green carries most of it —
 * the coefficients are the eye's own sensitivity, which is why a yellow screen
 * is nearly as bright as a white one while lighting two subpixels instead of
 * three.
 */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio, 1 for identical and 21 for black against white. */
export function contrastRatio(a: string, b: string): number {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light + 0.05) / (dark + 0.05);
}

/** Blends toward `other`; 0 keeps `hex`, 1 returns `other`. */
export function mix(hex: string, other: string, amount: number): string {
  const from = parseHex(hex);
  const to = parseHex(other);
  const t = Math.max(0, Math.min(1, amount));
  return toHex({
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  });
}

/** True when a background is light enough to want dark ink on it. */
export function isLight(hex: string): boolean {
  return luminance(hex) > 0.4;
}
