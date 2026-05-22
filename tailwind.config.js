/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        wls: {
          red: '#E2231A',
          'red-dark': '#9C5238',
          ink: '#2E2224',
          slate: '#4B5A60',
          sand: '#C1AD79',
        },
      },
    },
  },
  plugins: [],
};
