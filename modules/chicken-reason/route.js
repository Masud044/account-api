import express from 'express';
import * as c from './controller.js';

const router = express.Router();

router.get('/',       c.getAll);      // dropdown / LOV list
router.post('/',      c.create);
router.get('/:id',    c.getSingle);
router.put('/:id',    c.update);
router.delete('/:id', c.remove);

export default router;