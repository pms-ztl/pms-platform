import clsx from 'clsx';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export function Divider({
  orientation = 'horizontal',
  label,
  className,
}: DividerProps) {
  if (label) {
    return (
      <div className={clsx('relative', className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{label}</span>
        </div>
      </div>
    );
  }

  if (orientation === 'vertical') {
    return <div className={clsx('w-px bg-gray-200 self-stretch', className)} />;
  }

  return <hr className={clsx('border-t border-gray-200', className)} />;
}

Divider.displayName = 'Divider';
