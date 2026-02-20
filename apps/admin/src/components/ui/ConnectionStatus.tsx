import clsx from 'clsx';

import { useSocketStatus } from '../../providers/SocketProvider';

export function ConnectionStatus() {
  const { status } = useSocketStatus();
  if (status === 'connected') return null;

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg',
        status === 'connecting' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', status === 'connecting' ? 'bg-amber-200 animate-pulse' : 'bg-red-200')} />
      {status === 'connecting' ? 'Reconnecting...' : 'Offline'}
    </div>
  );
}

export function LiveIndicator() {
  const { status } = useSocketStatus();
  return (
    <span
      className={clsx(
        'inline-block h-2 w-2 rounded-full',
        status === 'connected' ? 'bg-emerald-400 animate-pulse' : status === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
      )}
      title={status === 'connected' ? 'Live' : status === 'connecting' ? 'Reconnecting' : 'Offline'}
    />
  );
}
