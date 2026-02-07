/**
 * Real-time Update System
 *
 * WebSocket-based real-time updates with optimistic UI,
 * connection management, and offline support.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RealtimeMessage {
  id: string;
  type: string;
  channel: string;
  payload: unknown;
  timestamp: Date;
  metadata?: {
    userId?: string;
    tenantId?: string;
    correlationId?: string;
  };
}

export interface Subscription {
  channel: string;
  filter?: Record<string, unknown>;
  onMessage: (message: RealtimeMessage) => void;
  onError?: (error: Error) => void;
}

export interface OptimisticUpdate<T = unknown> {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  optimisticData: T;
  previousData?: T;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  retryCount: number;
  maxRetries: number;
}

export interface RealtimeConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableOfflineQueue?: boolean;
  maxOfflineQueueSize?: number;
}

// ============================================================================
// REALTIME CONTEXT
// ============================================================================

interface RealtimeContextValue {
  // Connection state
  status: ConnectionStatus;
  isConnected: boolean;
  latency: number | null;
  lastMessageAt: Date | null;

  // Subscriptions
  subscribe: (subscription: Subscription) => () => void;
  unsubscribe: (channel: string) => void;

  // Sending messages
  send: (type: string, channel: string, payload: unknown) => Promise<void>;

  // Optimistic updates
  applyOptimisticUpdate: <T>(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'status' | 'retryCount'>) => string;
  confirmOptimisticUpdate: (updateId: string) => void;
  revertOptimisticUpdate: (updateId: string) => void;
  getOptimisticUpdates: (entityType: string) => OptimisticUpdate[];

  // Offline support
  isOffline: boolean;
  offlineQueueSize: number;
  flushOfflineQueue: () => Promise<void>;

  // Presence
  presence: Map<string, UserPresence>;
  setPresence: (status: PresenceStatus, metadata?: Record<string, unknown>) => void;
}

export interface UserPresence {
  userId: string;
  userName: string;
  status: PresenceStatus;
  lastSeen: Date;
  currentView?: string;
  metadata?: Record<string, unknown>;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};

// ============================================================================
// REALTIME PROVIDER
// ============================================================================

interface RealtimeProviderProps {
  config: RealtimeConfig;
  userId: string;
  userName: string;
  tenantId: string;
  children: ReactNode;
  onConnectionChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({
  config,
  userId,
  userName,
  tenantId,
  children,
  onConnectionChange,
  onError,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [latency, setLatency] = useState<number | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [presence, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const subscriptions = useRef<Map<string, Set<Subscription>>>(new Map());
  const optimisticUpdates = useRef<Map<string, OptimisticUpdate>>(new Map());
  const offlineQueue = useRef<RealtimeMessage[]>([]);
  const pendingPings = useRef<Map<string, number>>(new Map());

  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval: hbInterval = 30000,
    enableOfflineQueue = true,
    maxOfflineQueueSize = 100,
  } = config;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (status === 'disconnected') {
        connect();
      }
      flushOfflineQueue();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    onConnectionChange?.('connecting');

    try {
      const ws = new WebSocket(`${config.url}?userId=${userId}&tenantId=${tenantId}`);

      ws.onopen = () => {
        setStatus('connected');
        onConnectionChange?.('connected');
        reconnectAttempts.current = 0;

        // Send initial presence
        ws.send(JSON.stringify({
          type: 'presence',
          payload: {
            userId,
            userName,
            status: 'online',
          },
        }));

        // Re-subscribe to all channels
        subscriptions.current.forEach((_, channel) => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel,
          }));
        });

        // Start heartbeat
        heartbeatInterval.current = setInterval(() => {
          const pingId = `ping_${Date.now()}`;
          pendingPings.current.set(pingId, Date.now());
          ws.send(JSON.stringify({ type: 'ping', id: pingId }));
        }, hbInterval);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as RealtimeMessage;
        setLastMessageAt(new Date());

        // Handle pong for latency calculation
        if (message.type === 'pong' && message.payload) {
          const pingId = (message.payload as { id: string }).id;
          const sentAt = pendingPings.current.get(pingId);
          if (sentAt) {
            setLatency(Date.now() - sentAt);
            pendingPings.current.delete(pingId);
          }
          return;
        }

        // Handle presence updates
        if (message.type === 'presence') {
          const presenceData = message.payload as UserPresence;
          setPresenceMap(prev => {
            const newMap = new Map(prev);
            if (presenceData.status === 'offline') {
              newMap.delete(presenceData.userId);
            } else {
              newMap.set(presenceData.userId, {
                ...presenceData,
                lastSeen: new Date(),
              });
            }
            return newMap;
          });
          return;
        }

        // Handle optimistic update confirmations
        if (message.type === 'confirm') {
          const { updateId } = message.payload as { updateId: string };
          confirmOptimisticUpdate(updateId);
          return;
        }

        // Handle optimistic update failures
        if (message.type === 'reject') {
          const { updateId, error } = message.payload as { updateId: string; error: string };
          revertOptimisticUpdate(updateId);
          onError?.(new Error(error));
          return;
        }

        // Dispatch to channel subscribers
        const channelSubs = subscriptions.current.get(message.channel);
        if (channelSubs) {
          channelSubs.forEach(sub => {
            try {
              // Apply filter if present
              if (sub.filter) {
                const payload = message.payload as Record<string, unknown>;
                const matches = Object.entries(sub.filter).every(
                  ([key, value]) => payload[key] === value
                );
                if (!matches) return;
              }
              sub.onMessage(message);
            } catch (err) {
              sub.onError?.(err as Error);
            }
          });
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        onConnectionChange?.('disconnected');

        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }

        // Attempt reconnect
        if (reconnectAttempts.current < maxReconnectAttempts && !isOffline) {
          setStatus('reconnecting');
          onConnectionChange?.('reconnecting');

          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, reconnectInterval * Math.pow(2, reconnectAttempts.current)); // Exponential backoff
        }
      };

      ws.onerror = (event) => {
        onError?.(new Error('WebSocket error'));
      };

      wsRef.current = ws;
    } catch (err) {
      onError?.(err as Error);
      setStatus('disconnected');
    }
  }, [config.url, userId, userName, tenantId, hbInterval, reconnectInterval, maxReconnectAttempts, isOffline, onConnectionChange, onError]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  // Subscribe to channel
  const subscribe = useCallback((subscription: Subscription): (() => void) => {
    const { channel } = subscription;

    if (!subscriptions.current.has(channel)) {
      subscriptions.current.set(channel, new Set());

      // Subscribe on server
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          channel,
          filter: subscription.filter,
        }));
      }
    }

    subscriptions.current.get(channel)!.add(subscription);

    return () => {
      const channelSubs = subscriptions.current.get(channel);
      if (channelSubs) {
        channelSubs.delete(subscription);
        if (channelSubs.size === 0) {
          subscriptions.current.delete(channel);
          // Unsubscribe on server
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'unsubscribe',
              channel,
            }));
          }
        }
      }
    };
  }, []);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string) => {
    subscriptions.current.delete(channel);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
      }));
    }
  }, []);

  // Send message
  const send = useCallback(async (type: string, channel: string, payload: unknown): Promise<void> => {
    const message: RealtimeMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      channel,
      payload,
      timestamp: new Date(),
      metadata: {
        userId,
        tenantId,
      },
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else if (enableOfflineQueue) {
      // Queue for offline
      if (offlineQueue.current.length < maxOfflineQueueSize) {
        offlineQueue.current.push(message);
      }
    } else {
      throw new Error('Not connected');
    }
  }, [userId, tenantId, enableOfflineQueue, maxOfflineQueueSize]);

  // Flush offline queue
  const flushOfflineQueue = useCallback(async () => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const queue = [...offlineQueue.current];
    offlineQueue.current = [];

    for (const message of queue) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Optimistic update management
  const applyOptimisticUpdate = useCallback(<T,>(
    update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'status' | 'retryCount'>
  ): string => {
    const id = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullUpdate: OptimisticUpdate<T> = {
      ...update,
      id,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    optimisticUpdates.current.set(id, fullUpdate as OptimisticUpdate);

    // Send to server
    send('optimistic_update', `entity:${update.entityType}`, {
      updateId: id,
      ...update,
    });

    return id;
  }, [send]);

  const confirmOptimisticUpdate = useCallback((updateId: string) => {
    const update = optimisticUpdates.current.get(updateId);
    if (update) {
      update.status = 'confirmed';
      // Remove after short delay to allow UI to update
      setTimeout(() => {
        optimisticUpdates.current.delete(updateId);
      }, 100);
    }
  }, []);

  const revertOptimisticUpdate = useCallback((updateId: string) => {
    const update = optimisticUpdates.current.get(updateId);
    if (update) {
      update.status = 'failed';
      // Remove after short delay to allow UI to revert
      setTimeout(() => {
        optimisticUpdates.current.delete(updateId);
      }, 100);
    }
  }, []);

  const getOptimisticUpdates = useCallback((entityType: string): OptimisticUpdate[] => {
    return Array.from(optimisticUpdates.current.values())
      .filter(u => u.entityType === entityType && u.status === 'pending');
  }, []);

  // Set presence
  const setPresence = useCallback((presenceStatus: PresenceStatus, metadata?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presence',
        payload: {
          userId,
          userName,
          status: presenceStatus,
          metadata,
        },
      }));
    }
  }, [userId, userName]);

  const value = useMemo<RealtimeContextValue>(() => ({
    status,
    isConnected: status === 'connected',
    latency,
    lastMessageAt,
    subscribe,
    unsubscribe,
    send,
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    revertOptimisticUpdate,
    getOptimisticUpdates,
    isOffline,
    offlineQueueSize: offlineQueue.current.length,
    flushOfflineQueue,
    presence,
    setPresence,
  }), [
    status, latency, lastMessageAt, subscribe, unsubscribe, send,
    applyOptimisticUpdate, confirmOptimisticUpdate, revertOptimisticUpdate,
    getOptimisticUpdates, isOffline, flushOfflineQueue, presence, setPresence,
  ]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

export function useSubscription<T>(
  channel: string,
  filter?: Record<string, unknown>,
  deps: unknown[] = []
) {
  const { subscribe } = useRealtime();
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe({
      channel,
      filter,
      onMessage: (message) => {
        setLastMessage(message);
        setMessages(prev => [...prev.slice(-99), message]); // Keep last 100
      },
      onError: setError,
    });

    return unsubscribe;
  }, [channel, JSON.stringify(filter), subscribe, ...deps]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  return {
    messages,
    lastMessage,
    data: lastMessage?.payload as T | undefined,
    error,
    clearMessages,
  };
}

export function useOptimisticMutation<TData, TVariables>(
  entityType: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    optimisticUpdate?: (variables: TVariables) => TData;
  }
) {
  const { applyOptimisticUpdate, confirmOptimisticUpdate, revertOptimisticUpdate } = useRealtime();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables, entityId: string) => {
    setIsLoading(true);
    setError(null);

    let updateId: string | null = null;

    // Apply optimistic update if provided
    if (options?.optimisticUpdate) {
      const optimisticData = options.optimisticUpdate(variables);
      updateId = applyOptimisticUpdate({
        type: 'update',
        entityType,
        entityId,
        optimisticData,
        maxRetries: 3,
      });
    }

    try {
      const data = await mutationFn(variables);
      if (updateId) {
        confirmOptimisticUpdate(updateId);
      }
      options?.onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (updateId) {
        revertOptimisticUpdate(updateId);
      }
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [entityType, mutationFn, options, applyOptimisticUpdate, confirmOptimisticUpdate, revertOptimisticUpdate]);

  return { mutate, isLoading, error };
}

export function usePresence(channel?: string) {
  const { presence, subscribe } = useRealtime();
  const [channelPresence, setChannelPresence] = useState<UserPresence[]>([]);

  useEffect(() => {
    if (!channel) return;

    const unsubscribe = subscribe({
      channel: `presence:${channel}`,
      onMessage: (message) => {
        if (message.type === 'presence_list') {
          setChannelPresence(message.payload as UserPresence[]);
        }
      },
    });

    return unsubscribe;
  }, [channel, subscribe]);

  return {
    globalPresence: Array.from(presence.values()),
    channelPresence,
    onlineCount: Array.from(presence.values()).filter(p => p.status === 'online').length,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface ConnectionStatusIndicatorProps {
  showLatency?: boolean;
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showLatency = false,
  className = '',
}) => {
  const { status, latency, isOffline } = useRealtime();

  const statusConfig = {
    connected: { color: '#10B981', label: 'Connected' },
    connecting: { color: '#F59E0B', label: 'Connecting...' },
    reconnecting: { color: '#F59E0B', label: 'Reconnecting...' },
    disconnected: { color: '#EF4444', label: 'Disconnected' },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`connection-status ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="status-dot"
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      <span className="status-label">{config.label}</span>
      {showLatency && latency !== null && status === 'connected' && (
        <span className="status-latency">{latency}ms</span>
      )}
      {isOffline && (
        <span className="offline-badge">Offline</span>
      )}
    </div>
  );
};

interface LiveUpdateBadgeProps {
  lastUpdate: Date | null;
  className?: string;
}

export const LiveUpdateBadge: React.FC<LiveUpdateBadgeProps> = ({
  lastUpdate,
  className = '',
}) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdate) {
        setTimeAgo('');
        return;
      }

      const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);

      if (seconds < 5) {
        setTimeAgo('Just now');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  if (!lastUpdate) return null;

  return (
    <div className={`live-update-badge ${className}`}>
      <span className="pulse-dot" aria-hidden="true" />
      <span className="update-time">Updated {timeAgo}</span>
    </div>
  );
};

interface PresenceAvatarsProps {
  users: UserPresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({
  users,
  maxVisible = 5,
  size = 'md',
  className = '',
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const statusColors = {
    online: '#10B981',
    away: '#F59E0B',
    busy: '#EF4444',
    offline: '#6B7280',
  };

  return (
    <div
      className={`presence-avatars ${className}`}
      role="group"
      aria-label={`${users.length} users present`}
    >
      {visibleUsers.map((user, index) => (
        <div
          key={user.userId}
          className={`presence-avatar ${sizeClasses[size]}`}
          style={{ marginLeft: index > 0 ? '-8px' : 0, zIndex: maxVisible - index }}
          title={`${user.userName} - ${user.status}`}
        >
          <span className="avatar-initials">
            {user.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </span>
          <span
            className="status-indicator"
            style={{ backgroundColor: statusColors[user.status] }}
            aria-label={user.status}
          />
        </div>
      ))}
      {hiddenCount > 0 && (
        <div
          className={`presence-avatar overflow ${sizeClasses[size]}`}
          style={{ marginLeft: '-8px' }}
          title={`${hiddenCount} more users`}
        >
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

interface OptimisticIndicatorProps {
  isPending: boolean;
  isFailed: boolean;
  onRetry?: () => void;
  className?: string;
}

export const OptimisticIndicator: React.FC<OptimisticIndicatorProps> = ({
  isPending,
  isFailed,
  onRetry,
  className = '',
}) => {
  if (!isPending && !isFailed) return null;

  return (
    <div className={`optimistic-indicator ${className}`} role="status">
      {isPending && (
        <span className="pending-indicator">
          <span className="spinner" aria-hidden="true" />
          Saving...
        </span>
      )}
      {isFailed && (
        <span className="failed-indicator">
          <span className="error-icon" aria-hidden="true">!</span>
          Failed to save
          {onRetry && (
            <button onClick={onRetry} className="retry-button">
              Retry
            </button>
          )}
        </span>
      )}
    </div>
  );
};

export {
  RealtimeConfig,
  RealtimeMessage,
  Subscription,
  OptimisticUpdate,
  ConnectionStatus,
  UserPresence,
  PresenceStatus,
};
