import { NOTIFICATION_TYPES } from './types.js';

// ─── Templates ──────────────────────────────────────────────────────────────
// Prottekta type er jonno title + message generator.
// data: jekono context object (formId, vendorName, amount, etc.)

export const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.APPROVAL_REQUEST]: (data) => ({
    title: 'New approval request',
    message: `Form ${data.formId} (${data.vendorName ?? ''}) needs your approval.`,
  }),
  [NOTIFICATION_TYPES.APPROVAL_APPROVED]: (data) => ({
    title: 'Form approved',
    message: `Form ${data.formId} has been approved.`,
  }),
  [NOTIFICATION_TYPES.APPROVAL_REJECTED]: (data) => ({
    title: 'Form rejected',
    message: `Form ${data.formId} was rejected. ${data.reason ?? ''}`,
  }),
  [NOTIFICATION_TYPES.PAYMENT_CREATED]: (data) => ({
    title: 'Payment created',
    message: `Payment created for ${data.vendorName ?? 'vendor'} (Form ${data.formId}).`,
  }),
  [NOTIFICATION_TYPES.INVENTORY_CREATED]: (data) => ({
    title: 'Inventory created',
    message: `Inventory entry created from Form ${data.formId}.`,
  }),
  [NOTIFICATION_TYPES.LOW_STOCK]: (data) => ({
    title: 'Low stock alert',
    message: `${data.itemName ?? 'Item'} stock is below reorder level.`,
  }),
  [NOTIFICATION_TYPES.GRN_APPROVED]: (data) => ({
    title: 'GRN approved',
    message: `GRN ${data.grnId} has been approved.`,
  }),
};

// Fallback jodi kono type er template na thake
export const buildNotificationContent = (type, data = {}) => {
  const builder = NOTIFICATION_TEMPLATES[type];
  if (builder) return builder(data);
  return { title: data.title ?? 'Notification', message: data.message ?? '' };
};