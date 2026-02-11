import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuthStore } from '../stores/authStore';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const RESOURCE_QUERY_MAP: Record<string, string[][]> = {
  tenants: [['tenants']],
  users: [['users']],
  'audit-logs': [['audit-logs']],
  'admin-config': [['system-config'], ['system-metrics']],
  goals: [['goals']],
  reviews: [['reviews']],
  feedback: [['feedback']],
  notifications: [['notifications']],
  billing: [['billing']],
  integrations: [['integrations']],
  security: [['security']],
};

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuthStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    if (!token || !isAuthenticated) return;

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const socketUrl = apiUrl.replace(/\/api\/admin\/?$/, '').replace(/\/api\/v1\/?$/, '') || window.location.origin;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));
    socket.io.on('reconnect_attempt', () => setStatus('connecting'));

    socket.on('data:changed', (payload: { resource: string; action: string }) => {
      const queryKeys = RESOURCE_QUERY_MAP[payload.resource];
      if (queryKeys) {
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      // Admin sees all changes - also invalidate system metrics
      queryClient.invalidateQueries({ queryKey: ['system-metrics'] });
    });

    socket.on('notification:new', (notification: { title: string; body: string }) => {
      toast(notification.title || 'New notification', { icon: '\u{1F514}', duration: 5000 });
    });

    socketRef.current = socket;
    setStatus('connecting');
  }, [token, isAuthenticated, queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      disconnect();
    }
    return () => { disconnect(); };
  }, [isAuthenticated, token, connect, disconnect]);

  return { status, socket: socketRef.current };
}
