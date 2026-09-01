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
        meteorology: {
          darkest: '#070b14',
          dark: '#0d1527',
          card: '#121d33',
          cardBorder: '#1e2f52',
          cyan: '#00f0ff',
          teal: '#00d2aa',
          amber: '#ffaa00',
          red: '#ff3366',
          purple: '#9933ff',
          neon: '#39ff14'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}

