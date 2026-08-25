import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './controller.js';

const router = express.Router();

// Static routes age, /:id niche (route ordering bug avoid korar jonno)
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;