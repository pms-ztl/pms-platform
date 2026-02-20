import type { Server, Socket } from 'socket.io';
import { chatService } from './chat.service';
import { logger } from '../../utils/logger';

interface SocketUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
}

// Track online users: Map<tenantId, Set<userId>>
const onlineUsers = new Map<string, Set<string>>();

function getUser(socket: Socket): SocketUser {
  return (socket as any).user as SocketUser;
}

export function initChatSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const user = getUser(socket);
    if (!user) return;

    // Track presence
    if (!onlineUsers.has(user.tenantId)) {
      onlineUsers.set(user.tenantId, new Set());
    }
    onlineUsers.get(user.tenantId)!.add(user.userId);

    // Broadcast presence to tenant
    io.to(`tenant:${user.tenantId}`).emit('chat:presence', {
      userId: user.userId,
      status: 'online',
    });

    // ── Join conversation rooms ──
    socket.on('chat:join', async (conversationId: string) => {
      try {
        socket.join(`chat:${conversationId}`);
        // Auto-mark as read when joining
        await chatService.markRead(user.userId, conversationId);
      } catch (err) {
        logger.warn('chat:join failed', { userId: user.userId, conversationId, error: err });
      }
    });

    socket.on('chat:leave', (conversationId: string) => {
      socket.leave(`chat:${conversationId}`);
    });

    // ── Send message via socket ──
    socket.on('chat:send', async (data: { conversationId: string; content: string; replyToId?: string }) => {
      try {
        const message = await chatService.sendMessage(user.userId, data.conversationId, { content: data.content, replyToId: data.replyToId });
        // Broadcast to all participants in that conversation room
        io.to(`chat:${data.conversationId}`).emit('chat:message', message);

        // Also notify participants who are NOT currently in the room
        const convo = await chatService.getConversation(data.conversationId);
        if (convo) {
          for (const p of convo.participants) {
            if (p.userId !== user.userId) {
              io.to(`user:${p.userId}`).emit('chat:notification', {
                conversationId: data.conversationId,
                message,
              });
            }
          }
        }
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to send message' });
        logger.warn('chat:send failed', { userId: user.userId, error: err });
      }
    });

    // ── Typing indicator ──
    socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`chat:${data.conversationId}`).emit('chat:typing', {
        userId: user.userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // ── Mark read ──
    socket.on('chat:read', async (conversationId: string) => {
      try {
        await chatService.markRead(user.userId, conversationId);
      } catch (err) {
        logger.warn('chat:read failed', { userId: user.userId, conversationId, error: err });
      }
    });

    // ── Get online users for tenant ──
    socket.on('chat:get-online', () => {
      const tenantOnline = onlineUsers.get(user.tenantId);
      socket.emit('chat:online-users', tenantOnline ? Array.from(tenantOnline) : []);
    });

    // ── Edit message via socket ──
    socket.on('chat:edit', async (data: { messageId: string; conversationId: string; content: string }) => {
      try {
        const updated = await chatService.editMessage(user.userId, data.messageId, { content: data.content });
        io.to(`chat:${data.conversationId}`).emit('chat:message-updated', updated);
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to edit message' });
        logger.warn('chat:edit failed', { userId: user.userId, error: err });
      }
    });

    // ── Delete message via socket ──
    socket.on('chat:delete', async (data: { messageId: string; conversationId: string }) => {
      try {
        const deleted = await chatService.deleteMessage(user.userId, data.messageId);
        io.to(`chat:${data.conversationId}`).emit('chat:message-deleted', deleted);
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to delete message' });
        logger.warn('chat:delete failed', { userId: user.userId, error: err });
      }
    });

    // ── Toggle reaction via socket ──
    socket.on('chat:reaction', async (data: { messageId: string; conversationId: string; emoji: string }) => {
      try {
        const result = await chatService.toggleReaction(user.userId, data.messageId, data.emoji);
        io.to(`chat:${data.conversationId}`).emit('chat:reaction', {
          messageId: data.messageId,
          reactions: (result.message as any).reactions,
          action: result.action,
          emoji: result.emoji,
          userId: result.userId,
        });
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to toggle reaction' });
        logger.warn('chat:reaction failed', { userId: user.userId, error: err });
      }
    });

    // ── Leave conversation via socket ──
    socket.on('chat:leave-conversation', async (conversationId: string) => {
      try {
        await chatService.leaveConversation(user.userId, conversationId);
        socket.leave(`chat:${conversationId}`);
        io.to(`chat:${conversationId}`).emit('chat:participant-left', {
          conversationId,
          userId: user.userId,
        });
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to leave conversation' });
        logger.warn('chat:leave-conversation failed', { userId: user.userId, error: err });
      }
    });

    // ── Pin / Unpin message via socket ──
    socket.on('chat:pin', async (data: { messageId: string; conversationId: string }) => {
      try {
        const updated = await chatService.togglePinMessage(user.userId, data.messageId);
        io.to(`chat:${data.conversationId}`).emit('chat:message-pinned', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          isPinned: updated.isPinned,
          pinnedBy: updated.pinnedBy,
          pinnedAt: updated.pinnedAt,
        });
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to pin message' });
        logger.warn('chat:pin failed', { userId: user.userId, error: err });
      }
    });

    // ── Forward message via socket ──
    socket.on('chat:forward', async (data: { messageId: string; targetConversationId: string }) => {
      try {
        const forwarded = await chatService.forwardMessage(user.userId, data.messageId, data.targetConversationId);
        io.to(`chat:${data.targetConversationId}`).emit('chat:message', forwarded);

        // Notify participants of the target conversation
        const convo = await chatService.getConversation(data.targetConversationId);
        if (convo) {
          for (const p of convo.participants) {
            if (p.userId !== user.userId) {
              io.to(`user:${p.userId}`).emit('chat:notification', {
                conversationId: data.targetConversationId,
                message: forwarded,
              });
            }
          }
        }
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to forward message' });
        logger.warn('chat:forward failed', { userId: user.userId, error: err });
      }
    });

    // ── Rename conversation via socket ──
    socket.on('chat:rename', async (data: { conversationId: string; name: string }) => {
      try {
        await chatService.renameConversation(user.userId, data.conversationId, data.name);
        io.to(`chat:${data.conversationId}`).emit('chat:conversation-renamed', {
          conversationId: data.conversationId,
          name: data.name,
        });
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to rename conversation' });
        logger.warn('chat:rename failed', { userId: user.userId, error: err });
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      const tenantSet = onlineUsers.get(user.tenantId);
      if (tenantSet) {
        tenantSet.delete(user.userId);
        if (tenantSet.size === 0) onlineUsers.delete(user.tenantId);
      }
      io.to(`tenant:${user.tenantId}`).emit('chat:presence', {
        userId: user.userId,
        status: 'offline',
      });
    });
  });

  logger.info('Chat socket handlers initialized');
}
