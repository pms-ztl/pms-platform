import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.08] text-white/60 border border-white/[0.06]',
  success: 'bg-emerald-400/[0.12] text-emerald-400 border border-emerald-400/[0.15]',
  warning: 'bg-amber-400/[0.12] text-amber-400 border border-amber-400/[0.15]',
  danger: 'bg-red-400/[0.12] text-red-400 border border-red-400/[0.15]',
  info: 'bg-sky-400/[0.12] text-sky-400 border border-sky-400/[0.15]',
  primary: 'bg-violet-400/[0.12] text-violet-400 border border-violet-400/[0.15]',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-white/50',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-sky-400',
  primary: 'bg-violet-400',
};

export function Badge({ children, variant = 'default', size = 'sm', dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variantClasses[variant],
        className
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
