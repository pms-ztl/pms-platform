import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { chatService } from './chat.service';

export async function listConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await chatService.listConversations(req.user!.id, req.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function getOrCreateDirect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) { res.status(400).json({ success: false, error: { message: 'targetUserId is required' } }); return; }
    const data = await chatService.getOrCreateDirect(req.user!.id, req.tenantId!, { targetUserId });
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function createGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, participantIds } = req.body;
    const data = await chatService.createGroup(req.user!.id, req.tenantId!, { name, participantIds });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('required')) { res.status(400).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function createTeamChannel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.body;
    if (!teamId) { res.status(400).json({ success: false, error: { message: 'teamId is required' } }); return; }
    const data = await chatService.createTeamChannel(req.user!.id, req.tenantId!, teamId);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const before = req.query.before as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await chatService.getMessages(req.user!.id, conversationId, before, limit);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Not a member')) { res.status(403).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const { content, replyToId } = req.body;
    const data = await chatService.sendMessage(req.user!.id, conversationId, { content, replyToId });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Not a member')) { res.status(403).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('empty') || error.message?.includes('Reply target')) { res.status(400).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    await chatService.markRead(req.user!.id, conversationId);
    res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (error) { next(error); }
}

export async function searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const q = req.query.q as string;
    const data = await chatService.searchUsers(req.tenantId!, q, req.user!.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function getUserTeams(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await chatService.getUserTeams(req.user!.id, req.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function addParticipants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || !userIds.length) { res.status(400).json({ success: false, error: { message: 'userIds array is required' } }); return; }
    const data = await chatService.addParticipants(req.user!.id, conversationId, userIds);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Cannot add')) { res.status(400).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

export async function getConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const data = await chatService.getConversation(conversationId);
    if (!data) { res.status(404).json({ success: false, error: { message: 'Conversation not found' } }); return; }
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

// ── Edit & Delete ──

export async function editMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ success: false, error: { message: 'content is required' } }); return; }
    const data = await chatService.editMessage(req.user!.id, messageId, { content });
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Cannot') || error.message?.includes('expired') || error.message?.includes('empty')) {
      res.status(403).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

export async function deleteMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { messageId } = req.params;
    const data = await chatService.deleteMessage(req.user!.id, messageId);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Cannot') || error.message?.includes('already')) {
      res.status(403).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

// ── Reactions ──

export async function toggleReaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) { res.status(400).json({ success: false, error: { message: 'emoji is required' } }); return; }
    const data = await chatService.toggleReaction(req.user!.id, messageId, emoji);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Invalid') || error.message?.includes('Cannot') || error.message?.includes('Not a member')) {
      res.status(400).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

// ── Search ──

export async function searchMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const q = req.query.q as string;
    const conversationId = req.query.conversationId as string | undefined;
    if (!q?.trim()) { res.status(400).json({ success: false, error: { message: 'q query parameter is required' } }); return; }
    const data = await chatService.searchMessages(req.user!.id, req.tenantId!, q, conversationId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

// ── Conversation Management ──

export async function leaveConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const data = await chatService.leaveConversation(req.user!.id, conversationId);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Cannot') || error.message?.includes('Not a member')) {
      res.status(400).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

export async function renameConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: { message: 'name is required' } }); return; }
    const data = await chatService.renameConversation(req.user!.id, conversationId, name);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Cannot') || error.message?.includes('Only admins') || error.message?.includes('Not a member')) {
      res.status(403).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

export async function toggleMuteConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const data = await chatService.toggleMuteConversation(req.user!.id, conversationId);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Not a member')) { res.status(403).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

// ── Pin / Unpin ──

export async function togglePinMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { messageId } = req.params;
    const data = await chatService.togglePinMessage(req.user!.id, messageId);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Cannot') || error.message?.includes('Not a member')) {
      res.status(403).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

export async function getPinnedMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const data = await chatService.getPinnedMessages(req.user!.id, conversationId);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Not a member')) { res.status(403).json({ success: false, error: { message: error.message } }); return; }
    next(error);
  }
}

// ── Forward ──

export async function forwardMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { messageId } = req.params;
    const { targetConversationId } = req.body;
    if (!targetConversationId) { res.status(400).json({ success: false, error: { message: 'targetConversationId is required' } }); return; }
    const data = await chatService.forwardMessage(req.user!.id, messageId, targetConversationId);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) { res.status(404).json({ success: false, error: { message: error.message } }); return; }
    if (error.message?.includes('Cannot') || error.message?.includes('Not a member')) {
      res.status(403).json({ success: false, error: { message: error.message } }); return;
    }
    next(error);
  }
}

// ── Unread Counts ──

export async function getUnreadCounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await chatService.getUnreadCounts(req.user!.id, req.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

// ── Email ──

export async function sendEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      res.status(400).json({ success: false, error: { message: 'to, subject, and body are required' } });
      return;
    }
    const fromUser = {
      id: req.user!.id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
    };
    const data = await chatService.sendEmail(fromUser, req.tenantId!, to, subject, body);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('Invalid email') || error.message?.includes('required')) {
      res.status(400).json({ success: false, error: { message: error.message } });
      return;
    }
    if (error.message?.includes('not found')) {
      res.status(404).json({ success: false, error: { message: error.message } });
      return;
    }
    next(error);
  }
}

export async function aiDraftEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { prompt, context } = req.body;
    if (!prompt?.trim()) {
      res.status(400).json({ success: false, error: { message: 'prompt is required' } });
      return;
    }
    const data = await chatService.aiDraftEmail(req.tenantId!, req.user!.id, prompt, context);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('required')) {
      res.status(400).json({ success: false, error: { message: error.message } });
      return;
    }
    next(error);
  }
}
