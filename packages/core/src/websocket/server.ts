/**
 * WebSocket Server Integration
 *
 * Production-ready WebSocket server that integrates with Express,
 * supporting real-time updates, presence, and collaboration.
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface WebSocketConfig {
  path?: string;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  maxPayloadSize?: number;
  maxConnections?: number;
  perUserMaxConnections?: number;
  authRequired?: boolean;
  authTimeout?: number;
}

export interface WebSocketClient {
  id: string;
  userId?: string;
  tenantId?: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  lastHeartbeat: number;
  metadata: Record<string, unknown>;
  authenticated: boolean;
}

export interface WebSocketMessage {
  type: string;
  channel?: string;
  payload?: unknown;
  metadata?: {
    timestamp: number;
    messageId: string;
    correlationId?: string;
  };
}

export interface BroadcastOptions {
  excludeClient?: string;
  onlyAuthenticated?: boolean;
  tenantId?: string;
  userId?: string;
  userIds?: string[];
}

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

export class PMSWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private config: Required<WebSocketConfig>;
  private messageHandlers: Map<string, (client: WebSocketClient, message: WebSocketMessage) => void> = new Map();

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = {
      path: config.path || '/ws',
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 60000,
      maxPayloadSize: config.maxPayloadSize || 1024 * 1024, // 1MB
      maxConnections: config.maxConnections || 10000,
      perUserMaxConnections: config.perUserMaxConnections || 5,
      authRequired: config.authRequired ?? true,
      authTimeout: config.authTimeout || 10000,
    };
  }

  /**
   * Attach WebSocket server to HTTP server
   */
  attach(server: HttpServer): void {
    this.wss = new WebSocketServer({
      server,
      path: this.config.path,
      maxPayload: this.config.maxPayloadSize,
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => this.emit('error', error));

    // Start heartbeat timer
    this.heartbeatTimer = setInterval(
      () => this.checkHeartbeats(),
      this.config.heartbeatInterval
    );

    this.emit('ready', { path: this.config.path });
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: WebSocket, request: { headers: Record<string, string | string[] | undefined>; url?: string }): void {
    // Check max connections
    if (this.clients.size >= this.config.maxConnections) {
      socket.close(1013, 'Server at capacity');
      return;
    }

    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      socket,
      subscriptions: new Set(),
      lastHeartbeat: Date.now(),
      metadata: {},
      authenticated: !this.config.authRequired,
    };

    this.clients.set(clientId, client);

    // Set up authentication timeout
    if (this.config.authRequired) {
      const authTimer = setTimeout(() => {
        if (!client.authenticated) {
          this.send(client, {
            type: 'error',
            payload: { code: 'AUTH_TIMEOUT', message: 'Authentication timeout' },
          });
          socket.close(4001, 'Authentication timeout');
        }
      }, this.config.authTimeout);

      client.metadata.authTimer = authTimer;
    }

    socket.on('message', (data) => this.handleMessage(client, data));
    socket.on('close', () => this.handleDisconnect(client));
    socket.on('error', (error) => this.handleError(client, error));
    socket.on('pong', () => {
      client.lastHeartbeat = Date.now();
    });

    // Send welcome message
    this.send(client, {
      type: 'connected',
      payload: {
        clientId,
        authRequired: this.config.authRequired,
      },
    });

    this.emit('connection', client);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(client: WebSocketClient, data: Buffer | ArrayBuffer | Buffer[]): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      if (!message.type) {
        this.send(client, {
          type: 'error',
          payload: { code: 'INVALID_MESSAGE', message: 'Message type required' },
        });
        return;
      }

      // Handle built-in message types
      switch (message.type) {
        case 'auth':
          this.handleAuth(client, message);
          break;
        case 'subscribe':
          this.handleSubscribe(client, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, message);
          break;
        case 'ping':
          client.lastHeartbeat = Date.now();
          this.send(client, { type: 'pong' });
          break;
        default:
          // Check for custom handler
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            if (this.config.authRequired && !client.authenticated) {
              this.send(client, {
                type: 'error',
                payload: { code: 'UNAUTHORIZED', message: 'Authentication required' },
              });
              return;
            }
            handler(client, message);
          } else {
            this.emit('message', client, message);
          }
      }
    } catch (error) {
      this.send(client, {
        type: 'error',
        payload: { code: 'PARSE_ERROR', message: 'Invalid JSON' },
      });
    }
  }

  /**
   * Handle authentication
   */
  private handleAuth(client: WebSocketClient, message: WebSocketMessage): void {
    const payload = message.payload as { token?: string; userId?: string; tenantId?: string };

    // Clear auth timeout
    if (client.metadata.authTimer) {
      clearTimeout(client.metadata.authTimer as NodeJS.Timeout);
      delete client.metadata.authTimer;
    }

    // Emit auth event for external validation
    this.emit('auth', client, payload, (success: boolean, userData?: { userId: string; tenantId: string }) => {
      if (success && userData) {
        client.authenticated = true;
        client.userId = userData.userId;
        client.tenantId = userData.tenantId;

        // Track user connections
        if (!this.userConnections.has(userData.userId)) {
          this.userConnections.set(userData.userId, new Set());
        }
        const userConns = this.userConnections.get(userData.userId)!;

        // Check per-user connection limit
        if (userConns.size >= this.config.perUserMaxConnections) {
          // Close oldest connection
          const oldestId = Array.from(userConns)[0];
          const oldestClient = this.clients.get(oldestId);
          if (oldestClient) {
            this.send(oldestClient, {
              type: 'disconnected',
              payload: { reason: 'New connection opened' },
            });
            oldestClient.socket.close(4002, 'Replaced by new connection');
          }
        }

        userConns.add(client.id);

        this.send(client, {
          type: 'authenticated',
          payload: { userId: userData.userId, tenantId: userData.tenantId },
        });

        this.emit('authenticated', client);
      } else {
        this.send(client, {
          type: 'auth_failed',
          payload: { message: 'Authentication failed' },
        });
        client.socket.close(4003, 'Authentication failed');
      }
    });
  }

  /**
   * Handle subscription
   */
  private handleSubscribe(client: WebSocketClient, message: WebSocketMessage): void {
    if (this.config.authRequired && !client.authenticated) {
      this.send(client, {
        type: 'error',
        payload: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const payload = message.payload as { channel?: string; channels?: string[] };
    const channels = payload.channels || (payload.channel ? [payload.channel] : []);

    for (const channel of channels) {
      // Validate channel access
      const canAccess = this.validateChannelAccess(client, channel);
      if (!canAccess) {
        this.send(client, {
          type: 'subscribe_error',
          payload: { channel, message: 'Access denied' },
        });
        continue;
      }

      client.subscriptions.add(channel);

      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }
      this.subscriptions.get(channel)!.add(client.id);

      this.send(client, {
        type: 'subscribed',
        payload: { channel },
      });
    }

    this.emit('subscribe', client, channels);
  }

  /**
   * Handle unsubscription
   */
  private handleUnsubscribe(client: WebSocketClient, message: WebSocketMessage): void {
    const payload = message.payload as { channel?: string; channels?: string[] };
    const channels = payload.channels || (payload.channel ? [payload.channel] : []);

    for (const channel of channels) {
      client.subscriptions.delete(channel);
      this.subscriptions.get(channel)?.delete(client.id);

      this.send(client, {
        type: 'unsubscribed',
        payload: { channel },
      });
    }

    this.emit('unsubscribe', client, channels);
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(client: WebSocketClient): void {
    // Clear auth timeout if pending
    if (client.metadata.authTimer) {
      clearTimeout(client.metadata.authTimer as NodeJS.Timeout);
    }

    // Remove from user connections
    if (client.userId) {
      this.userConnections.get(client.userId)?.delete(client.id);
      if (this.userConnections.get(client.userId)?.size === 0) {
        this.userConnections.delete(client.userId);
      }
    }

    // Remove from subscriptions
    for (const channel of client.subscriptions) {
      this.subscriptions.get(channel)?.delete(client.id);
    }

    this.clients.delete(client.id);
    this.emit('disconnect', client);
  }

  /**
   * Handle error
   */
  private handleError(client: WebSocketClient, error: Error): void {
    this.emit('client_error', client, error);
  }

  /**
   * Validate channel access
   */
  private validateChannelAccess(client: WebSocketClient, channel: string): boolean {
    // System channels are public
    if (channel.startsWith('system:')) {
      return true;
    }

    // Tenant-scoped channels
    if (channel.startsWith('tenant:')) {
      const tenantId = channel.split(':')[1];
      return client.tenantId === tenantId;
    }

    // User-specific channels
    if (channel.startsWith('user:')) {
      const userId = channel.split(':')[1];
      return client.userId === userId;
    }

    // Team channels (would need additional validation)
    if (channel.startsWith('team:')) {
      // Emit event for external validation
      return true; // Default allow, validate externally
    }

    // Default: allow authenticated users
    return client.authenticated;
  }

  /**
   * Check heartbeats and disconnect stale clients
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = this.config.connectionTimeout;

    for (const [id, client] of this.clients) {
      if (now - client.lastHeartbeat > timeout) {
        this.send(client, {
          type: 'disconnected',
          payload: { reason: 'Heartbeat timeout' },
        });
        client.socket.close(4004, 'Heartbeat timeout');
        this.handleDisconnect(client);
      } else {
        // Send ping
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
        }
      }
    }
  }

  /**
   * Send message to client
   */
  send(client: WebSocketClient, message: WebSocketMessage): boolean {
    if (client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const fullMessage = {
        ...message,
        metadata: {
          timestamp: Date.now(),
          messageId: this.generateMessageId(),
          ...message.metadata,
        },
      };

      client.socket.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      this.emit('send_error', client, error);
      return false;
    }
  }

  /**
   * Broadcast to channel
   */
  broadcast(channel: string, message: WebSocketMessage, options: BroadcastOptions = {}): number {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return 0;

    let sent = 0;
    for (const clientId of subscribers) {
      if (options.excludeClient && clientId === options.excludeClient) continue;

      const client = this.clients.get(clientId);
      if (!client) continue;

      if (options.onlyAuthenticated && !client.authenticated) continue;
      if (options.tenantId && client.tenantId !== options.tenantId) continue;
      if (options.userId && client.userId !== options.userId) continue;
      if (options.userIds && !options.userIds.includes(client.userId || '')) continue;

      if (this.send(client, { ...message, channel })) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Send to specific user (all their connections)
   */
  sendToUser(userId: string, message: WebSocketMessage): number {
    const connections = this.userConnections.get(userId);
    if (!connections) return 0;

    let sent = 0;
    for (const clientId of connections) {
      const client = this.clients.get(clientId);
      if (client && this.send(client, message)) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Send to all clients in a tenant
   */
  sendToTenant(tenantId: string, message: WebSocketMessage): number {
    let sent = 0;
    for (const client of this.clients.values()) {
      if (client.tenantId === tenantId && this.send(client, message)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Register custom message handler
   */
  onMessage(type: string, handler: (client: WebSocketClient, message: WebSocketMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Get server stats
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    uniqueUsers: number;
    channelSubscriptions: Record<string, number>;
  } {
    const channelSubscriptions: Record<string, number> = {};
    for (const [channel, subscribers] of this.subscriptions) {
      channelSubscriptions[channel] = subscribers.size;
    }

    return {
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      uniqueUsers: this.userConnections.size,
      channelSubscriptions,
    };
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients for a user
   */
  getUserClients(userId: string): WebSocketClient[] {
    const connections = this.userConnections.get(userId);
    if (!connections) return [];

    return Array.from(connections)
      .map(id => this.clients.get(id))
      .filter((c): c is WebSocketClient => !!c);
  }

  /**
   * Close server
   */
  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      this.send(client, {
        type: 'disconnected',
        payload: { reason: 'Server shutting down' },
      });
      client.socket.close(1001, 'Server shutting down');
    }

    this.clients.clear();
    this.subscriptions.clear();
    this.userConnections.clear();

    if (this.wss) {
      this.wss.close();
    }

    this.emit('close');
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// ============================================================================
// CHANNEL DEFINITIONS
// ============================================================================

export const CHANNELS = {
  // System-wide channels
  SYSTEM_ALERTS: 'system:alerts',
  SYSTEM_MAINTENANCE: 'system:maintenance',

  // Tenant-scoped channels
  tenantNotifications: (tenantId: string) => `tenant:${tenantId}:notifications`,
  tenantAnnouncements: (tenantId: string) => `tenant:${tenantId}:announcements`,

  // User-specific channels
  userNotifications: (userId: string) => `user:${userId}:notifications`,
  userFeedback: (userId: string) => `user:${userId}:feedback`,
  userGoals: (userId: string) => `user:${userId}:goals`,
  userReviews: (userId: string) => `user:${userId}:reviews`,

  // Team channels
  teamUpdates: (teamId: string) => `team:${teamId}:updates`,
  teamGoals: (teamId: string) => `team:${teamId}:goals`,

  // Calibration channels
  calibrationSession: (sessionId: string) => `calibration:${sessionId}`,
  calibrationDiscussion: (sessionId: string) => `calibration:${sessionId}:discussion`,

  // Presence channels
  presence: (tenantId: string) => `presence:${tenantId}`,

  // Analytics channels
  analytics: (tenantId: string) => `analytics:${tenantId}`,
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export { PMSWebSocketServer, CHANNELS };
