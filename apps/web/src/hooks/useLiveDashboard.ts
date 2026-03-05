import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

interface LiveDashboardState {
  /** Socket connection status */
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  /** ISO timestamp of last data update from socket */
  lastUpdated: string | null;
  /** Whether polling fallback should be active (socket disconnected) */
  shouldPoll: boolean;
  /** Polling interval in ms (0 = no polling, 30000 = 30s fallback) */
  pollingInterval: number;
}

/**
 * Tracks real-time dashboard state: socket connection, last update time,
 * and whether to fall back to polling when socket is disconnected.
 */
export function useLiveDashboard(): LiveDashboardState {
  const { status, socket } = useSocket();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const listenerAttached = useRef(false);

  // Track data:changed events to update the lastUpdated timestamp
  useEffect(() => {
    if (!socket || listenerAttached.current) return;

    const handler = () => {
      setLastUpdated(new Date().toISOString());
    };

    socket.on('data:changed', handler);
    listenerAttached.current = true;

    return () => {
      socket.off('data:changed', handler);
      listenerAttached.current = false;
    };
  }, [socket]);

  const shouldPoll = status !== 'connected';
  const pollingInterval = shouldPoll ? 30_000 : 0;

  return {
    connectionStatus: status,
    lastUpdated,
    shouldPoll,
    pollingInterval,
  };
}
