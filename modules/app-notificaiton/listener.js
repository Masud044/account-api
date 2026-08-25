import { eventBus } from './event-bus.js';
import { notify } from './service.js';
import { NOTIFICATION_TYPES, REF_TABLES } from './types.js';

// ─── Register all notification-producing events here ───────────────────────
// server.js / app.js e ekbar import korle e file register hoye jabe:
//   import './modules/notifications/notificationListener.js';

// Example: Purchase Recognition -> Send for Approval
eventBus.on('purchase.sent_for_approval', async ({ formId, vendorName, approverIds }) => {
  try {
    await notify({
      userIds: approverIds,
      type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
      data: { formId, vendorName },
      refTable: REF_TABLES.PURCHASE_RECOGNITION,
      refId: formId,
    });
  } catch (err) {
    console.error('Notification failed [purchase.sent_for_approval]:', err.message);
  }
});

// Example: Purchase Recognition -> Payment created
eventBus.on('purchase.payment_created', async ({ formId, vendorName, accountantIds }) => {
  try {
    await notify({
      userIds: accountantIds,
      type: NOTIFICATION_TYPES.PAYMENT_CREATED,
      data: { formId, vendorName },
      refTable: REF_TABLES.PAYMENT,
      refId: formId,
    });
  } catch (err) {
    console.error('Notification failed [purchase.payment_created]:', err.message);
  }
});

// Notun event add korte hobe? Ekhane ekta eventBus.on(...) block add koro.