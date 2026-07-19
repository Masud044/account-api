import express from 'express';
import * as activityLogController from './controller.js';

const router = express.Router();

router.get('/',                 activityLogController.getAll);        // ← notun add
router.get('/detail/:detailId', activityLogController.getByDetailId);
router.post('/',                activityLogController.create);
router.get('/:id',              activityLogController.getSingle);
router.put('/:id',              activityLogController.update);
router.delete('/:id',           activityLogController.remove);

export default router;