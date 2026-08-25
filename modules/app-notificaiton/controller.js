import * as service from './service.js';

// GET /api/notifications?userId=&limit=
export const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const rows = await service.listNotifications(userId, limit);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch notifications.' });
  }
};

// GET /api/notifications/unread-count?userId=
export const getUnreadCount = async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const count = await service.unreadCount(userId);
    res.json({ data: { count } });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch unread count.' });
  }
};

// PATCH /api/notifications/:id/read   body: { userId }
export const markAsRead = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const result = await service.markRead(notificationId, userId);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to mark as read.' });
  }
};

// PATCH /api/notifications/read-all   body: { userId }
export const markAllAsRead = async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const result = await service.markAllRead(userId);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to mark all as read.' });
  }
};

// DELETE /api/notifications/:id   body: { userId }
export const deleteNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const result = await service.remove(notificationId, userId);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete notification.' });
  }
};