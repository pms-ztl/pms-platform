import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user's notifications
router.get('/', notificationsController.getNotifications);

// Get unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// Get preferences
router.get('/preferences', notificationsController.getPreferences);

// Update preferences
router.put('/preferences', notificationsController.updatePreferences);

// Mark all as read
router.post('/read-all', notificationsController.markAllAsRead);

// Mark single notification as read
router.post('/:id/read', notificationsController.markAsRead);

export default router;
