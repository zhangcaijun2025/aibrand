/**
 * AiBrand Extension v3 — MessageBox Container
 *
 * Shared container for pre-send confirmation and post-send feedback panels.
 * Provides consistent styling, animation, and layout.
 */

import { type ReactNode, useEffect, useState } from 'react';

interface MessageBoxProps {
  /** Visual variant */
  variant: 'confirm' | 'success' | 'error' | 'info' | 'warning';
  /** Title shown in header */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Main content */
  children: ReactNode;
  /** Action buttons row */
  actions?: ReactNode;
  /** Whether to show the box */
  visible: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
}

const variantStyles: Record<MessageBoxProps['variant'], {
  border: string;
  bg: string;
  accent: string;
  icon: string;
}> = {
  confirm: {
    border: 'border-brand-600/30',
    bg: 'bg-brand-950/50',
    accent: 'text-brand-400',
    icon: '📋',
  },
  success: {
    border: 'border-green-800/30',
    bg: 'bg-green-950/30',
    accent: 'text-green-400',
    icon: '✅',
  },
  error: {
    border: 'border-red-800/30',
    bg: 'bg-red-950/30',
    accent: 'text-red-400',
    icon: '❌',
  },
  info: {
    border: 'border-blue-800/30',
    bg: 'bg-blue-950/30',
    accent: 'text-blue-400',
    icon: 'ℹ️',
  },
  warning: {
    border: 'border-amber-800/30',
    bg: 'bg-amber-950/30',
    accent: 'text-amber-400',
    icon: '⚠️',
  },
};

export function MessageBox({
  variant,
  title,
  subtitle,
  children,
  actions,
  visible,
  onDismiss,
}: MessageBoxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    }
    setMounted(false);
  }, [visible]);

  if (!visible) return null;

  const style = variantStyles[variant];

  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden transition-all duration-300 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg flex-shrink-0">{style.icon}</span>
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold ${style.accent} truncate`}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-white/40 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 text-sm text-white/70 space-y-3">
        {children}
      </div>

      {/* Actions */}
      {actions && (
        <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2 justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────

/** Platform tag badge */
export function PlatformBadge({
  platform,
  status,
}: {
  platform: string;
  status?: 'success' | 'error' | 'pending';
}) {
  const colorMap = {
    success: 'bg-green-900/30 text-green-400 border-green-800/30',
    error: 'bg-red-900/30 text-red-400 border-red-800/30',
    pending: 'bg-surface-overlay text-white/50 border-surface-border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border ${
        colorMap[status ?? 'pending']
      }`}
    >
      {status === 'success' && <CheckMark />}
      {status === 'error' && <CrossMark />}
      {status === 'pending' && <Dot />}
      {platform}
    </span>
  );
}

function CheckMark() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossMark() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Dot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />;
}
