import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#0a0a0f',
        'brand-surface': '#13131a',
        'brand-card': '#1a1a24',
        'brand-border': '#2a2a3a',
        'neon-green': '#00ff87',
        'neon-green-dim': '#00c966',
        'crimson': '#e11d48',
        'crimson-dim': '#9f1239',
        'gold': '#f59e0b',
        'gold-dim': '#d97706',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0,255,135,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0,255,135,0.7), 0 0 40px rgba(0,255,135,0.3)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
