/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Workplace Learning System brand palette (sampled from logo + workbook theme)
        wls: {
          red: '#E2231A',
          'red-dark': '#9C5238',
          ink: '#2E2224',
          slate: '#4B5A60',
          gray: '#6B7280',
          sand: '#C1AD79',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
