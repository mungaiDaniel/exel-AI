import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          primary:   '#1A56DB',
          secondary: '#0E9F6E',
          accent:    '#FF6B35',
          purple:    '#7C3AED',
        },
        surface: {
          base:     '#0F1117',
          card:     '#1A1D27',
          elevated: '#22263A',
          hover:    '#2A2E42',
        },
        border: {
          DEFAULT: '#2E3248',
          subtle:  '#1E2133',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        card:  '0 4px 12px rgba(0,0,0,0.5)',
        glow:  '0 0 24px rgba(26,86,219,0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
