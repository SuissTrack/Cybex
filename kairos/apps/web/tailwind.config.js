/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Surfaces
        snow: '#FAFAFA',
        pearl: '#F5F5F7',
        mist: '#EFEFEF',
        silk: '#E8E8EC',
        // Ink
        ink: {
          0: '#09090B',
          10: '#18181B',
          20: '#27272A',
          30: '#3F3F46',
          40: '#52525B',
          50: '#71717A',
          60: '#A1A1AA',
          70: '#D4D4D8',
        },
        // Accent
        accent: {
          DEFAULT: '#2563EB',
          h: '#1D4ED8',
          l: '#EFF6FF',
          m: '#DBEAFE',
          b: '#BFDBFE',
        },
        // Semantic
        success: {
          DEFAULT: '#16A34A',
          l: '#F0FDF4',
        },
        warning: {
          DEFAULT: '#CA8A04',
          l: '#FEFCE8',
        },
        error: {
          DEFAULT: '#DC2626',
          l: '#FEF2F2',
        },
        'swiss-red': '#FF0000',
      },
      boxShadow: {
        1: '0 1px 2px rgba(0,0,0,0.03)',
        2: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        3: '0 4px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
        4: '0 12px 40px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.03)',
        5: '0 24px 60px rgba(0,0,0,0.09), 0 8px 24px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      transitionTimingFunction: {
        kairos: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
}
