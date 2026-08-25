import * as repo from './repository.js';
import { buildNotificationContent } from './templete.js';
import { getUserIdsByPermission } from './get-permission.js';

// ─── Core: notify one or many users (direct user id list) ──────────────────
// input: { userIds: [], type, data, refTable, refId }
// 'data' context object template ke pass hoy (formId, vendorName, etc.)
export const notify = async ({ userIds, type, data = {}, refTable = null, refId = null }) => {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const { title, message } = buildNotificationContent(type, data);

  return repo.insertNotificationBulk({
    userIds: ids,
    title,
    message,
    type,
    refTable,
    refId,
  });
};

// ─── Shortcut: notify everyone who holds a permission ───────────────────────
// Kono module ei ekta function call korlei hobe — userIds ber kora,
// eventBus, listener.js — kichu lagbe na. Shob module e ekই pattern.
//
// Example (jekono controller e):
//   await notifyByPermission({
//     permissionCode: 'APPROVAL_DASHBOARD_VIEW',
//     type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
//     data: { formId: form.FORM_ID, vendorName: form.VENDOR_NAME },
//     refTable: REF_TABLES.PURCHASE_RECOGNITION,
//     refId: form.FORM_ID,
//   });
export const notifyByPermission = async ({ permissionCode, type, data = {}, refTable = null, refId = null }) => {
  const userIds = await getUserIdsByPermission(permissionCode);
  if (userIds.length === 0) return { count: 0 };
  return notify({ userIds, type, data, refTable, refId });
};

// ─── List / count / read (thin wrappers used by controller) ────────────────
export const listNotifications = (userId, limit) =>
  repo.getNotificationsByUser(userId, limit);

export const unreadCount = (userId) =>
  repo.getUnreadCount(userId);

export const markRead = (notificationId, userId) =>
  repo.markAsRead(notificationId, userId);

export const markAllRead = (userId) =>
  repo.markAllAsRead(userId);

export const remove = (notificationId, userId) =>
  repo.deleteNotification(notificationId, userId);