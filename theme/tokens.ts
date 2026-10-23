/**
 * Apex colors. One semantic palette per appearance (`palettes`), read in JS
 * through `useColors()` and in Tailwind classes through CSS variables
 * (`cssVars`). Bone (#EDE6D6) is the only accent.
 *
 * Headings and titles are one solid color: the palette's `fg`. Never
 * highlight individual words in a heading.
 */

/** One semantic color set per appearance. Bone (#EDE6D6) is the only accent. */
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
}

/**
 * Light mode can't use Bone as a fill on white, so its accent is Bone's dark
 * ink with Bone text on it.
 */
export const palettes: Record<'dark' | 'light', Palette> = {
  dark: {
    bg: '#09090B',
    surface: '#18181B',
    raised: '#27272A',
    border: '#3F3F46',
    borderStrong: '#52525B',
    fg: '#FAFAFA',
    fg2: '#D4D4D8',
    fgMuted: '#A1A1AA',
    fgFaint: '#71717A',
    accent: '#EDE6D6',
    onAccent: '#0B0B0C',
    loved: '#4CC27A',
    fine: '#E0B04A',
    disliked: '#E2675A',
    mapLine: '#EDE6D6',
  },
  light: {
    bg: '#FFFFFF',
    surface: '#F6F6F4',
    raised: '#ECECEA',
    border: '#D9D9D6',
    borderStrong: '#BDBDB8',
    fg: '#141414',
    fg2: '#2E2E30',
    fgMuted: '#5F5F63',
    fgFaint: '#8A8A90',
    accent: '#2A2620',
    onAccent: '#EDE6D6',
    loved: '#1F8F4E',
    fine: '#A86F0C',
    disliked: '#C2412F',
    mapLine: '#2A2620',
  },
};

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

/** 700 display for section titles and the trail name under the map. */
export const displayM = {
  color: palettes.dark.fg,
  fontFamily: fonts.display,
  fontSize: 28,
  lineHeight: 31,
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

export const numericText = numericStyle();

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

/** The bottom tab bar for a palette. Hidden while a hike is recording. */
export function tabBarStyle(palette: Palette, hidden = false) {
  if (hidden) return { display: 'none' as const };
  return {
    backgroundColor: palette.bg,
    borderTopColor: palette.raised,
    borderTopWidth: 1,
    height: 58,
    paddingBottom: 6,
    paddingTop: 6,
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
