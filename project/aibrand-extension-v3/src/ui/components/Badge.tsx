type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand';

interface BadgeProps {
  variant?: BadgeVariant;
  children: string;
  dot?: boolean;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  success: 'bg-green-950/40 text-green-400 border-green-800/30',
  warning: 'bg-amber-950/40 text-amber-400 border-amber-800/30',
  error:   'bg-red-950/40 text-red-400 border-red-800/30',
  info:    'bg-blue-950/40 text-blue-400 border-blue-800/30',
  brand:   'bg-blue-950/40 text-blue-400 border-blue-700/30',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-zinc-500', success: 'bg-green-500', warning: 'bg-amber-500',
  error: 'bg-red-500', info: 'bg-blue-500', brand: 'bg-blue-500',
};

export function Badge({ variant = 'default', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border ${variants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
