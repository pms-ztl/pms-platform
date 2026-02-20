import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'line' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ className, variant = 'line', width, height, count = 1 }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-white/[0.08]';
  const variantClass = {
    line: 'h-4 rounded-md',
    circle: 'rounded-full',
    rect: 'rounded-xl',
  }[variant];

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (count === 1) {
    return <div className={clsx(baseClass, variantClass, className)} style={style} />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={clsx(baseClass, variantClass, className)}
          style={{ ...style, width: i === count - 1 && !width ? '75%' : style.width }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('glass-stat p-6', className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="flex-1">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} className="mt-2" />
        </div>
      </div>
      <Skeleton count={3} />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-white/[0.06]">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton width={c === 0 ? '70%' : '50%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
