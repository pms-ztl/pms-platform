/**
 * Real-time WebSocket Layer
 *
 * Provides real-time communication infrastructure for the PMS platform,
 * enabling live updates, notifications, collaborative features, and
 * instant feedback delivery.
 *
 * Key capabilities:
 * - Real-time notification delivery
 * - Live collaboration on reviews and feedback
 * - Instant performance updates
 * - Team activity feeds
 * - Live calibration sessions
 * - Goal progress streaming
 * - Presence awareness
 */

import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

export type EventType =
  | 'notification'
  | 'feedback_received'
  | 'review_update'
  | 'goal_progress'
  | 'recognition'
  | 'calibration'
  | 'performance_alert'
  | 'team_update'
  | 'presence'
  | 'collaboration'
  | 'system';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface WebSocketEvent {
  id: string;
  type: EventType;
  subtype?: string;
  payload: any;
  tenantId: string;
  targetUsers?: string[];
  targetTeams?: string[];
  targetDepartments?: string[];
  broadcast?: boolean;
  senderId?: string;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  persistent: boolean;
  expiresAt?: Date;
}

export interface UserPresence {
  userId: string;
  tenantId: string;
  status: PresenceStatus;
  lastActivity: Date;
  currentPage?: string;
  device: 'web' | 'mobile' | 'desktop';
  capabilities: string[];
}

export interface SubscriptionFilter {
  userId?: string;
  tenantId: string;
  eventTypes?: EventType[];
  teamIds?: string[];
  departmentIds?: string[];
  goalIds?: string[];
  reviewCycleIds?: string[];
}

export interface CollaborationSession {
  id: string;
  type: 'review' | 'feedback' | 'calibration' | 'goal_planning';
  entityId: string;
  tenantId: string;
  participants: CollaborationParticipant[];
  state: any;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'paused' | 'completed';
}

export interface CollaborationParticipant {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  cursor?: CursorPosition;
  selection?: TextSelection;
  lastActivity: Date;
}

export interface CursorPosition {
  field: string;
  position: number;
}

export interface TextSelection {
  field: string;
  start: number;
  end: number;
}

export interface CollaborationUpdate {
  sessionId: string;
  userId: string;
  updateType: 'content' | 'cursor' | 'selection' | 'state';
  field?: string;
  value?: any;
  timestamp: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    slack?: boolean;
  };
  eventPreferences: Record<EventType, {
    enabled: boolean;
    channels: string[];
    quietHours?: { start: string; end: string };
  }>;
  doNotDisturb: boolean;
  dndSchedule?: { start: string; end: string };
}

export interface LiveActivityFeed {
  userId: string;
  tenantId: string;
  activities: ActivityItem[];
  lastUpdated: Date;
  unreadCount: number;
}

export interface ActivityItem {
  id: string;
  type: EventType;
  title: string;
  description: string;
  actor?: { id: string; name: string; avatar?: string };
  target?: { type: string; id: string; name: string };
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface CalibrationLiveSession {
  id: string;
  calibrationSessionId: string;
  tenantId: string;
  facilitator: string;
  participants: CalibrationParticipant[];
  currentDiscussion?: DiscussionItem;
  ratingUpdates: RatingUpdate[];
  chat: ChatMessage[];
  status: 'waiting' | 'in_progress' | 'voting' | 'completed';
  startedAt?: Date;
  endedAt?: Date;
}

export interface CalibrationParticipant {
  userId: string;
  role: 'facilitator' | 'reviewer' | 'observer';
  status: PresenceStatus;
  hasVoted: boolean;
}

export interface DiscussionItem {
  revieweeId: string;
  revieweeName: string;
  proposedRating: number;
  discussionStartedAt: Date;
  speakerId?: string;
  timerSeconds: number;
}

export interface RatingUpdate {
  revieweeId: string;
  oldRating: number;
  newRating: number;
  reason: string;
  updatedBy: string;
  timestamp: Date;
  consensusReached: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'vote_result';
}

export interface GoalProgressStream {
  goalId: string;
  tenantId: string;
  currentProgress: number;
  targetProgress: number;
  updates: ProgressUpdate[];
  watchers: string[];
  lastUpdate: Date;
}

export interface ProgressUpdate {
  timestamp: Date;
  progress: number;
  delta: number;
  updatedBy: string;
  note?: string;
  source: 'manual' | 'integration' | 'calculated';
}

export interface ConnectionInfo {
  connectionId: string;
  userId: string;
  tenantId: string;
  connectedAt: Date;
  lastPing: Date;
  subscriptions: SubscriptionFilter[];
  device: string;
  userAgent: string;
}

// ============================================================================
// Real-time WebSocket Service
// ============================================================================

export class RealtimeWebSocketService extends EventEmitter {
  private redis: Redis;
  private redisSub: Redis;
  private connections: Map<string, ConnectionInfo>;
  private userConnections: Map<string, Set<string>>; // userId -> connectionIds
  private presenceCache: Map<string, UserPresence>;
  private collaborationSessions: Map<string, CollaborationSession>;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.redisSub = redis.duplicate();
    this.connections = new Map();
    this.userConnections = new Map();
    this.presenceCache = new Map();
    this.collaborationSessions = new Map();

