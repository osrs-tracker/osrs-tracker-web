colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      black: colors.black,
      white: colors.white,
      neutral: colors.neutral,

      emerald: colors.emerald,
      slate: colors.slate,

      red: colors.red,
      orange: colors.orange,
      yellow: colors.yellow,
      green: colors.green,
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
