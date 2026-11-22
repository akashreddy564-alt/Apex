/**
 * Apex colors. One semantic palette per appearance (`palettes`), read in JS
 * through `useColors()` and in Tailwind classes through CSS variables
 * (`cssVars`). Bone (#EDE6D6) is the accent; the topo colors mark distance, climb and streaks.
 *
 * Headings and titles are one solid color: the palette's `fg`. Never
 * highlight individual words in a heading.
 */

/** One semantic color set per appearance, in the colors of a topo map. */
export interface Palette {
  bg: string;
  surface: string;
  raised: string;
  border: string;
  borderStrong: string;
  fg: string;
  fg2: string;
  fgMuted: string;
  fgFaint: string;
  /** Primary buttons, your own highlights, comparison tags. */
  accent: string;
  /** Text and icons placed on `accent`. */
  onAccent: string;
  /** Score colors by bucket. */
  loved: string;
  fine: string;
  disliked: string;
  /** Route lines drawn over maps. */
  mapLine: string;
  /** Topo colors, each tied to what it measures: lake blue for distance... */
  distance: string;
  /** ...contour brown for climb and elevation... */
  climb: string;
  /** ...and forest green for streaks and goals met. */
  streak: string;
}

/**
 * Light mode can't use Bone as a fill on white, so its accent is Bone's dark
 * ink with Bone text on it.
 */
export const palettes: Record<'dark' | 'light', Palette> = {
  dark: {
    bg: '#0C0E0D',
    surface: '#161917',
    raised: '#252A27',
    border: '#363C38',
    borderStrong: '#4A514C',
    fg: '#F4F1EA',
    fg2: '#D6D3CA',
    fgMuted: '#A3A69E',
    fgFaint: '#757A73',
    accent: '#EDE6D6',
    onAccent: '#0B0B0C',
    loved: '#5BBE84',
    fine: '#E0B04A',
    disliked: '#E2675A',
    mapLine: '#EDE6D6',
    distance: '#6FA9D8',
    climb: '#D9925E',
    streak: '#5BBE84',
  },
  light: {
    // Warm map paper under white cards.
    bg: '#F5F1E8',
    surface: '#FFFFFF',
    raised: '#EAE3D4',
    border: '#DDD4C2',
    borderStrong: '#C2B8A3',
    fg: '#1C211E',
    fg2: '#2F3531',
    fgMuted: '#5E5F58',
    fgFaint: '#8A877D',
    accent: '#1C211E',
    onAccent: '#F5F1E8',
    loved: '#2F7A4A',
    fine: '#A86F0C',
    disliked: '#B4462B',
    mapLine: '#1C211E',
    distance: '#2B6A99',
    climb: '#94552A',
    streak: '#2F7A4A',
  },
};

/** The difficulty rating, easiest to very strenuous: forest, moss, ochre, rust, red-brown. */
export const difficultyRamp: Record<'dark' | 'light', readonly [string, string, string, string, string]> = {
  dark: ['#5BBE84', '#A3BC5A', '#E3B54E', '#E0844A', '#D0614A'],
  light: ['#2F7A4A', '#7E9A3C', '#C99A2E', '#C2672B', '#8E3B24'],
};

/**
 * The summit register's receipt paper, ink and stamp. The same in both
 * appearances, and used only for the register.
 */
export const paper = '#F3EFE4';
export const ink = '#151515';
/** The register's summit stamp green, printed on paper in both appearances. */
export const stamp = '#1F8F4E';

/**
 * Family names registered with `useFonts` in `app/_layout.tsx`.
 * SDK 57 loads each weight as its own family, so use the weight-specific
 * name (or the matching Tailwind class) instead of `fontWeight`.
 *
 * `font-mono` stays SpaceMono and `font-sans` stays the existing system
 * stack. Inter is `font-ui` so those keys are not replaced.
 */
export const fonts = {
  /** Bricolage Grotesque 700. Nav titles and medium display. */
  display: 'BricolageGrotesque_700Bold',
  /** Bricolage Grotesque 800. Large display titles only. */
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemibold: 'Inter_600SemiBold',
  /** Anton 400. Opening-screen place name only. */
  poster: 'Anton_400Regular',
  /** SpaceMono, registered in `app/_layout.tsx`. */
  mono: 'SpaceMono',
} as const;

export type FontToken = keyof typeof fonts;

/** Smallest size allowed on the type scale, in pt. */
export const minTypeSize = 11;

/**
 * Point sizes for new UI. Every step is at least `minTypeSize`.
 * Caption 12, body 15 / 16, titles in Bricolage.
 */
export const typeScale = {
  caption: 12,
  body: 15,
  bodyLarge: 16,
  title: 22,
  titleLarge: 28,
  display: 34,
} as const;

for (const size of Object.values(typeScale)) {
  if (size < minTypeSize) {
    throw new Error(`typeScale includes ${size}pt, below the ${minTypeSize}pt minimum`);
  }
}

const tabularNums = ['tabular-nums'] as ['tabular-nums'];

/**
 * Heading / title style. One color, one family.
 * Do not override `color` per word.
 */
export const heading = {
  color: palettes.dark.fg,
  fontFamily: fonts.display,
} as const;

/**
 * Stack and tab headers. The 700 cut is its own family name.
 * `fontWeight` stays `normal` so web matches the `@font-face` expo-font
 * registers (it does not set a weight). 800 is not used here.
 */
export const navTitle = {
  color: palettes.dark.fg,
  fontFamily: fonts.display,
  fontSize: 17,
  fontWeight: 'normal' as const,
} as const;

/**
 * In-screen titles. One color, the loaded face, `fontWeight: 'normal'`
 * so web does not synthesize a bolder cut. 800 is only `displayXL`.
 */
