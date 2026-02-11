import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/** Maps resource names from socket events to React Query keys to invalidate */
const RESOURCE_QUERY_MAP: Record<string, string[][]> = {
  goals: [['goals'], ['goal-tree'], ['goal-alignment']],
  reviews: [['reviews'], ['review-cycles'], ['my-reviews']],
  feedback: [['feedback'], ['recognition-wall'], ['top-recognized']],
  notifications: [['notifications']],
  users: [['users'], ['team'], ['org-chart']],
  calibration: [['calibration']],
  'one-on-ones': [['one-on-ones']],
  pip: [['pips'], ['pip']],
  development: [['development'], ['development-plans']],
  compensation: [['compensation']],
  promotions: [['promotions']],
  evidence: [['evidence']],
  succession: [['succession']],
  skills: [['skills'], ['skills-matrix']],
  compliance: [['compliance']],
  announcements: [['announcements']],
  calendar: [['calendar'], ['calendar-events']],
  'admin-config': [['admin-config'], ['configuration']],
  leaderboard: [['leaderboard']],
};

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    if (!accessToken || !isAuthenticated) {
      return;
    }

    // Derive socket URL: use dedicated env var, strip /api/v1 from API URL, or use same origin
    const socketUrl = import.meta.env.VITE_SOCKET_URL
      || import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, '')
      || window.location.origin;

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => {
      setStatus('connected');
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setStatus('disconnected');
    });

    socket.io.on('reconnect_attempt', () => {
      setStatus('connecting');
    });

    // Data change events - invalidate relevant React Query caches
    socket.on('data:changed', (payload: { resource: string; action: string }) => {
      const queryKeys = RESOURCE_QUERY_MAP[payload.resource];
      if (queryKeys) {
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    });

    // Real-time notification
    socket.on('notification:new', (notification: { title: string; body: string }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(notification.title || 'New notification', {
        icon: '\u{1F514}',
        duration: 5000,
      });
    });

    socketRef.current = socket;
    setStatus('connecting');
  }, [accessToken, isAuthenticated, queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, connect, disconnect]);

  return { status, socket: socketRef.current };
}
