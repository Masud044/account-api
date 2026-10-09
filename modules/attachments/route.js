import express from 'express';
import multer from 'multer';
import * as controller from './controller.js';

const router = express.Router();

const MAX_SIZE = 20 * 1024 * 1024; // 20MB per file
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE } });

router.get('/', controller.listAttachments);
router.post('/', upload.single('file'), controller.uploadAttachment);
router.get('/:id/download', controller.downloadAttachment);
router.delete('/:id', controller.deleteAttachment);

export default router;
