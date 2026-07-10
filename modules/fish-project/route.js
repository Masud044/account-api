import express from 'express';
import * as fishProjectController from './controller.js';

const router = express.Router();

router.get('/',     fishProjectController.getAll);
router.post('/',    fishProjectController.create);
router.get('/:id',  fishProjectController.getSingle);
router.put('/:id',  fishProjectController.update);
router.delete('/:id', fishProjectController.remove);

export default router;