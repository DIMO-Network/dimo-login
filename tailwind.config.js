/**
 * Design tokens from the DIMO developer console (its tailwind.config.ts and
 * docs/DESIGN.md). Colors read CSS variables set in src/index.css, so opacity
 * modifiers work (bg-card/60). Tokens extend Tailwind's palette rather than
 * replace it, so screens not yet moved to tokens keep rendering.
 *
 * @type {import('tailwindcss').Config}
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'canvas': token('canvas'),
        'sheet': token('sheet'),
        'card': token('card'),
        'control': token('control'),
        'highest': token('highest'),
        'bright': token('bright'),
        'overlay': token('overlay'),
        'outline': token('outline'),
        'outline-strong': token('outline-strong'),
        'canvas-divider': token('canvas-divider'),
        'control-border': token('control-border'),
        'control-border-hover': token('control-border-hover'),
        'focus-ring': token('focus-ring'),
        'ink': token('ink'),
        'fg': token('fg'),
        'muted': token('muted'),
        'accent': token('accent'),
        'accent-ink': token('accent-ink'),
        'on-accent': token('on-accent'),
        'accent-soft': 'var(--accent-soft)',
        'accent-soft-strong': 'var(--accent-soft-strong)',
        'selected-bg': token('selected-bg'),
        'selected-fg': token('selected-fg'),
        'btn-primary': token('btn-primary'),
        'btn-primary-fg': token('btn-primary-fg'),
        'btn-primary-hover': token('btn-primary-hover'),
        'sky': token('sky'),
        'positive': token('positive'),
        'warning': token('warning'),
        'negative': token('negative'),
        'negative-soft': token('negative-soft'),
        'scrim': 'var(--scrim)',
        // The OEM's color when the brand record has one (AppShell), else ink.
        'brand': 'var(--popup-brand-color, rgb(var(--btn-primary)))',
        'brand-fg': 'var(--popup-brand-text, rgb(var(--btn-primary-fg)))',
      },
      backgroundImage: {
        'brand-gradient': 'var(--brand-gradient)',
        'progress-fill': 'var(--progress-fill)',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
        sm: 'var(--shadow-sm)',
        selected: 'inset 3px 0 0 rgb(var(--ink))',
      },
      borderRadius: {
        chip: '6px',
        control: '10px',
        card: '16px',
        panel: '20px',
      },
      fontSize: {
        'title': [
          '20px',
          { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.01em' },
        ],
        'panel-title': ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'card-title': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'metric': [
          '40px',
          { lineHeight: '44px', fontWeight: '600', letterSpacing: '-0.03em' },
        ],
        'body': ['15px', { lineHeight: '22px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'label': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'code': ['13px', { lineHeight: '20px' }],
      },
      fontFamily: {
        sans: [
          'Euclid Circular A',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'dot-wave': {
          '0%, 100%': { transform: 'scale(0.8)', opacity: '0.5' },
          '50%': { transform: 'scale(1.3)', opacity: '1' },
        },
      },
      animation: {
        'dot-wave': 'dot-wave 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
