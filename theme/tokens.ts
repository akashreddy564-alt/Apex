/**
 * Zinc + Sage palette.
 * Single source of truth for NativeWind (`tailwind.config.js`) and for JS
 * (Skia, SVG, Reanimated). Hex values live only in `colors`.
 *
 * Headings and titles are always one solid color: `colors.fg` (#FAFAFA).
 * Never highlight individual words in a heading. `colors.sage300` is not a
 * headline accent.
 */

export const colors = {
  bg: '#09090B',
  surface: '#18181B',
  raised: '#27272A',
  border: '#3F3F46',
  borderStrong: '#52525B',
  fg: '#FAFAFA',
  fg2: '#D4D4D8',
  fgMuted: '#A1A1AA',
  fgFaint: '#71717A',
  sage: '#8B9A6D',
  sage500: '#A3B183',
  sage700: '#77865A',
  sage300: '#A9B78C',
  sage200: '#C9D4B0',
  sage50: '#EEF2E6',
  /** Neutral highlight for NEW / just logged / placed. */
  highlight: '#E4E4E7',
  onSage: '#09090B',
  danger: '#9F3A38',
  /** Opening-screen elevation only. */
  heroAccent: '#FF8A4C',
} as const;

export type ColorToken = keyof typeof colors;

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
 * Route line and ridgeline stroke, low elevation → peak.
 * The middle stop (#C9D4B0) sits at 60%.
 */
export const elevationGradient = [colors.sage, colors.sage200, colors.sage50] as const;

export const elevationGradientMid = 0.6;

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
  color: colors.fg,
  fontFamily: fonts.display,
} as const;

/**
 * Stack and tab headers. The 700 cut is its own family name.
 * `fontWeight` stays `normal` so web matches the `@font-face` expo-font
 * registers (it does not set a weight). 800 is not used here.
 */
export const navTitle = {
  color: colors.fg,
  fontFamily: fonts.display,
  fontSize: 17,
  fontWeight: 'normal' as const,
} as const;

/**
 * In-screen titles. One color, the loaded face, `fontWeight: 'normal'`
 * so web does not synthesize a bolder cut. 800 is only `displayXL`.
 */
export const displayXL = {
  color: colors.fg,
  fontFamily: fonts.displayExtraBold,
  fontSize: 34,
  lineHeight: 36,
  fontWeight: 'normal' as const,
} as const;

/** 700 display for section titles and the trail name under the map. */
export const displayM = {
  color: colors.fg,
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
    color: heading.color,
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

/** Additive NativeWind colors. Does not include the existing `accent` scale. */
export const tailwindColors = {
  bg: colors.bg,
  surface: colors.surface,
  raised: colors.raised,
  border: colors.border,
  'border-strong': colors.borderStrong,
  fg: colors.fg,
  'fg-2': colors.fg2,
  'fg-muted': colors.fgMuted,
  'fg-faint': colors.fgFaint,
  sage: {
    DEFAULT: colors.sage,
    500: colors.sage500,
    700: colors.sage700,
    300: colors.sage300,
    200: colors.sage200,
    50: colors.sage50,
  },
  highlight: colors.highlight,
  'on-sage': colors.onSage,
  danger: colors.danger,
} as const;

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
