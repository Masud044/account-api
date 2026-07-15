import express from 'express';
import * as c from './controller.js';

const router = express.Router();

// Details (literal paths — must come before /:id)
router.get('/details',        c.getDetails);       // ?hId=
router.post('/details',       c.createDetail);
router.put('/details/:id',    c.updateDetail);
router.delete('/details/:id', c.deleteDetail);

// Vaccination (literal paths — must come before /:id)
router.get('/vaccination',        c.getVaccinations);   // ?hid=
router.post('/vaccination',       c.createVaccination);
router.put('/vaccination/:id',    c.updateVaccination);
router.delete('/vaccination/:id', c.deleteVaccination);

// Header — generic /:id routes go LAST
router.get('/',      c.getAll);
router.post('/',     c.create);
router.get('/:id/counts', c.getCounts);   // this must come before plain /:id too
router.get('/:id',   c.getSingle);
router.put('/:id',   c.update);
router.delete('/:id', c.remove);

export default router;