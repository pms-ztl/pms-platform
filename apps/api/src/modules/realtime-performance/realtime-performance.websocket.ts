/**
 * Real-Time Performance WebSocket Handler
 *
 * Provides real-time streaming of performance data via WebSocket/SSE
 */

import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { realtimePerformanceService } from './realtime-performance.service';
import { Redis } from 'ioredis';

// ============================================================================
// Types
// ============================================================================

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  tenantId: string;
  subscriptions: Set<string>;
  lastPing: Date;
}

interface RealtimeMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: Date;
}

// ============================================================================
// WebSocket Server for Real-Time Performance
// ============================================================================

export class RealtimePerformanceWebSocket {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private redis: Redis;
  private redisSub: Redis;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/realtime-performance',
    });

    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.redisSub = this.redis.duplicate();

    this.setupWebSocketServer();
    this.setupServiceListeners();
    this.setupRedisSubscriptions();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();

      // Extract user info from query params or headers
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId') || '';
      const tenantId = url.searchParams.get('tenantId') || '';

      if (!userId || !tenantId) {
        ws.close(4001, 'Missing userId or tenantId');
        return;
      }

      const client: WebSocketClient = {
        ws,
        userId,
        tenantId,
        subscriptions: new Set(),
        lastPing: new Date(),
      };

      this.clients.set(clientId, client);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        channel: 'system',
        data: { clientId, message: 'Connected to Real-Time Performance stream' },
        timestamp: new Date(),
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });

      // Ping handling
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = new Date();
        }
      });
    });
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.channels);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.channels);
        break;

      case 'ping':
        client.lastPing = new Date();
        this.sendToClient(clientId, {
          type: 'pong',
          channel: 'system',
          data: { timestamp: new Date() },
          timestamp: new Date(),
        });
        break;

      case 'requestSnapshot':
        this.sendSnapshot(clientId, message.channel);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleSubscribe(clientId: string, channels: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    channels.forEach(channel => {
      client.subscriptions.add(channel);

      // Subscribe to Redis channel for this tenant/user
      const redisChannel = `realtime:${client.tenantId}:${channel}`;
      this.redisSub.subscribe(redisChannel);
    });

    this.sendToClient(clientId, {
      type: 'subscribed',
      channel: 'system',
      data: { channels },
      timestamp: new Date(),
    });
  }

  private handleUnsubscribe(clientId: string, channels: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel: 'system',
      data: { channels },
      timestamp: new Date(),
    });
  }

  private async sendSnapshot(clientId: string, channel: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    let data: any;

    switch (channel) {
      case 'hourlyMetrics':
        data = await realtimePerformanceService.getCurrentPerformanceSnapshot(
          client.tenantId,
          client.userId
        );
        break;

      case 'goalDashboard':
        data = await realtimePerformanceService.getGoalProgressDashboard(
          client.tenantId,
          client.userId
        );
        break;

      case 'deadlineAlerts':
        data = await realtimePerformanceService.getActiveDeadlineAlerts(
          client.tenantId,
          client.userId
        );
        break;

      case 'workload':
        data = await realtimePerformanceService.analyzeWorkload(
          client.tenantId,
          client.userId
        );
        break;

      default:
        data = null;
    }

    this.sendToClient(clientId, {
      type: 'snapshot',
      channel,
      data,
      timestamp: new Date(),
    });
  }

  private setupServiceListeners(): void {
    // Listen for events from the performance service
    realtimePerformanceService.on('hourlyMetricsUpdated', (event) => {
      this.broadcastToUser(event.userId, 'hourlyMetrics', event);
    });

    realtimePerformanceService.on('activityRecorded', (event) => {
      this.broadcastToUser(event.userId, 'activity', event);
    });

    realtimePerformanceService.on('deadlineAlerts', (event) => {
      this.broadcastToUser(event.userId, 'deadlineAlerts', event.alerts);
    });

    realtimePerformanceService.on('workloadAnalyzed', (event) => {
      this.broadcastToUser(event.userId, 'workload', event);
    });

    realtimePerformanceService.on('anomalyDetected', (event) => {
      this.broadcastToUser(event.userId, 'anomaly', event.anomaly);
    });

    realtimePerformanceService.on('moraleAlert', (event) => {
      this.broadcastToUser(event.userId, 'moraleAlert', event);
    });

    realtimePerformanceService.on('milestoneUpdated', (event) => {
      this.broadcastToChannel('milestones', event);
    });

    realtimePerformanceService.on('inactivityAlert', (event) => {
      this.broadcastToUser(event.userId, 'inactivityAlert', event);
    });
  }

  private setupRedisSubscriptions(): void {
    this.redisSub.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        const [, tenantId, channelName] = channel.split(':');

        // Broadcast to all clients subscribed to this channel in this tenant
        for (const [clientId, client] of this.clients) {
          if (client.tenantId === tenantId && client.subscriptions.has(channelName)) {
            this.sendToClient(clientId, {
              type: 'update',
              channel: channelName,
              data,
              timestamp: new Date(),
            });
          }
        }
      } catch (error) {
        console.error('Failed to process Redis message:', error);
      }
    });
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = new Date();

      for (const [clientId, client] of this.clients) {
        // Check if client is still alive
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();

        if (timeSinceLastPing > 60000) {
          // No ping for 60 seconds, disconnect
          client.ws.terminate();
          this.clients.delete(clientId);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private sendToClient(clientId: string, message: RealtimeMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToUser(userId: string, channel: string, data: any): void {
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.subscriptions.has(channel)) {
        this.sendToClient(clientId, {
          type: 'update',
          channel,
          data,
          timestamp: new Date(),
        });
      }
    }
  }

  private broadcastToChannel(channel: string, data: any): void {
    for (const [clientId, client] of this.clients) {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(clientId, {
          type: 'update',
          channel,
          data,
          timestamp: new Date(),
        });
      }
    }
  }

  private broadcastToTenant(tenantId: string, channel: string, data: any): void {
    for (const [clientId, client] of this.clients) {
      if (client.tenantId === tenantId && client.subscriptions.has(channel)) {
        this.sendToClient(clientId, {
          type: 'update',
          channel,
          data,
          timestamp: new Date(),
        });
      }
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Publish an update to Redis for distribution
   */
  async publishUpdate(tenantId: string, channel: string, data: any): Promise<void> {
    const redisChannel = `realtime:${tenantId}:${channel}`;
    await this.redis.publish(redisChannel, JSON.stringify(data));
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    connectionsByTenant: Record<string, number>;
    connectionsByChannel: Record<string, number>;
  } {
    const connectionsByTenant: Record<string, number> = {};
    const connectionsByChannel: Record<string, number> = {};

    for (const client of this.clients.values()) {
      connectionsByTenant[client.tenantId] = (connectionsByTenant[client.tenantId] || 0) + 1;

      for (const channel of client.subscriptions) {
        connectionsByChannel[channel] = (connectionsByChannel[channel] || 0) + 1;
      }
    }

    return {
      totalConnections: this.clients.size,
      connectionsByTenant,
      connectionsByChannel,
    };
  }
}

// Factory function to create WebSocket server
export function createRealtimePerformanceWebSocket(server: HttpServer): RealtimePerformanceWebSocket {
  return new RealtimePerformanceWebSocket(server);
}
