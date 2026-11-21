/**
 * Color helpers. Pure, so node tests can run them (no `@/` imports).
 */

/** `#RRGGBB` at an alpha from 0 to 1, as rgba(). Any other format passes through unchanged. */
export function withAlpha(hex: string, a: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = Number.parseInt(hex.slice(1), 16);
  const alpha = Math.min(1, Math.max(0, a));
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
