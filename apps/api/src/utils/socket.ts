import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

import { config } from '../config';
import { authService } from '../modules/auth/auth.service';
import { logger } from './logger';
import { isRedisAvailable } from './redis';

let io: Server | null = null;

interface SocketUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
}

/**
 * Initialize Socket.io server with JWT auth and optional Redis adapter.
 */
export function initSocketIO(httpServer: HttpServer): Server {
  const corsOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for multi-instance scaling
  if (isRedisAvailable()) {
    try {
      const pubClient = new Redis(config.REDIS_URL);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis adapter configured');
    } catch (err) {
      logger.warn('Socket.io Redis adapter failed, using in-memory', { error: err });
    }
  }

  // JWT authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const user = await authService.validateToken(token);
      (socket as any).user = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles: user.roles || [],
      } as SocketUser;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as SocketUser;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Auto-join rooms
    socket.join(`tenant:${user.tenantId}`);
    socket.join(`user:${user.userId}`);
    if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('SYSTEM_ADMIN')) {
      socket.join('admin');
    }

    logger.info('Socket connected', { userId: user.userId, socketId: socket.id });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { userId: user.userId, reason });
    });
  });

  logger.info('Socket.io server initialized');
  return io;
}

/**
 * Get the Socket.io server instance.
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Emit a data change event to all users in a tenant.
 */
export function emitToTenant(tenantId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, data);
}

/**
 * Emit an event to a specific user.
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to all admin users.
 */
export function emitToAdmins(event: string, data: any): void {
  if (!io) return;
  io.to('admin').emit(event, data);
}

/**
 * Emit an event to all connected clients.
 */
export function emitToAll(event: string, data: any): void {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Clean up Socket.io on shutdown.
 */
export async function closeSocketIO(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => resolve());
    });
    io = null;
    logger.info('Socket.io server closed');
  }
}
