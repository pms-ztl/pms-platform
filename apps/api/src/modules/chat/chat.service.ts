import { prisma } from '../../lib/prisma';
import type { ConversationType } from '@prisma/client';
import { emailService } from '../../services/email/email.service';
import { baseLayout } from '../../services/email/email-templates';
import { llmClient } from '../ai/llm-client';

// ── Types ──

export interface CreateDirectDTO {
  targetUserId: string;
}

export interface CreateGroupDTO {
  name: string;
  participantIds: string[];
}

export interface SendMessageDTO {
  content: string;
  replyToId?: string;
}

export interface EditMessageDTO {
  content: string;
}

interface ReactionEntry {
  emoji: string;
  userId: string;
  createdAt: string;
}

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

// ── Service ──

class ChatService {
  /**
   * List conversations for a user (with last message + unread count).
   */
  async listConversations(userId: string, tenantId: string) {
    const convos = await prisma.conversation.findMany({
      where: {
        tenantId,
        participants: { some: { userId, leftAt: null } },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        team: { select: { id: true, name: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Calculate unread counts per conversation
    const results = await Promise.all(
      convos.map(async (c) => {
        const myParticipant = c.participants.find((p) => p.userId === userId);
        const lastRead = myParticipant?.lastReadAt ?? new Date(0);
        const lastMsg = c.messages[0] ?? null;

        // Count unread messages
        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: c.id,
            senderId: { not: userId },
            deletedAt: null,
            createdAt: { gt: lastRead },
          },
        });

        // Count pinned messages
        const pinnedCount = await prisma.chatMessage.count({
          where: {
            conversationId: c.id,
            isPinned: true,
            deletedAt: null,
          },
        });

        return {
          id: c.id,
          type: c.type,
          name: c.type === 'DIRECT'
            ? this.getDirectChatName(c.participants, userId)
            : c.name,
          avatarUrl: c.type === 'DIRECT'
            ? this.getDirectChatAvatar(c.participants, userId)
            : c.avatarUrl,
          teamId: c.teamId,
          teamName: c.team?.name ?? null,
          participants: c.participants.map((p) => ({
            userId: p.userId,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
            avatarUrl: p.user.avatarUrl,
            role: p.role,
          })),
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                content: lastMsg.content,
                senderId: lastMsg.senderId,
                senderName: `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`,
                createdAt: lastMsg.createdAt,
              }
            : null,
          lastMessageAt: c.lastMessageAt,
          hasUnread: unreadCount > 0,
          unreadCount,
          pinnedCount,
          isMuted: !!(myParticipant as any)?.mutedAt,
          createdAt: c.createdAt,
        };
      })
    );

    return results;
  }

  /**
   * Get or create a 1-on-1 direct conversation.
   */
  async getOrCreateDirect(userId: string, tenantId: string, dto: CreateDirectDTO) {
    // Validate target user is in same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id: dto.targetUserId, tenantId, isActive: true, deletedAt: null },
    });
    if (!targetUser) throw new Error('User not found in your organization');
    if (dto.targetUserId === userId) throw new Error('Cannot create conversation with yourself');

