/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0f3',
          100: '#cce1e7',
          200: '#99c3cf',
          300: '#66a5b7',
          400: '#33879f',
          500: '#033B4C', // Main primary color
          600: '#022f3d',
          700: '#02232e',
          800: '#01171e',
          900: '#010c0f',
        },
        accent: {
          50: '#f9e6ea',
          100: '#f3cdd5',
          200: '#e79bab',
          300: '#db6981',
          400: '#cf3757',
          500: '#801E2D', // Main accent color
          600: '#661824',
          700: '#4d121b',
          800: '#330c12',
          900: '#1a0609',
        },
        gold: {
          50: '#fefbf5',
          100: '#fdf7eb',
          200: '#faefd7',
          300: '#f8e7c3',
          400: '#f5dfaf',
          500: '#F3C677', // Main gold color
          600: '#c29e5f',
          700: '#927747',
          800: '#614f2f',
          900: '#312818',
        },
      },
    },
  },
  plugins: [],
}
