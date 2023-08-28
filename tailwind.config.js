colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  experimental: {
    darkModeVariant: true,
    optimizeUniversalDefaults: true,
  },
  theme: {
    colors: {
      // general
      transparent: 'transparent',
      black: colors.black,
      white: colors.white,
      green: colors.green, // positive
      red: colors.red, // negative

      // accent
      amber: colors.amber,
      emerald: colors.emerald,
      slate: colors.slate,
    },
    fontFamily: { sans: ['SOLIX'] },
    extend: {
      maxHeight: { 18: '72px' },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
