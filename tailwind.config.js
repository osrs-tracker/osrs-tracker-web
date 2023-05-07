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
  },
  theme: {
    colors: {
      // general
      transparent: 'transparent',
      black: colors.black,
      white: colors.white,
      red: colors.red,
      green: colors.green,

      // accent
      amber: colors.amber,
      emerald: colors.emerald,
      slate: colors.slate,
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
