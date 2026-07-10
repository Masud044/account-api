import express from 'express';
import * as chickenProjectController from './controller.js';

const router = express.Router();

router.get('/',     chickenProjectController.getAll);
router.post('/',    chickenProjectController.create);
router.get('/:id',  chickenProjectController.getSingle);
router.put('/:id',  chickenProjectController.update);
router.delete('/:id', chickenProjectController.remove);

export default router;