export const displayXL = {
  color: palettes.dark.fg,
  fontFamily: fonts.displayExtraBold,
  fontSize: 34,
  lineHeight: 36,
  fontWeight: 'normal' as const,
} as const;

/** Text styles. Titles use `heading.color` only — never a second color inside the line. */
export const type = {
  caption: {
    fontFamily: fonts.ui,
    fontSize: typeScale.caption,
    lineHeight: 16,
  },
  body: {
    fontFamily: fonts.ui,
    fontSize: typeScale.body,
    lineHeight: 22,
  },
  bodyLarge: {
    fontFamily: fonts.uiMedium,
    fontSize: typeScale.bodyLarge,
    lineHeight: 24,
  },
  title: {
    ...heading,
    fontSize: typeScale.title,
    lineHeight: 28,
  },
  titleLarge: {
    ...heading,
    fontSize: typeScale.titleLarge,
    lineHeight: 34,
  },
  display: {
    color: palettes.dark.fg,
    fontFamily: fonts.displayExtraBold,
    fontSize: typeScale.display,
    lineHeight: 40,
  },
} as const;

/**
 * Numbers use Inter with tabular figures so digits don't shift width.
 * Pass `medium` or `semibold` for the other loaded Inter weights.
 */
export function numericStyle(weight: 'regular' | 'medium' | 'semibold' = 'regular') {
  const fontFamily =
    weight === 'semibold' ? fonts.uiSemibold : weight === 'medium' ? fonts.uiMedium : fonts.ui;
  return {
    fontFamily,
    fontVariant: tabularNums,
  };
}

/** Additive NativeWind families. Does not include `mono` or `sans`. */
export const tailwindFontFamily = {
  display: [fonts.display, 'sans-serif'],
  'display-extrabold': [fonts.displayExtraBold, 'sans-serif'],
  ui: [fonts.ui, 'ui-sans-serif', 'system-ui', 'sans-serif'],
  'ui-medium': [fonts.uiMedium, 'ui-sans-serif', 'system-ui', 'sans-serif'],
  'ui-semibold': [fonts.uiSemibold, 'ui-sans-serif', 'system-ui', 'sans-serif'],
} as const;

/** Additive sizes, in px. Does not replace Tailwind's xs/sm/base/lg scale. */
export const tailwindFontSize = {
  caption: [`${typeScale.caption}px`, { lineHeight: `${type.caption.lineHeight}px` }],
  body: [`${typeScale.body}px`, { lineHeight: `${type.body.lineHeight}px` }],
  'body-large': [`${typeScale.bodyLarge}px`, { lineHeight: `${type.bodyLarge.lineHeight}px` }],
  title: [`${typeScale.title}px`, { lineHeight: `${type.title.lineHeight}px` }],
  'title-large': [`${typeScale.titleLarge}px`, { lineHeight: `${type.titleLarge.lineHeight}px` }],
  display: [`${typeScale.display}px`, { lineHeight: `${type.display.lineHeight}px` }],
} as const;

/** `fgMuted` → `fg-muted`, the Tailwind and CSS variable spelling. */
function kebab(key: string): string {
  return key.replace(/[A-Z0-9]/g, (ch, i: number) => (i === 0 ? '' : '-') + ch.toLowerCase());
}

/**
 * The palette as NativeWind CSS variables (`--color-fg-muted: '161 161 170'`),
 * set on the root view with `vars()` so Tailwind classes follow the appearance.
 */
export function cssVars(palette: Palette): Record<`--color-${string}`, string> {
  const out: Record<`--color-${string}`, string> = {};
  for (const [key, hex] of Object.entries(palette)) {
    const n = Number.parseInt(hex.slice(1), 16);
    out[`--color-${kebab(key)}`] = `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  }
  return out;
}

/** Tailwind color names backed by the CSS variables above. */
export const themeColorNames = Object.keys(palettes.dark).map(kebab);

/**
 * The one card build: surface fill, a `raised` hairline, radius 22, padding 16.
 * Only the summit register and the glass bars differ.
 */
export function cardStyle(palette: Palette) {
  return {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.raised,
    borderRadius: 22,
    padding: 16,
  } as const;
}

/**
 * The tab bar's own height above the home indicator: 1 hairline + 7 + the 54 pt tab item
 * (5 pt padding, 28 pt icon box, 16 pt label line, 5 pt padding) + 6.
 * Shorter, and the navigator squeezes the label and clips it.
 */
const TAB_BAR_BODY = 68;

/**
 * The bottom tab bar for a palette. Hidden while a hike is recording.
 * `bottomInset` is the safe-area inset, so the labels sit fully above the
 * home indicator on device; on web it is 0.
 */
export function tabBarStyle(palette: Palette, hidden = false, bottomInset = 0) {
  if (hidden) return { display: 'none' as const };
  // Transparent and floating: the Glass background in the tabs layout frosts
  // whatever scrolls under it. Tab screens pad by useTabBarInset(), which
  // reports this same height.
  return {
    position: 'absolute' as const,
    backgroundColor: 'transparent',
    borderTopColor: palette.raised,
    borderTopWidth: 1,
    height: TAB_BAR_BODY + bottomInset,
    // 7 + the 1 pt top hairline = 8.
    paddingTop: 7,
    paddingBottom: 6 + bottomInset,
  };
}

/**
 * Score pills that sit on photos stay dark in both appearances, so their
 * text always uses the dark palette. `solid` is the pill color at full
 * opacity, for contrast checks.
 */
export const photoPill = {
  fill: 'rgba(9,9,11,0.6)',
  solid: palettes.dark.bg,
  border: 'rgba(255,255,255,0.15)',
  text: palettes.dark.fg,
  top: palettes.dark.accent,
} as const;
