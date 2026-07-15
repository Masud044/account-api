import express from 'express';
import * as cowProjectController from './controller.js';

const router = express.Router();

/* ══════════════════ COW_PROJECT_MEDICIN (specific paths first) ══════════════════ */
router.get('/medicine',            cowProjectController.getAllMedicine);
router.post('/medicine',           cowProjectController.createMedicine);
router.get('/medicine/cow/:cowNo', cowProjectController.getMedicineByCow);
router.get('/medicine/:id',        cowProjectController.getSingleMedicine);
router.put('/medicine/:id',        cowProjectController.updateMedicine);
router.delete('/medicine/:id',     cowProjectController.removeMedicine);

/* ══════════════════ COW_PROJECT_WEIGHT (specific paths first) ══════════════════ */
router.get('/weight',            cowProjectController.getAllWeight);
router.post('/weight',           cowProjectController.createWeight);
router.get('/weight/cow/:cowNo', cowProjectController.getWeightByCow);
router.get('/weight/:id',        cowProjectController.getSingleWeight);
router.put('/weight/:id',        cowProjectController.updateWeight);
router.delete('/weight/:id',     cowProjectController.removeWeight);

/* ══════════════════ COW_PROJECT (generic /:id catch-all last) ══════════════════ */
router.get('/',        cowProjectController.getAll);
router.post('/',       cowProjectController.create);
router.get('/:id',     cowProjectController.getSingle);
router.put('/:id',     cowProjectController.update);
router.delete('/:id',  cowProjectController.remove);

export default router;