const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
  theme: {
    colors: {
      // general
      transparent: 'transparent',
      white: colors.white,
      positive: colors.green,
      negative: colors.red,

      // accent
      emerald: colors.emerald,
      slate: colors.slate,
    },
    fontFamily: {
      sans: ['SOLIX'],
      mono: defaultTheme.fontFamily.mono,
    },
    extend: {
      maxHeight: { 18: '72px' },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
