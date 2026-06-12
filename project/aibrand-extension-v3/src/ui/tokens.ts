/**
 * AiBrand Design Tokens
 *
 * Single source of truth for all visual values.
 * No hardcoded colors/spacing/radius anywhere else.
 */

export const tokens = {
  color: {
    // Brand palette
    brand: {
      50:  '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
      400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
      800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
    },

    // Surface hierarchy (dark theme)
    surface: {
      base:      '#0a0a0b',
      elevated:  '#18181b',
      overlay:   '#27272a',
      border:    '#3f3f46',
      highlight: '#52525b',
    },

    // Semantic
    text: {
      primary:   '#fafafa',
      secondary: '#a1a1aa',
      muted:     '#71717a',
      disabled:  '#52525b',
    },

    success: {
      bg:     '#052e16',
      border: '#166534',
      text:   '#4ade80',
      icon:   '#22c55e',
    },

    warning: {
      bg:     '#451a03',
      border: '#92400e',
      text:   '#fbbf24',
      icon:   '#f59e0b',
    },

    error: {
      bg:     '#450a0a',
      border: '#991b1b',
      text:   '#fca5a5',
      icon:   '#ef4444',
    },

    info: {
      bg:     '#172554',
      border: '#1e40af',
      text:   '#93c5fd',
      icon:   '#3b82f6',
    },
  },

  // Spacing scale (4px base)
  space: {
    0: '0',    1: '4px',  2: '8px',   3: '12px',
    4: '16px', 5: '20px', 6: '24px',  8: '32px',
    10: '40px', 12: '48px', 16: '64px',
  },

  // Border radius
  radius: {
    none: '0',
    sm:   '6px',
    md:   '8px',
    lg:   '12px',
    xl:   '16px',
    full: '9999px',
  },

  // Typography
  font: {
    sans:  "'Inter', system-ui, -apple-system, sans-serif",
    mono:  "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs:   ['11px', { lineHeight: '16px' }],
    sm:   ['13px', { lineHeight: '20px' }],
    base: ['14px', { lineHeight: '22px' }],
    lg:   ['16px', { lineHeight: '24px' }],
    xl:   ['20px', { lineHeight: '28px' }],
  },
  fontWeight: {
    normal:  '400',
    medium:  '500',
    semibold:'600',
    bold:    '700',
  },

  // Shadows (dark theme)
  shadow: {
    sm:   '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    md:   '0 4px 6px -1px rgb(0 0 0 / 0.4)',
    lg:   '0 10px 15px -3px rgb(0 0 0 / 0.5)',
    glow: '0 0 12px -2px rgb(37 99 235 / 0.3)',
  },

  // Animation
  duration: {
    fast:    '150ms',
    normal:  '250ms',
    slow:    '400ms',
    slower:  '600ms',
  },
  ease: {
    out:    'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut:  'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Z-index scale
  z: {
    base:     0,
    dropdown: 100,
    sticky:   200,
    overlay:  300,
    modal:    400,
    toast:    500,
    tooltip:  600,
  },
} as const;
