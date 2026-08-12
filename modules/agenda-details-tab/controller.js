import fs from 'fs/promises';
import path from 'path';
import * as workflowService from './service.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION ITEMS
// ═══════════════════════════════════════════════════════════════════════════

export const getActionItemsController = async (req, res) => {
  try {
    const rows = await workflowService.getActionItems(req.params.id);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getActionItemByIdController = async (req, res) => {
  try {
    const row = await workflowService.getActionItemById(req.params.id, req.params.actionItemId);
    if (!row) return res.status(404).json({ success: false, message: 'Action item not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createActionItemController = async (req, res) => {
  try {
    const result = await workflowService.createActionItem(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateActionItemController = async (req, res) => {
  try {
    const result = await workflowService.updateActionItem(
      req.params.id,
      req.params.actionItemId,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateActionItemStatusController = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) throw new Error('Status is required.');
    const result = await workflowService.updateActionItemStatus(
      req.params.id,
      req.params.actionItemId,
      status
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteActionItemController = async (req, res) => {
  try {
    const result = await workflowService.deleteActionItem(req.params.id, req.params.actionItemId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ATTACHMENTS  (disk storage — multer.diskStorage feeds req.file.path)
// ═══════════════════════════════════════════════════════════════════════════

export const getAttachmentsController = async (req, res) => {
  try {
    const rows = await workflowService.getAttachments(req.params.id);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createAttachmentController = async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded.');
    const result = await workflowService.createAttachment(req.params.id, {
      agendaItemId: req.body.agendaItemId || null,
      fileName:     req.file.originalname,
      filePath:     req.file.path, // multer diskStorage sets this — e.g. 'uploads/agenda-attachments/xxx.pdf'
      uploadedBy:   req.body.uploadedBy,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    // If DB insert failed after the file was already written to disk, clean it up.
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /:id/attachments/:attachmentId/download — streams the file back with
// its original name, regardless of the randomized name it has on disk.
export const downloadAttachmentController = async (req, res) => {
  try {
    const row = await workflowService.getAttachmentById(req.params.id, req.params.attachmentId);
    if (!row) return res.status(404).json({ success: false, message: 'Attachment not found.' });

    const absolutePath = path.resolve(row.FILE_PATH);
    await fs.access(absolutePath); // throws if the file is missing on disk
    res.download(absolutePath, row.FILE_NAME);
  } catch (err) {
    res.status(404).json({ success: false, message: 'File not found on server.' });
  }
};

export const deleteAttachmentController = async (req, res) => {
  try {
    const result = await workflowService.deleteAttachment(req.params.id, req.params.attachmentId);
    if (result.filePath) {
      await fs.unlink(path.resolve(result.filePath)).catch(() => {}); // best-effort disk cleanup
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const getNotificationsController = async (req, res) => {
  try {
    const rows = await workflowService.getNotifications(req.params.id);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createNotificationController = async (req, res) => {
  try {
    const result = await workflowService.createNotification(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const markNotificationSentController = async (req, res) => {
  try {
    const result = await workflowService.markNotificationSent(req.params.id, req.params.notificationId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteNotificationController = async (req, res) => {
  try {
    const result = await workflowService.deleteNotification(req.params.id, req.params.notificationId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};