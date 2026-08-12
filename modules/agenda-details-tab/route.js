// import express from 'express';
// import multer from 'multer';
// import path from 'path';

// import * as c from './controller.js';

// // mergeParams: true — :id from the parent router (/api/agenda-management/:id)
// // is available here as req.params.id
// const router = express.Router({ mergeParams: true });

// // ── Disk storage config — FILE_PATH column stores this relative path ──
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/agenda-attachments'),
//   filename: (req, file, cb) => {
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     cb(null, `${unique}${path.extname(file.originalname)}`);
//   },
// });
// const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB cap

// // ═══════════════════ ACTION ITEMS ═══════════════════
// router.get('/action-items', c.getActionItemsController);
// router.get('/action-items/:actionItemId', c.getActionItemByIdController);
// router.post('/action-items', c.createActionItemController);
// router.put('/action-items/:actionItemId', c.updateActionItemController);
// router.patch('/action-items/:actionItemId/status',c. updateActionItemStatusController);
// router.delete('/action-items/:actionItemId', c.deleteActionItemController);

// // ═══════════════════ ATTACHMENTS ═══════════════════
// router.get('/attachments', c.getAttachmentsController);
// router.post('/attachments', upload.single('file'), c.createAttachmentController);
// router.get('/attachments/:attachmentId/download', c.downloadAttachmentController);
// router.delete('/attachments/:attachmentId', c.deleteAttachmentController);

// // ═══════════════════ NOTIFICATIONS ═══════════════════
// router.get('/notifications', c.getNotificationsController);
// router.post('/notifications', c.createNotificationController);
// router.patch('/notifications/:notificationId/sent', c.markNotificationSentController);
// router.delete('/notifications/:notificationId', c.deleteNotificationController);

// export default router;


import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import * as c from './controller.js';

// mergeParams: true — :id from the parent router (/api/agenda-management/:id)
// is available here as req.params.id
const router = express.Router({ mergeParams: true });

// ── Ensure the upload folder exists — multer.diskStorage does NOT create
// directories on its own, so a fresh clone/deploy throws ENOENT on the
// first upload until this runs once at startup.
const UPLOAD_DIR = 'uploads/agenda-attachments';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Disk storage config — FILE_PATH column stores this relative path ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB cap

// ═══════════════════ ACTION ITEMS ═══════════════════
router.get('/action-items', c.getActionItemsController);
router.get('/action-items/:actionItemId', c.getActionItemByIdController);
router.post('/action-items', c.createActionItemController);
router.put('/action-items/:actionItemId', c.updateActionItemController);
router.patch('/action-items/:actionItemId/status', c.updateActionItemStatusController);
router.delete('/action-items/:actionItemId', c.deleteActionItemController);

// ═══════════════════ ATTACHMENTS ═══════════════════
router.get('/attachments', c.getAttachmentsController);
router.post('/attachments', upload.single('file'), c.createAttachmentController);
router.get('/attachments/:attachmentId/download', c.downloadAttachmentController);
router.delete('/attachments/:attachmentId', c.deleteAttachmentController);

// ═══════════════════ NOTIFICATIONS ═══════════════════
router.get('/notifications', c.getNotificationsController);
router.post('/notifications', c.createNotificationController);
router.patch('/notifications/:notificationId/sent', c.markNotificationSentController);
router.delete('/notifications/:notificationId', c.deleteNotificationController);

export default router;