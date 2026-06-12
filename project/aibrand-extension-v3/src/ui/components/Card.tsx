import type { ReactNode, HTMLAttributes } from 'react';

type CardVariant = 'default' | 'interactive' | 'highlight';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
  padded?: boolean;
}

const variants: Record<CardVariant, string> = {
  default:  'bg-zinc-900 border border-zinc-800',
  interactive: 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors duration-150',
  highlight: 'bg-blue-950/30 border border-blue-800/20',
};

export function Card({ variant = 'default', children, padded = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg ${variants[variant]} ${padded ? 'p-4' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/** Card sub-section with title */
export function CardSection({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {title && (
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</h4>
      )}
      {children}
    </div>
  );
}
