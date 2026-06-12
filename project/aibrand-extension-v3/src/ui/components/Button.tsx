/**
 * AiBrand Design System — Button
 *
 * Variants: primary / secondary / danger / ghost
 * Sizes: sm / md / lg
 * States: idle / hover / active / focus / disabled / loading
 */

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 ' +
    'focus:ring-2 focus:ring-blue-500/50 shadow-lg shadow-blue-600/20',
  secondary:
    'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:bg-zinc-600 ' +
    'border border-zinc-700 focus:ring-2 focus:ring-zinc-500/30',
  danger:
    'bg-red-900/40 text-red-300 hover:bg-red-900/60 active:bg-red-900/80 ' +
    'border border-red-800/30 focus:ring-2 focus:ring-red-500/30',
  ghost:
    'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 active:bg-zinc-800 ' +
    'focus:ring-2 focus:ring-zinc-500/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

const LoadingSpinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-150 ease-out
          disabled:opacity-40 disabled:cursor-not-allowed
          outline-none
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