    this.setupSubscriptions();
  }

  /**
   * Register a new connection
   */
  registerConnection(
    connectionId: string,
    userId: string,
    tenantId: string,
    device: string,
    userAgent: string
  ): ConnectionInfo {
    const connectionInfo: ConnectionInfo = {
      connectionId,
      userId,
      tenantId,
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: [],
      device,
      userAgent,
    };

    this.connections.set(connectionId, connectionInfo);

    // Track user connections
    const userConns = this.userConnections.get(userId) || new Set();
    userConns.add(connectionId);
    this.userConnections.set(userId, userConns);

    // Update presence
    this.updatePresence(userId, tenantId, 'online', device as any);

    // Emit connection event
    this.emit('connection', { userId, connectionId });

    return connectionInfo;
  }

  /**
   * Unregister a connection
   */
  async unregisterConnection(connectionId: string): Promise<void> {
    const connInfo = this.connections.get(connectionId);
    if (!connInfo) return;

    // Remove from connections
    this.connections.delete(connectionId);

    // Remove from user connections
    const userConns = this.userConnections.get(connInfo.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(connInfo.userId);
        // Update presence to offline
        await this.updatePresence(connInfo.userId, connInfo.tenantId, 'offline');
      }
    }

    // Remove from collaboration sessions
    await this.leaveAllCollaborationSessions(connInfo.userId);

