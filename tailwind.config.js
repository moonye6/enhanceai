/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── LEGACY palette (existing pages: /, /pricing, /history) ──
        // Keep until migrate trigger fires. See TODOS.md P0 checkpoint.
        primary: {
          50: '#EDEDFD',
          100: '#DCDCFB',
          200: '#B8B9F7',
          300: '#9496F3',
          400: '#7173EF',
          500: '#5B5FEF',
          600: '#3438E8',
          700: '#2226BA',
          800: '#191C8B',
          900: '#10125D',
        },
        dark: {
          DEFAULT: '#0F172A',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        accent: '#22C55E',

        // ── BRAND tokens (new SEO pages, scoped under .brand-theme) ──
        // CSS variables defined in globals.css. See DESIGN.md.
        bg: 'var(--bg)',
        surface: 'var(--bg-elevated)',
        'surface-subtle': 'var(--bg-subtle)',
        bborder: 'var(--border)',           // "bborder" avoids collision with the `border` utility
        'bborder-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
        brand: 'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
        'brand-subtle': 'var(--brand-subtle)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        err: 'var(--err)',
        info: 'var(--info)',
      },
      fontFamily: {
        // Legacy default (existing pages keep Inter)
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Brand fonts (use under .brand-theme, e.g. `font-display`, `font-body`, `font-mono`)
        display: ['var(--font-display)', 'Georgia', '"Times New Roman"', 'serif'],
        body: ['var(--font-body)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        // Brand hierarchical radius — see DESIGN.md
        'brand-sm': '6px',
        'brand-md': '10px',
        'brand-lg': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
        'btn': '0 1px 2px rgba(91,95,239,0.15), 0 1px 3px rgba(91,95,239,0.1)',
        'btn-hover': '0 4px 14px rgba(91,95,239,0.25), 0 2px 6px rgba(91,95,239,0.15)',
        'glow': '0 0 20px rgba(91,95,239,0.15)',
        'glow-accent': '0 0 20px rgba(34,197,94,0.15)',
      },
    },
  },
  plugins: [],
};
