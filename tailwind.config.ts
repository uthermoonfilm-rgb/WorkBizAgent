import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        apex: {
          bg: '#080810',
          surface: '#0F0F1A',
          card: '#141428',
          border: '#1E1E3A',
          primary: '#6366F1',
          'primary-glow': '#818CF8',
          gold: '#F59E0B',
          'gold-dim': '#92400E',
          win: '#10B981',
          loss: '#EF4444',
          text: '#F8FAFC',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'xp-bar': 'xpBar 1s ease-out forwards',
        'level-up': 'levelUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #6366F130' },
          '100%': { boxShadow: '0 0 20px #6366F160, 0 0 40px #6366F120' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        xpBar: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--xp-width)' },
        },
        levelUp: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366F1' fill-opacity='0.03'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}

export default config