    // Emit disconnection event
    this.emit('disconnection', { userId: connInfo.userId, connectionId });
  }

  /**
   * Subscribe to events
   */
  subscribe(connectionId: string, filter: SubscriptionFilter): void {
    const connInfo = this.connections.get(connectionId);
    if (!connInfo) return;

    connInfo.subscriptions.push(filter);
    this.connections.set(connectionId, connInfo);

    // Subscribe to Redis channels based on filter
    if (filter.eventTypes) {
      for (const eventType of filter.eventTypes) {
        this.redisSub.subscribe(`events:${filter.tenantId}:${eventType}`);
      }
    }

    if (filter.teamIds) {
      for (const teamId of filter.teamIds) {
        this.redisSub.subscribe(`events:team:${teamId}`);
      }
    }

    if (filter.goalIds) {
      for (const goalId of filter.goalIds) {
        this.redisSub.subscribe(`events:goal:${goalId}`);
      }
    }
  }

  /**
   * Publish an event
   */
  async publishEvent(event: Omit<WebSocketEvent, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: WebSocketEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Store persistent events
    if (fullEvent.persistent) {
      await this.redis.set(
        `event:${fullEvent.id}`,
        JSON.stringify(fullEvent),
        'EX',
        fullEvent.expiresAt
          ? Math.floor((fullEvent.expiresAt.getTime() - Date.now()) / 1000)
          : 7 * 24 * 60 * 60 // 7 days default
      );
    }

    // Publish to Redis
    if (fullEvent.broadcast) {
      await this.redis.publish(
        `events:${fullEvent.tenantId}:${fullEvent.type}`,
        JSON.stringify(fullEvent)
      );
    }

    if (fullEvent.targetUsers) {
      for (const userId of fullEvent.targetUsers) {
        await this.redis.publish(
          `events:user:${userId}`,
          JSON.stringify(fullEvent)
        );
      }
    }

    if (fullEvent.targetTeams) {
      for (const teamId of fullEvent.targetTeams) {
        await this.redis.publish(
          `events:team:${teamId}`,
          JSON.stringify(fullEvent)
        );
      }
    }

    // Store in activity feed for target users
    if (fullEvent.targetUsers && fullEvent.persistent) {
      for (const userId of fullEvent.targetUsers) {
        await this.addToActivityFeed(userId, fullEvent);
      }
    }

    return fullEvent.id;
  }

  /**
   * Send notification to users
   */
  async sendNotification(
    tenantId: string,
    targetUsers: string[],
    title: string,
    body: string,
    type: EventType,
    actionUrl?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.publishEvent({
      type: 'notification',
      subtype: type,
      payload: {
        title,
        body,
        actionUrl,
        metadata,
      },
      tenantId,
      targetUsers,
      priority: 'normal',
      persistent: true,
    });
  }

  /**
   * Update user presence
   */
  async updatePresence(
    userId: string,
    tenantId: string,
    status: PresenceStatus,
    device?: 'web' | 'mobile' | 'desktop',
    currentPage?: string
  ): Promise<void> {
    const presence: UserPresence = {
      userId,
      tenantId,
      status,
      lastActivity: new Date(),
      currentPage,
      device: device || 'web',
      capabilities: ['notifications', 'chat'],
    };

    this.presenceCache.set(userId, presence);

    // Store in Redis with expiration
    await this.redis.set(
      `presence:${userId}`,
      JSON.stringify(presence),
      'EX',
      5 * 60 // 5 minutes
    );

    // Broadcast presence update to subscribers
    await this.redis.publish(
      `presence:${tenantId}`,
      JSON.stringify(presence)
    );
  }

  /**
   * Get user presence
   */
  async getPresence(userId: string): Promise<UserPresence | null> {
    // Check cache first
    const cached = this.presenceCache.get(userId);
    if (cached) return cached;

    // Check Redis
    const stored = await this.redis.get(`presence:${userId}`);
    if (stored) {
      const presence = JSON.parse(stored);
      this.presenceCache.set(userId, presence);
      return presence;
    }

    return null;
  }

  /**
   * Get team presence
   */
  async getTeamPresence(teamMemberIds: string[]): Promise<UserPresence[]> {
    const presences: UserPresence[] = [];

    for (const userId of teamMemberIds) {
      const presence = await this.getPresence(userId);
      if (presence) {
        presences.push(presence);
      }
    }

    return presences;
  }

  /**
   * Create collaboration session
   */
  async createCollaborationSession(
    type: CollaborationSession['type'],
    entityId: string,
    tenantId: string,
    ownerId: string
  ): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entityId,
      tenantId,
      participants: [{
        userId: ownerId,
        role: 'owner',
        joinedAt: new Date(),
        lastActivity: new Date(),
      }],
      state: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    };

    this.collaborationSessions.set(session.id, session);

    await this.redis.set(
      `collaboration:${session.id}`,
      JSON.stringify(session),
      'EX',
      24 * 60 * 60 // 24 hours
    );

    return session;
  }

  /**
   * Join collaboration session
   */
  async joinCollaborationSession(
    sessionId: string,
    userId: string,
    role: 'editor' | 'viewer'
  ): Promise<CollaborationSession | null> {
    const session = this.collaborationSessions.get(sessionId) ||
      await this.getCollaborationSession(sessionId);

    if (!session) return null;

    // Check if already a participant
    const existing = session.participants.find(p => p.userId === userId);
    if (existing) {
      existing.lastActivity = new Date();
    } else {
      session.participants.push({
        userId,
        role,
        joinedAt: new Date(),
        lastActivity: new Date(),
      });
    }

    session.updatedAt = new Date();
    this.collaborationSessions.set(sessionId, session);

    await this.redis.set(
      `collaboration:${session.id}`,
      JSON.stringify(session),
      'EX',
      24 * 60 * 60
    );

    // Broadcast participant joined
    await this.publishEvent({
      type: 'collaboration',
      subtype: 'participant_joined',
      payload: {
        sessionId,
        userId,
        role,
      },
      tenantId: session.tenantId,
      targetUsers: session.participants.map(p => p.userId),
      priority: 'normal',
      persistent: false,
    });

    return session;
  }

  /**
   * Send collaboration update
   */
  async sendCollaborationUpdate(update: CollaborationUpdate): Promise<void> {
    const session = this.collaborationSessions.get(update.sessionId);
    if (!session) return;

    // Update participant activity
    const participant = session.participants.find(p => p.userId === update.userId);
    if (participant) {
      participant.lastActivity = new Date();
      if (update.updateType === 'cursor') {
        participant.cursor = update.value;
      } else if (update.updateType === 'selection') {
        participant.selection = update.value;
      }
    }

    // Update session state if content update
    if (update.updateType === 'content' && update.field) {
      session.state[update.field] = update.value;
    }

    session.updatedAt = new Date();
    this.collaborationSessions.set(update.sessionId, session);

    // Broadcast to other participants
    const otherParticipants = session.participants
      .filter(p => p.userId !== update.userId)
      .map(p => p.userId);

    await this.publishEvent({
      type: 'collaboration',
      subtype: update.updateType,
      payload: update,
      tenantId: session.tenantId,
      targetUsers: otherParticipants,
      priority: update.updateType === 'content' ? 'high' : 'low',
      persistent: false,
    });
  }

  /**
   * Start calibration live session
   */
  async startCalibrationSession(
    calibrationSessionId: string,
    tenantId: string,
    facilitatorId: string,
    participantIds: string[]
  ): Promise<CalibrationLiveSession> {
    const session: CalibrationLiveSession = {
      id: `cal_live_${Date.now()}`,
      calibrationSessionId,
      tenantId,
      facilitator: facilitatorId,
      participants: [
        { userId: facilitatorId, role: 'facilitator', status: 'online', hasVoted: false },
        ...participantIds.map(id => ({
          userId: id,
          role: 'reviewer' as const,
          status: 'online' as const,
          hasVoted: false,
        })),
      ],
      ratingUpdates: [],
      chat: [],
      status: 'waiting',
    };

    await this.redis.set(
      `calibration_live:${session.id}`,
      JSON.stringify(session),
      'EX',
      8 * 60 * 60 // 8 hours
    );

    // Notify all participants
    await this.publishEvent({
      type: 'calibration',
      subtype: 'session_started',
      payload: {
        sessionId: session.id,
        calibrationSessionId,
      },
      tenantId,
      targetUsers: [facilitatorId, ...participantIds],
      priority: 'high',
      persistent: true,
    });

    return session;
  }

  /**
   * Update calibration discussion
   */
  async updateCalibrationDiscussion(
    sessionId: string,
    discussion: DiscussionItem
  ): Promise<void> {
    const cached = await this.redis.get(`calibration_live:${sessionId}`);
    if (!cached) return;

    const session: CalibrationLiveSession = JSON.parse(cached);
    session.currentDiscussion = discussion;
    session.status = 'in_progress';

    await this.redis.set(
      `calibration_live:${sessionId}`,
      JSON.stringify(session),
      'EX',
      8 * 60 * 60
    );

    // Broadcast to participants
    await this.publishEvent({
      type: 'calibration',
      subtype: 'discussion_update',
      payload: { sessionId, discussion },
      tenantId: session.tenantId,
      targetUsers: session.participants.map(p => p.userId),
      priority: 'high',
      persistent: false,
    });
  }

  /**
   * Submit calibration vote
   */
  async submitCalibrationVote(
    sessionId: string,
    userId: string,
    revieweeId: string,
    vote: number
  ): Promise<void> {
    const cached = await this.redis.get(`calibration_live:${sessionId}`);
    if (!cached) return;

    const session: CalibrationLiveSession = JSON.parse(cached);

    // Mark user as voted
    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.hasVoted = true;
    }

    await this.redis.set(
      `calibration_live:${sessionId}`,
      JSON.stringify(session),
      'EX',
      8 * 60 * 60
    );

    // Check if all have voted
    const allVoted = session.participants.every(p => p.hasVoted);
    if (allVoted) {
      await this.publishEvent({
        type: 'calibration',
        subtype: 'voting_complete',
        payload: { sessionId, revieweeId },
        tenantId: session.tenantId,
        targetUsers: session.participants.map(p => p.userId),
        priority: 'high',
        persistent: false,
      });
    }
  }

  /**
   * Stream goal progress
   */
  async streamGoalProgress(
    goalId: string,
    tenantId: string,
    progress: number,
    delta: number,
    updatedBy: string,
    note?: string
  ): Promise<void> {
    const key = `goal_stream:${goalId}`;
    const cached = await this.redis.get(key);

    let stream: GoalProgressStream;
    if (cached) {
      stream = JSON.parse(cached);
    } else {
      stream = {
        goalId,
        tenantId,
        currentProgress: 0,
        targetProgress: 100,
        updates: [],
        watchers: [],
        lastUpdate: new Date(),
      };
    }

    const update: ProgressUpdate = {
      timestamp: new Date(),
      progress,
      delta,
      updatedBy,
      note,
      source: 'manual',
    };

    stream.updates.push(update);
    stream.currentProgress = progress;
    stream.lastUpdate = new Date();

    // Keep only last 100 updates
    if (stream.updates.length > 100) {
      stream.updates = stream.updates.slice(-100);
    }

    await this.redis.set(key, JSON.stringify(stream), 'EX', 30 * 24 * 60 * 60);

    // Broadcast to watchers
    await this.redis.publish(
      `events:goal:${goalId}`,
      JSON.stringify({
        type: 'goal_progress',
        goalId,
        progress,
        delta,
        note,
        timestamp: new Date(),
      })
    );
  }

  /**
   * Get activity feed for user
   */
  async getActivityFeed(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LiveActivityFeed> {
    const key = `activity_feed:${userId}`;
    const items = await this.redis.lrange(key, offset, offset + limit - 1);
    const activities: ActivityItem[] = items.map(item => JSON.parse(item));

    const unreadKey = `activity_unread:${userId}`;
    const unreadCount = parseInt(await this.redis.get(unreadKey) || '0');

    return {
      userId,
      tenantId: '', // Would be set from user context
      activities,
      lastUpdated: activities.length > 0 ? activities[0].timestamp : new Date(),
      unreadCount,
    };
  }

  /**
   * Mark activity as read
   */
  async markActivityRead(userId: string, activityId?: string): Promise<void> {
    const unreadKey = `activity_unread:${userId}`;

    if (activityId) {
      await this.redis.decr(unreadKey);
    } else {
      // Mark all as read
      await this.redis.set(unreadKey, '0');
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const key = `notification_prefs:${userId}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Return defaults
    return {
      userId,
      channels: {
        inApp: true,
        push: true,
        email: true,
      },
      eventPreferences: {
        notification: { enabled: true, channels: ['inApp', 'push'] },
        feedback_received: { enabled: true, channels: ['inApp', 'push', 'email'] },
        review_update: { enabled: true, channels: ['inApp', 'push', 'email'] },
        goal_progress: { enabled: true, channels: ['inApp'] },
        recognition: { enabled: true, channels: ['inApp', 'push'] },
        calibration: { enabled: true, channels: ['inApp', 'push', 'email'] },
        performance_alert: { enabled: true, channels: ['inApp', 'push', 'email'] },
        team_update: { enabled: true, channels: ['inApp'] },
        presence: { enabled: false, channels: [] },
        collaboration: { enabled: true, channels: ['inApp'] },
        system: { enabled: true, channels: ['inApp', 'email'] },
      },
      doNotDisturb: false,
    };
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const current = await this.getNotificationPreferences(userId);
    const updated = { ...current, ...preferences };

    await this.redis.set(
      `notification_prefs:${userId}`,
      JSON.stringify(updated),
      'EX',
      365 * 24 * 60 * 60
    );
  }

  /**
   * Send heartbeat/ping
   */
  async heartbeat(connectionId: string): Promise<void> {
    const connInfo = this.connections.get(connectionId);
    if (connInfo) {
      connInfo.lastPing = new Date();
      this.connections.set(connectionId, connInfo);

      // Refresh presence
      const presence = this.presenceCache.get(connInfo.userId);
      if (presence) {
        presence.lastActivity = new Date();
        this.presenceCache.set(connInfo.userId, presence);
      }
    }
  }

  /**
   * Get connection stats
   */
  getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    connectionsByDevice: Record<string, number>;
    averageSubscriptions: number;
  } {
    const connectionsByDevice: Record<string, number> = {};
    let totalSubscriptions = 0;

    for (const conn of this.connections.values()) {
      connectionsByDevice[conn.device] = (connectionsByDevice[conn.device] || 0) + 1;
      totalSubscriptions += conn.subscriptions.length;
    }

    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      connectionsByDevice,
      averageSubscriptions: this.connections.size > 0
        ? totalSubscriptions / this.connections.size
        : 0,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private setupSubscriptions(): void {
    this.redisSub.on('message', (channel: string, message: string) => {
      const event = JSON.parse(message);
      this.handleIncomingEvent(channel, event);
    });
  }

  private handleIncomingEvent(channel: string, event: WebSocketEvent): void {
    // Route event to appropriate connections
    for (const [connId, connInfo] of this.connections) {
      if (this.shouldReceiveEvent(connInfo, event, channel)) {
        this.emit('event', { connectionId: connId, event });
      }
    }
  }

  private shouldReceiveEvent(
    connInfo: ConnectionInfo,
    event: WebSocketEvent,
    channel: string
  ): boolean {
    // Check if tenant matches
    if (connInfo.tenantId !== event.tenantId) return false;

    // Check if user is targeted
    if (event.targetUsers && !event.targetUsers.includes(connInfo.userId)) {
      return false;
    }

    // Check subscription filters
    for (const filter of connInfo.subscriptions) {
      if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
        continue;
      }

      if (filter.userId && filter.userId !== connInfo.userId) {
        continue;
      }

      return true;
    }

    // Check if broadcast
    if (event.broadcast) return true;

    return false;
  }

  private async addToActivityFeed(userId: string, event: WebSocketEvent): Promise<void> {
    const activity: ActivityItem = {
      id: event.id,
      type: event.type,
      title: event.payload.title || this.getDefaultTitle(event.type),
      description: event.payload.body || event.payload.description || '',
      timestamp: event.timestamp,
      read: false,
      actionUrl: event.payload.actionUrl,
      metadata: event.payload.metadata,
    };

    const key = `activity_feed:${userId}`;

    // Add to front of list
    await this.redis.lpush(key, JSON.stringify(activity));

    // Trim to keep only last 200 items
    await this.redis.ltrim(key, 0, 199);

    // Increment unread count
    await this.redis.incr(`activity_unread:${userId}`);
  }

  private getDefaultTitle(type: EventType): string {
    const titles: Record<EventType, string> = {
      notification: 'Notification',
      feedback_received: 'New Feedback',
      review_update: 'Review Update',
      goal_progress: 'Goal Progress',
      recognition: 'Recognition',
      calibration: 'Calibration Update',
      performance_alert: 'Performance Alert',
      team_update: 'Team Update',
      presence: 'Presence Update',
      collaboration: 'Collaboration',
      system: 'System Message',
    };
    return titles[type] || 'Update';
  }

  private async getCollaborationSession(sessionId: string): Promise<CollaborationSession | null> {
    const cached = await this.redis.get(`collaboration:${sessionId}`);
    if (cached) {
      const session = JSON.parse(cached);
      this.collaborationSessions.set(sessionId, session);
      return session;
    }
    return null;
  }

  private async leaveAllCollaborationSessions(userId: string): Promise<void> {
    for (const [sessionId, session] of this.collaborationSessions) {
      const participantIndex = session.participants.findIndex(p => p.userId === userId);
      if (participantIndex !== -1) {
        session.participants.splice(participantIndex, 1);

        if (session.participants.length === 0) {
          this.collaborationSessions.delete(sessionId);
          await this.redis.del(`collaboration:${sessionId}`);
        } else {
          this.collaborationSessions.set(sessionId, session);
          await this.redis.set(
            `collaboration:${sessionId}`,
            JSON.stringify(session),
            'EX',
            24 * 60 * 60
          );

          // Notify remaining participants
          await this.publishEvent({
            type: 'collaboration',
            subtype: 'participant_left',
            payload: { sessionId, userId },
            tenantId: session.tenantId,
            targetUsers: session.participants.map(p => p.userId),
            priority: 'normal',
            persistent: false,
          });
        }
      }
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const realtimeWebSocketService = new RealtimeWebSocketService(
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
