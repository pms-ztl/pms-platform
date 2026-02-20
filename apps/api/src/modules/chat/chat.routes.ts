import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { aiAccessGuard } from '../../middleware/ai-access-guard';
import * as ctrl from './chat.controller';

const router = Router();
router.use(authenticate);

// Conversations
router.get('/conversations', ctrl.listConversations);
router.get('/conversations/:conversationId', ctrl.getConversation);
router.post('/conversations/direct', ctrl.getOrCreateDirect);
router.post('/conversations/group', ctrl.createGroup);
router.post('/conversations/team-channel', ctrl.createTeamChannel);
router.post('/conversations/:conversationId/participants', ctrl.addParticipants);
router.post('/conversations/:conversationId/leave', ctrl.leaveConversation);
router.put('/conversations/:conversationId/name', ctrl.renameConversation);
router.post('/conversations/:conversationId/mute', ctrl.toggleMuteConversation);
router.get('/conversations/:conversationId/pinned', ctrl.getPinnedMessages);

// Messages (search + unread-counts before parameterized routes)
router.get('/messages/search', ctrl.searchMessages);
router.get('/messages/unread-counts', ctrl.getUnreadCounts);
router.get('/conversations/:conversationId/messages', ctrl.getMessages);
router.post('/conversations/:conversationId/messages', ctrl.sendMessage);
router.put('/conversations/:conversationId/messages/:messageId', ctrl.editMessage);
router.delete('/conversations/:conversationId/messages/:messageId', ctrl.deleteMessage);
router.post('/conversations/:conversationId/messages/:messageId/reactions', ctrl.toggleReaction);
router.post('/conversations/:conversationId/messages/:messageId/pin', ctrl.togglePinMessage);
router.post('/conversations/:conversationId/messages/:messageId/forward', ctrl.forwardMessage);
router.post('/conversations/:conversationId/read', ctrl.markRead);

// Email
router.post('/email/send', ctrl.sendEmail);
router.post('/email/ai-draft', aiAccessGuard, ctrl.aiDraftEmail);

// Users & Teams lookup
router.get('/users/search', ctrl.searchUsers);
router.get('/teams', ctrl.getUserTeams);

export { router as chatRoutes };
