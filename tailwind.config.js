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
      },
      fontFamily: {
        mono: ['SpaceMono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
