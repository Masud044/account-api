import express from 'express';
import * as cowProjectController from './controller.js';

const router = express.Router();

router.get('/',     cowProjectController.getAll);
router.post('/',    cowProjectController.create);
router.get('/:id',  cowProjectController.getSingle);
router.put('/:id',  cowProjectController.update);
router.delete('/:id', cowProjectController.remove);

export default router;