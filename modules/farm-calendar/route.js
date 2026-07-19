import express from 'express';
import * as c from './controller.js';

const router = express.Router();

// Details (literal paths — must come before /:id)
router.get('/details',        c.getDetails);       // ?calendarId=
router.post('/details',       c.createDetail);
router.put('/details/:id',    c.updateDetail);
router.delete('/details/:id', c.deleteDetail);

// KPI Targets (literal paths — must come before /:id)
router.get('/kpi-targets',        c.getKpiTargets);   // ?calendarId=
router.post('/kpi-targets',       c.createKpi);
router.put('/kpi-targets/:id',    c.updateKpi);
router.delete('/kpi-targets/:id', c.deleteKpi);

// Header — generic /:id routes go LAST
router.get('/',      c.getAll);
router.post('/',     c.create);
router.get('/:id/counts', c.getCounts);   // must come before plain /:id too
router.get('/:id',   c.getSingle);
router.put('/:id',   c.update);
router.delete('/:id', c.remove);

export default router;