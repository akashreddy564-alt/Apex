/** Geometry for the Home tour: the spotlight cut-out and where its card goes. Pure, for node tests. */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Breathing room around the highlighted thing. */
export const SPOT_PAD = 8;

/** The cut-out: the target grown by the pad, kept inside the screen. */
export function spotlight(target: Rect, screen: { width: number; height: number }, pad = SPOT_PAD): Rect {
  const x = Math.max(4, target.x - pad);
  const y = Math.max(4, target.y - pad);
  const right = Math.min(screen.width - 4, target.x + target.width + pad);
  const bottom = Math.min(screen.height - 4, target.y + target.height + pad);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/**
 * Top of the explanation card: below the spotlight when it sits in the top
 * half, above it otherwise, and centered when there's no spotlight. Always
 * inside the safe area.
 */
export function cardTop(
  spot: Rect | null,
  card: { height: number },
  screen: { height: number },
  safe: { top: number; bottom: number },
  gap = 16,
): number {
  const minTop = safe.top + 12;
  const maxTop = screen.height - safe.bottom - 12 - card.height;
  if (!spot || spot.width === 0) return Math.max(minTop, (screen.height - card.height) / 2);
  const below = spot.y + spot.height + gap;
  const above = spot.y - gap - card.height;
  const center = spot.y + spot.height / 2;
  const wanted = center < screen.height / 2 ? below : above;
  return Math.min(maxTop, Math.max(minTop, wanted));
}

/** An SVG path covering the screen with a rounded hole (even-odd fill). */
export function holePath(screen: { width: number; height: number }, hole: Rect, radius: number): string {
  'worklet';
  const r = Math.max(0, Math.min(radius, hole.width / 2, hole.height / 2));
  const { x, y, width: w, height: h } = hole;
  const outer = `M0 0H${screen.width}V${screen.height}H0Z`;
  if (w <= 0 || h <= 0) return outer;
  const inner =
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
    `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  return outer + inner;
}
