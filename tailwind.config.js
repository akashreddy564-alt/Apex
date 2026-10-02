const { tailwindColors, tailwindFontFamily } = require('jiti')(__filename)(
  './theme/tokens.ts',
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#8B9A6D',
          muted: '#6B7A52',
          faint: '#8B9A6D22',
        },
        ...tailwindColors,
      },
      fontFamily: {
        mono: ['SpaceMono', 'ui-monospace', 'monospace'],
        ...tailwindFontFamily,
      },
    },
  },
  plugins: [],
};
