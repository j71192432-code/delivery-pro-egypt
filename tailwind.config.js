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
        brand: {
          50: '#F5E8FF',
          100: '#E9D0FE',
          200: '#D5A7FD',
          300: '#C07DFB',
          400: '#A855F7',
          500: '#7F0DD8',
          600: '#6E08BD',
          700: '#5A059C',
          800: '#46047A',
          900: '#320257',
        },
        dark: {
          bg: '#0B0614',
          card: '#171022',
          cardHover: '#231934',
          border: '#2E2045',
          input: '#120B1D',
          text: '#FFFFFF',
          muted: '#B8ADC9',
        },
        profit: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
          bg: 'rgba(16, 185, 129, 0.12)',
        },
        expense: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          bg: 'rgba(239, 68, 68, 0.12)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
          bg: 'rgba(245, 158, 11, 0.12)',
        }
      },
      fontFamily: {
        sans: [
          'Cairo',
          'IBM Plex Sans Arabic',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
}
