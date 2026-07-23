import express from 'express';
import * as c from './controller.js';

const router = express.Router();

// Phase (literal paths — must come before /:id)
router.get('/phases', c.getPhases);              // ?projectId=
router.post('/phases', c.createPhase);
router.put('/phases/:id', c.updatePhase);
router.delete('/phases/:id', c.deletePhase);

// Activity (literal paths — must come before /:id)
router.get('/activities', c.getActivities);       // ?phaseId= or ?projectId=
router.post('/activities', c.createActivity);
router.put('/activities/:id', c.updateActivity);
router.delete('/activities/:id', c.deleteActivity);

// Financial Projections (literal paths — must come before /:id)
router.get('/financial-projections', c.getFinancialProjections);   // ?projectId=
router.post('/financial-projections', c.createFinancialProjection);
router.put('/financial-projections/:id', c.updateFinancialProjection);
router.delete('/financial-projections/:id', c.deleteFinancialProjection);

// Header — generic /:id routes go LAST
router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getSingle);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

export default router;