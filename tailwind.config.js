const { tailwindFontFamily, tailwindFontSize, themeColorNames } = require('jiti')(__filename)(
  './theme/tokens.ts',
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Follow the appearance setting through CSS variables set in app/_layout.tsx.
        ...Object.fromEntries(
          themeColorNames.map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
        ),
      },
      fontFamily: {
        mono: ['SpaceMono', 'ui-monospace', 'monospace'],
        ...tailwindFontFamily,
      },
      fontSize: {
        ...tailwindFontSize,
      },
    },
  },
  plugins: [],
};
