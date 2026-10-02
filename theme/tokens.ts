/**
 * Zinc + Sage palette.
 * Single source of truth for NativeWind (`tailwind.config.js`) and for JS
 * (Skia, SVG, Reanimated). Hex values live only in `colors`.
 *
 * Headings and titles are always one solid color: `colors.text` (#FAFAFA).
 * Never highlight individual words in a heading. `colors.sage300` is not a
 * headline accent.
 */

export const colors = {
  bg: '#09090B',
  surface: '#18181B',
  raised: '#27272A',
  border: '#3F3F46',
  borderStrong: '#52525B',
  text: '#FAFAFA',
  text2: '#D4D4D8',
  textMuted: '#A1A1AA',
  textFaint: '#71717A',
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
} as const;

export type ColorToken = keyof typeof colors;

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
 * `font-mono` stays SpaceMono. These names are additive.
 */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  numeric: 'JetBrainsMono_400Regular',
  numericMedium: 'JetBrainsMono_500Medium',
} as const;

export type FontToken = keyof typeof fonts;

/**
 * Heading / title style. One color, one family.
 * Do not override `color` per word.
 */
export const heading = {
  color: colors.text,
  fontFamily: fonts.display,
} as const;

/** Additive NativeWind colors. Does not include the existing `accent` scale. */
export const tailwindColors = {
  bg: colors.bg,
  surface: colors.surface,
  raised: colors.raised,
  border: colors.border,
  'border-strong': colors.borderStrong,
  text: colors.text,
  'text-2': colors.text2,
  'text-muted': colors.textMuted,
  'text-faint': colors.textFaint,
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

/** Additive NativeWind families. Does not include `mono` (SpaceMono). */
export const tailwindFontFamily = {
  display: [fonts.display, 'sans-serif'],
  'display-extrabold': [fonts.displayExtraBold, 'sans-serif'],
  sans: [fonts.sans, 'ui-sans-serif', 'system-ui', 'sans-serif'],
  'sans-medium': [fonts.sansMedium, 'ui-sans-serif', 'system-ui', 'sans-serif'],
  'sans-semibold': [fonts.sansSemibold, 'ui-sans-serif', 'system-ui', 'sans-serif'],
  numeric: [fonts.numeric, 'ui-monospace', 'monospace'],
  'numeric-medium': [fonts.numericMedium, 'ui-monospace', 'monospace'],
} as const;