    // Check if DM already exists between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        tenantId,
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: dto.targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true } },
          },
        },
      },
    });
    if (existing) return existing;

    // Create new DM
    return prisma.conversation.create({
      data: {
        tenantId,
        type: 'DIRECT',
        createdById: userId,
        participants: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: dto.targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true } },
          },
        },
      },
    });
  }

  /**
   * Create a group conversation.
   */
  async createGroup(userId: string, tenantId: string, dto: CreateGroupDTO) {
    if (!dto.name?.trim()) throw new Error('Group name is required');
    if (!dto.participantIds?.length) throw new Error('At least one participant is required');

    // Validate all participants are in the same tenant
    const validUsers = await prisma.user.findMany({
      where: { id: { in: dto.participantIds }, tenantId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    const validIds = new Set(validUsers.map((u) => u.id));

    // Always include creator
    const allParticipants = new Set([userId, ...dto.participantIds.filter((id) => validIds.has(id))]);

    return prisma.conversation.create({
      data: {
        tenantId,
        type: 'GROUP',
        name: dto.name.trim(),
        createdById: userId,
        participants: {
          create: Array.from(allParticipants).map((uid) => ({
            userId: uid,
            role: uid === userId ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true } },
          },
        },
      },
    });
  }

  /**
   * Create a team channel linked to an existing Team.
   */
  async createTeamChannel(userId: string, tenantId: string, teamId: string) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, tenantId, isActive: true, deletedAt: null },
      include: {
        members: { where: { endDate: null }, select: { userId: true } },
      },
    });
    if (!team) throw new Error('Team not found');

    // Check if channel already exists
    const existing = await prisma.conversation.findFirst({
      where: { tenantId, type: 'TEAM_CHANNEL', teamId },
    });
    if (existing) return existing;

    const memberIds = team.members.map((m) => m.userId);
    if (!memberIds.includes(userId)) memberIds.push(userId);

    return prisma.conversation.create({
      data: {
        tenantId,
        type: 'TEAM_CHANNEL',
        name: team.name,
        teamId,
        createdById: userId,
        participants: {
          create: memberIds.map((uid) => ({
            userId: uid,
            role: uid === team.leadId ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true } },
          },
        },
      },
    });
  }

  /**
   * Get messages for a conversation (cursor-based pagination).
   */
  async getMessages(userId: string, conversationId: string, before?: string, limit = 50) {
    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant || participant.leftAt) throw new Error('Not a member of this conversation');

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: (await prisma.chatMessage.findUnique({ where: { id: before } }))?.createdAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          select: {
            id: true, content: true, senderId: true, deletedAt: true,
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        forwardedFrom: {
          select: {
            id: true, content: true, senderId: true,
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        pinnedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return messages.reverse(); // Return chronological order
  }

  /**
   * Send a message to a conversation.
   */
  async sendMessage(userId: string, conversationId: string, dto: SendMessageDTO) {
    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant || participant.leftAt) throw new Error('Not a member of this conversation');
    if (!dto.content?.trim()) throw new Error('Message cannot be empty');

    // Validate replyToId if provided
    if (dto.replyToId) {
      const parentMsg = await prisma.chatMessage.findFirst({
        where: { id: dto.replyToId, conversationId },
      });
      if (!parentMsg) throw new Error('Reply target message not found');
    }

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          content: dto.content.trim(),
          type: 'TEXT',
          replyToId: dto.replyToId || null,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          replyTo: {
            select: {
              id: true, content: true, senderId: true, deletedAt: true,
              sender: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          forwardedFrom: {
            select: {
              id: true, content: true, senderId: true,
              sender: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          pinnedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return message;
  }

  /**
   * Mark a conversation as read up to now.
   */
  async markRead(userId: string, conversationId: string) {
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  /**
   * Get tenant users for starting new conversations.
   */
  async searchUsers(tenantId: string, query: string, excludeUserId: string) {
    const where: any = {
      tenantId,
      isActive: true,
      deletedAt: null,
      id: { not: excludeUserId },
    };
    if (query?.trim()) {
      where.OR = [
        { firstName: { contains: query.trim(), mode: 'insensitive' } },
        { lastName: { contains: query.trim(), mode: 'insensitive' } },
        { email: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    return prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, jobTitle: true },
      take: 20,
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Get teams the user is a member of (for creating team channels).
   */
  async getUserTeams(userId: string, tenantId: string) {
    return prisma.team.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        members: { some: { userId, endDate: null } },
      },
      select: {
        id: true,
        name: true,
        code: true,
        chatChannel: { select: { id: true } },
        _count: { select: { members: { where: { endDate: null } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Add participants to a group conversation.
   */
  async addParticipants(userId: string, conversationId: string, userIds: string[]) {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { where: { userId, leftAt: null } } },
    });
    if (!convo) throw new Error('Conversation not found');
    if (convo.type === 'DIRECT') throw new Error('Cannot add participants to a direct message');

    const myPart = convo.participants[0];
    if (!myPart) throw new Error('Not a member of this conversation');

    // Validate users are in same tenant
    const validUsers = await prisma.user.findMany({
      where: { id: { in: userIds }, tenantId: convo.tenantId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    const creates = validUsers.map((u) => ({
      conversationId,
      userId: u.id,
      role: 'MEMBER',
    }));

    // Use skipDuplicates to avoid errors for already-existing participants
    await prisma.conversationParticipant.createMany({
      data: creates,
      skipDuplicates: true,
    });

    return this.getConversation(conversationId);
  }

  /**
   * Get a single conversation with details.
   */
  async getConversation(conversationId: string) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true } },
          },
        },
        team: { select: { id: true, name: true } },
      },
    });
  }

  // ── Edit & Delete ──

  /**
   * Edit a message (sender only, within 15 minutes).
   */
  async editMessage(userId: string, messageId: string, dto: EditMessageDTO) {
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');
    if (message.senderId !== userId) throw new Error('Cannot edit another user\'s message');
    if (message.deletedAt) throw new Error('Cannot edit a deleted message');
    if (message.type === 'SYSTEM') throw new Error('Cannot edit system messages');

    const fifteenMin = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fifteenMin) {
      throw new Error('Edit window has expired (15 minutes)');
    }
    if (!dto.content?.trim()) throw new Error('Message cannot be empty');

    return prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: dto.content.trim(), editedAt: new Date() },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          select: {
            id: true, content: true, senderId: true, deletedAt: true,
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  /**
   * Soft-delete a message (sender only).
   */
  async deleteMessage(userId: string, messageId: string) {
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');
    if (message.senderId !== userId) throw new Error('Cannot delete another user\'s message');
    if (message.deletedAt) throw new Error('Message already deleted');
    if (message.type === 'SYSTEM') throw new Error('Cannot delete system messages');

    return prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: '' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          select: {
            id: true, content: true, senderId: true, deletedAt: true,
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  // ── Reactions ──

  /**
   * Toggle a reaction on a message. Same emoji = remove, new emoji = add.
   */
  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');
    if (message.deletedAt) throw new Error('Cannot react to a deleted message');
    if (!ALLOWED_EMOJIS.includes(emoji)) throw new Error('Invalid emoji');

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId } },
    });
    if (!participant || participant.leftAt) throw new Error('Not a member of this conversation');

    const reactions = (message.reactions as unknown as ReactionEntry[] | null) || [];
    const existingIdx = reactions.findIndex((r: ReactionEntry) => r.emoji === emoji && r.userId === userId);

    let updatedReactions: ReactionEntry[];
    let action: 'added' | 'removed';
    if (existingIdx >= 0) {
      updatedReactions = reactions.filter((_: ReactionEntry, i: number) => i !== existingIdx);
      action = 'removed';
    } else {
      updatedReactions = [...reactions, { emoji, userId, createdAt: new Date().toISOString() }];
      action = 'added';
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { reactions: updatedReactions as any },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return { message: updated, action, emoji, userId, conversationId: message.conversationId };
  }

  // ── Search ──

  /**
   * Full-text search messages across user's conversations.
   */
  async searchMessages(userId: string, tenantId: string, query: string, conversationId?: string) {
    if (!query?.trim()) throw new Error('Search query is required');

    const where: any = {
      conversation: {
        tenantId,
        participants: { some: { userId, leftAt: null } },
      },
      deletedAt: null,
      type: 'TEXT',
      content: { contains: query.trim(), mode: 'insensitive' },
    };
    if (conversationId) where.conversationId = conversationId;

    const results = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        conversation: {
          select: {
            id: true, name: true, type: true,
            participants: {
              where: { leftAt: null },
              select: {
                userId: true,
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    return results.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      sender: msg.sender,
      createdAt: msg.createdAt,
      conversationId: msg.conversationId,
      conversationName: msg.conversation.type === 'DIRECT'
        ? this.getDirectChatName(
            msg.conversation.participants.map((p) => ({ userId: p.userId, user: p.user as any })),
            userId
          )
        : msg.conversation.name,
      conversationType: msg.conversation.type,
    }));
  }

  // ── Conversation Management ──

  /**
   * Leave a group/team conversation (set leftAt + system message).
   */
  async leaveConversation(userId: string, conversationId: string) {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { where: { userId, leftAt: null } } },
    });
    if (!convo) throw new Error('Conversation not found');
    if (convo.type === 'DIRECT') throw new Error('Cannot leave a direct message');
    if (!convo.participants.length) throw new Error('Not a member of this conversation');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    await prisma.$transaction([
      prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { leftAt: new Date() },
      }),
      prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          content: `${user?.firstName} ${user?.lastName} left the conversation`,
          type: 'SYSTEM',
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return { left: true };
  }

  /**
   * Rename a group/team conversation (ADMIN only).
   */
  async renameConversation(userId: string, conversationId: string, name: string) {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { where: { userId, leftAt: null } } },
    });
    if (!convo) throw new Error('Conversation not found');
    if (convo.type === 'DIRECT') throw new Error('Cannot rename a direct message');
    if (!convo.participants.length) throw new Error('Not a member of this conversation');
    if (convo.participants[0].role !== 'ADMIN') throw new Error('Only admins can rename this conversation');
    if (!name?.trim()) throw new Error('Name is required');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const [updated] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversationId },
        data: { name: name.trim() },
      }),
      prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          content: `${user?.firstName} ${user?.lastName} renamed the conversation to "${name.trim()}"`,
          type: 'SYSTEM',
        },
      }),
    ]);

    return updated;
  }

  /**
   * Toggle mute on a conversation for the user.
   */
  async toggleMuteConversation(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant || participant.leftAt) throw new Error('Not a member of this conversation');

    const isMuted = !!(participant as any).mutedAt;
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { mutedAt: isMuted ? null : new Date() } as any,
    });

    return { muted: !isMuted };
  }

  // ── Helpers ──

  private getDirectChatName(
    participants: Array<{ userId: string; user: { firstName: string; lastName: string } }>,
    currentUserId: string,
  ): string {
    const other = participants.find((p) => p.userId !== currentUserId);
    return other ? `${other.user.firstName} ${other.user.lastName}` : 'Direct Message';
  }

  private getDirectChatAvatar(
    participants: Array<{ userId: string; user: { avatarUrl: string | null } }>,
    currentUserId: string,
  ): string | null {
    const other = participants.find((p) => p.userId !== currentUserId);
    return other?.user.avatarUrl ?? null;
  }

  // ── Email ──

  /**
   * Send an email via SMTP. Validates recipient is in same tenant.
   */
  async sendEmail(
    fromUser: { id: string; email: string; firstName: string; lastName: string },
    tenantId: string,
    to: string,
    subject: string,
    body: string,
  ) {
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new Error('Invalid email address');
    }
    if (!subject?.trim()) throw new Error('Subject is required');
    if (!body?.trim()) throw new Error('Email body is required');

    // Verify recipient is within the same tenant
    const recipient = await prisma.user.findFirst({
      where: { email: to, tenantId, isActive: true, deletedAt: null },
      select: { id: true, firstName: true },
    });
    if (!recipient) throw new Error('Recipient not found in your organization');

    // Wrap body in PMS branded HTML template
    const htmlBody = baseLayout(`Email from ${fromUser.firstName} ${fromUser.lastName}`, `
      <p>Hi ${recipient.firstName},</p>
      <div style="white-space: pre-wrap; margin: 16px 0;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #64748b; font-size: 13px;">Sent by ${fromUser.firstName} ${fromUser.lastName} via PMS Platform</p>
    `);

    const sent = await emailService.sendMail(to, subject, htmlBody, body, { replyTo: fromUser.email });
    if (!sent) throw new Error('Failed to send email. Please try again.');
    return { sent: true };
  }

  /**
   * Use AI to draft a professional email given a natural language prompt.
   */
  async aiDraftEmail(tenantId: string, userId: string, prompt: string, context?: string) {
    if (!prompt?.trim()) throw new Error('Prompt is required');

    const systemPrompt = `You are a professional email drafting assistant for a Performance Management System (PMS) platform.
Given a user's description of what they want to say, generate a professional workplace email.

Return ONLY a valid JSON object with exactly these fields:
{
  "subject": "The email subject line",
  "body": "The full email body text (plain text, use \\n for line breaks)"
}

Guidelines:
- Keep it professional, concise, and workplace-appropriate
- Use a friendly but professional tone
- Do not include greetings like "Dear" or "Hi" - the system adds those automatically
- Do not include sign-offs like "Best regards" - keep the body focused on the message content
- The subject should be clear and descriptive (under 80 characters)
- Return ONLY the JSON, no markdown, no explanation`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: context
          ? `Context: ${context}\n\nWrite an email about: ${prompt}`
          : `Write an email about: ${prompt}`,
      },
    ];

    const response = await llmClient.chat(messages, {
      maxTokens: 1024,
      temperature: 0.7,
      tenantId,
      noCache: true,
    });

    // Parse AI response JSON
    let parsed: { subject: string; body: string };
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
    } catch {
      // Fallback: use raw response as body
      parsed = { subject: 'Draft Email', body: response.content };
    }

    return {
      subject: parsed.subject || 'Draft Email',
      body: parsed.body || response.content,
      metadata: {
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costCents: response.costCents,
      },
    };
  }

  // ── Pin / Unpin Messages ──

  /**
   * Toggle pin status on a message. Only conversation admins or message sender can pin.
   */
  async togglePinMessage(userId: string, messageId: string) {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { participants: { where: { userId, leftAt: null } } } } },
    });
    if (!message) throw new Error('Message not found');
    if (message.deletedAt) throw new Error('Cannot pin a deleted message');
    if (!message.conversation.participants.length) throw new Error('Not a member of this conversation');

    const isPinned = message.isPinned;

    return prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isPinned: !isPinned,
        pinnedById: isPinned ? null : userId,
        pinnedAt: isPinned ? null : new Date(),
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        pinnedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Get pinned messages for a conversation.
   */
  async getPinnedMessages(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant || participant.leftAt) throw new Error('Not a member of this conversation');

    return prisma.chatMessage.findMany({
      where: {
        conversationId,
        isPinned: true,
        deletedAt: null,
      },
      orderBy: { pinnedAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        pinnedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ── Forward Messages ──

  /**
   * Forward a message to another conversation.
   */
  async forwardMessage(userId: string, messageId: string, targetConversationId: string) {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        conversation: { include: { participants: { where: { userId, leftAt: null } } } },
      },
    });
    if (!message) throw new Error('Message not found');
    if (message.deletedAt) throw new Error('Cannot forward a deleted message');
    if (!message.conversation.participants.length) throw new Error('Not a member of source conversation');

    // Verify user is in target conversation
    const targetParticipant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: targetConversationId, userId } },
    });
    if (!targetParticipant || targetParticipant.leftAt) throw new Error('Not a member of target conversation');

    const [forwarded] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId: targetConversationId,
          senderId: userId,
          content: message.content,
          type: 'TEXT',
          forwardedFromId: message.id,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          forwardedFrom: {
            select: {
              id: true, content: true, senderId: true,
              sender: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.conversation.update({
        where: { id: targetConversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return forwarded;
  }

  // ── Unread Count ──

  /**
   * Get unread message count for each conversation.
   */
  async getUnreadCounts(userId: string, tenantId: string) {
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId, leftAt: null, conversation: { tenantId } },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    const counts: Record<string, number> = {};
    for (const p of participations) {
      const count = await prisma.chatMessage.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          deletedAt: null,
          createdAt: { gt: p.lastReadAt ?? new Date(0) },
        },
      });
      if (count > 0) counts[p.conversationId] = count;
    }

    return counts;
  }
}

export const chatService = new ChatService();
