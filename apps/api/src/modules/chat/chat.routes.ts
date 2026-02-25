import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { aiAccessGuard } from '../../middleware/ai-access-guard';
import * as ctrl from './chat.controller';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reject requests where :conversationId is not a valid UUID (prevents Prisma 500s). */
function validateConversationId(req: Request, res: Response, next: NextFunction) {
  const { conversationId } = req.params;
  if (conversationId && !UUID_RE.test(conversationId)) {
    res.status(400).json({ success: false, error: { message: 'Invalid conversation ID format' } });
    return;
  }
  next();
}

const router = Router();
router.use(authenticate);

// Conversations — specific named routes MUST come before parameterized /:conversationId
// to prevent Express matching 'direct', 'group', 'team-channel' as UUIDs
router.get('/conversations', ctrl.listConversations);
router.post('/conversations/direct', ctrl.getOrCreateDirect);
router.post('/conversations/group', ctrl.createGroup);
router.post('/conversations/team-channel', ctrl.createTeamChannel);
// Parameterized routes after all named ones — UUID validation guard
router.get('/conversations/:conversationId', validateConversationId, ctrl.getConversation);
router.post('/conversations/:conversationId/participants', validateConversationId, ctrl.addParticipants);
router.post('/conversations/:conversationId/leave', validateConversationId, ctrl.leaveConversation);
router.put('/conversations/:conversationId/name', validateConversationId, ctrl.renameConversation);
router.post('/conversations/:conversationId/mute', validateConversationId, ctrl.toggleMuteConversation);
router.get('/conversations/:conversationId/pinned', validateConversationId, ctrl.getPinnedMessages);

// Messages (search + unread-counts before parameterized routes)
router.get('/messages/search', ctrl.searchMessages);
router.get('/messages/unread-counts', ctrl.getUnreadCounts);
router.get('/conversations/:conversationId/messages', validateConversationId, ctrl.getMessages);
router.post('/conversations/:conversationId/messages', validateConversationId, ctrl.sendMessage);
router.put('/conversations/:conversationId/messages/:messageId', validateConversationId, ctrl.editMessage);
router.delete('/conversations/:conversationId/messages/:messageId', validateConversationId, ctrl.deleteMessage);
router.post('/conversations/:conversationId/messages/:messageId/reactions', validateConversationId, ctrl.toggleReaction);
router.post('/conversations/:conversationId/messages/:messageId/pin', validateConversationId, ctrl.togglePinMessage);
router.post('/conversations/:conversationId/messages/:messageId/forward', validateConversationId, ctrl.forwardMessage);
router.post('/conversations/:conversationId/read', validateConversationId, ctrl.markRead);

// Email
router.post('/email/send', ctrl.sendEmail);
router.post('/email/ai-draft', aiAccessGuard, ctrl.aiDraftEmail);

// Users & Teams lookup
router.get('/users/search', ctrl.searchUsers);
router.get('/teams', ctrl.getUserTeams);

export { router as chatRoutes };
