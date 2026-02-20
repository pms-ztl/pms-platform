import clsx from 'clsx';
import { useLoadingStore } from '@/store/loading';

export function TopLoadingBar() {
  const { isLoading, progress } = useLoadingStore();

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none',
        'transition-opacity duration-300',
        isLoading || progress > 0 ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div
        className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-accent-400 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      >
        {/* Glow effect on the leading edge */}
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/30 to-transparent" />
      </div>
    </div>
  );
}
