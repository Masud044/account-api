import express from 'express';
import * as farmTypeController from './controller.js';

const router = express.Router();

router.get('/',       farmTypeController.getAll);
router.post('/',      farmTypeController.create);
router.put('/:id',    farmTypeController.update);
router.delete('/:id', farmTypeController.remove);

export default router;