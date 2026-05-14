import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terra: { DEFAULT: '#E0602A', dark: '#C84E20' },
        cream: '#FDF0E8',
        ink: '#1E0E00',
        brown: '#8B7355',
        // Palette A - voicemail kiosk Layout C (binder-tab) category colors.
        // Receipt-faithful, low-chroma. Scoped to the kiosk for now; CHIRAN
        // T-229 tracks formalizing them as official brand additions.
        sage: '#7B9C68',
        'dusty-blue': '#4A6D86',
        bone: '#B0A090',
        // Voicemail-route kiosk (Direction A - receipt). CSS-variable backed
        // so the [data-theme="dark"] swap defined in
        // src/components/kiosk/voicemail/styles.module.css cascades through
        // at runtime (cream stays warm in dark mode per the CD spec).
        // Namespaced under `rcp` so existing surfaces are untouched - the
        // values resolve to nothing outside the .root scope, which is
        // intentional: these utilities are only used inside the kiosk.
        rcp: {
          terra: 'var(--rcp-terra)',
          'terra-warm': 'var(--rcp-terra-warm)',
          'terra-dark': 'var(--rcp-terra-dark)',
          cream: 'var(--rcp-cream)',
          'cream-2': 'var(--rcp-cream-2)',
          paper: 'var(--rcp-paper)',
          'paper-edge': 'var(--rcp-paper-edge)',
          ink: 'var(--rcp-ink)',
          'ink-3': 'var(--rcp-ink-3)',
          cocoa: 'var(--rcp-cocoa)',
          brown: 'var(--rcp-brown)',
          bone: 'var(--rcp-bone)',
          sand: 'var(--rcp-sand)',
          rule: 'var(--rcp-rule)',
          'rule-soft': 'var(--rcp-rule-soft)',
          success: 'var(--rcp-success)',
          danger: 'var(--rcp-danger)',
          // Semantic tokens: encapsulate the few element colors whose
          // light/dark values do not map cleanly onto a single base token.
          'text-strong': 'var(--rcp-text-strong)',
          'text-body': 'var(--rcp-text-body)',
          'card-border': 'var(--rcp-card-border)',
          'stamp-hover': 'var(--rcp-stamp-hover)',
          'act-fg': 'var(--rcp-act-fg)',
          'act-border': 'var(--rcp-act-border)',
          'act-hover-bg': 'var(--rcp-act-hover-bg)',
          'act-hover-border': 'var(--rcp-act-hover-border)',
          'act-primary-bg': 'var(--rcp-act-primary-bg)',
          'act-primary-fg': 'var(--rcp-act-primary-fg)',
          'act-primary-hover-bg': 'var(--rcp-act-primary-hover-bg)',
          'play-bg': 'var(--rcp-play-bg)',
          'play-fg': 'var(--rcp-play-fg)',
          'play-hover-bg': 'var(--rcp-play-hover-bg)',
          'bar-played': 'var(--rcp-bar-played)',
          'chip-active-bg': 'var(--rcp-chip-active-bg)',
          'chip-active-fg': 'var(--rcp-chip-active-fg)',
          'chip-active-key': 'var(--rcp-chip-active-key)',
          'tab-count-bg': 'var(--rcp-tab-count-bg)',
          'popover-bg': 'var(--rcp-popover-bg)',
          'popover-border': 'var(--rcp-popover-border)',
          'repeat-bg': 'var(--rcp-repeat-bg)',
          'repeat-fg': 'var(--rcp-repeat-fg)',
          // Terra wash tints used on hover / current states, plus the soft
          // status-stamp borders. Theme-constant (the prototype does not
          // swap these in dark mode), so they are literal rather than
          // CSS-variable backed.
          'terra-tint': 'rgba(212, 101, 44, 0.1)',
          'terra-tint-soft': 'rgba(212, 101, 44, 0.06)',
          'danger-soft': 'rgba(220, 38, 38, 0.4)',
          'success-soft': 'rgba(22, 163, 74, 0.35)',
        },
      },
      boxShadow: {
        // Voicemail-route kiosk receipt cards + popover. Card shadows are
        // CSS-variable backed (theme-variant); the popover shadow is the
        // same in both themes.
        'rcp-card': 'var(--rcp-shadow-card)',
        'rcp-card-hover': 'var(--rcp-shadow-card-hover)',
        'rcp-card-expanded': 'var(--rcp-shadow-card-expanded)',
        'rcp-popover':
          '0 24px 60px rgba(94,35,10,0.18), 0 4px 12px rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: [
          'var(--font-jakarta)',
          'Plus Jakarta Sans',
          'var(--font-noto-devanagari)',
          'var(--font-noto-telugu)',
          'var(--font-noto-gurmukhi)',
          'system-ui',
          'sans-serif',
        ],
        // Voicemail-route kiosk display font (numerals, keys, timestamps,
        // ticket ids). Namespaced so the repo-wide default `font-mono`
        // (used by the admin labeling surface) is left untouched.
        'rcp-mono': [
          'var(--font-jetbrains-mono)',
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
        // Nunito powers the Fono wordmark in the voicemail kiosk header.
        // Already loaded by the root layout as --font-nunito.
        nunito: ['var(--font-nunito)', 'Nunito', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-top': {
          '0%': { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in-top': 'slide-in-top 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
