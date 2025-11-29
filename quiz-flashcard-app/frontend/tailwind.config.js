/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
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
        // Dark mode color palette
        dark: {
          // Surface colors (neutral dark backgrounds)
          surface: {
            10: '#121212',  // Darkest - main background
            20: '#282828',  // Cards, elevated surfaces
            30: '#3f3f3f',  // Hover states, borders
            40: '#575757',  // Disabled states
            50: '#717171',  // Secondary text
            60: '#8b8b8b',  // Tertiary text
          },
          // Tonal surface (dark with subtle blue tint)
          tonal: {
            10: '#191c22',  // Alternative main background
            20: '#2e3137',  // Alternative cards
            30: '#45474c',  // Alternative hover
            40: '#5c5f64',  // Alternative disabled
            50: '#75777b',  // Alternative secondary text
            60: '#8f9194',  // Alternative tertiary text
          },
          // Primary tints for dark mode (blue)
          primary: {
            10: '#407dc7',  // Primary buttons, links
            20: '#5b8acd',  // Primary hover
            30: '#7298d4',  // Primary active
            40: '#88a6da',  // Primary light
            50: '#9cb4e0',  // Primary lighter
            60: '#b0c3e7',  // Primary lightest
          },
        },
        // Semantic colors for dark mode
        success: {
          dark: '#22946e',
          DEFAULT: '#47d5a6',
          light: '#9ae8ce',
        },
        warning: {
          dark: '#a87a2a',
          DEFAULT: '#d7ac61',
          light: '#ecd7b2',
        },
        danger: {
          dark: '#9c2121',
          DEFAULT: '#d94a4a',
          light: '#eb9e9e',
        },
        info: {
          dark: '#65218a',
          DEFAULT: '#9e40d1',
          light: '#c892e5',
        },
      },
    },
  },
  plugins: [],
}
