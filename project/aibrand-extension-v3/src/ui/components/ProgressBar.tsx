type ProgressVariant = 'brand' | 'success' | 'warning' | 'error';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: ProgressVariant;
  /** Indeterminate: show animated stripe (no specific value) */
  indeterminate?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

const barColors: Record<ProgressVariant, string> = {
  brand:   'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
};

export function ProgressBar({
  value, variant = 'brand', indeterminate = false, size = 'md', label, className = '',
}: ProgressBarProps) {
  const h = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className={`space-y-1 ${className}`}>
      {(label || !indeterminate) && (
        <div className="flex justify-between text-xs text-zinc-500">
          {label && <span>{label}</span>}
          {!indeterminate && <span className="font-mono tabular-nums">{Math.round(value)}%</span>}
        </div>
      )}
      <div className={`w-full ${h} rounded-full bg-zinc-800 overflow-hidden`}>
        <div
          className={`${h} rounded-full transition-all duration-500 ease-out ${
            indeterminate
              ? 'w-1/2 animate-[slide_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-blue-500 to-transparent'
              : barColors[variant]
          }`}
          style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
