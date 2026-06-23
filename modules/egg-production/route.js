// import express from 'express';
// import * as eggProductionController from './controller.js';

// const router = express.Router();

// router.get('/', eggProductionController.getAll);
// router.post('/', eggProductionController.create);
// router.get('/:id', eggProductionController.getSingle);
// router.put('/:id', eggProductionController.update);
// router.delete('/:id', eggProductionController.remove);

// export default router;

// ─── Add this line to your existing router.js ────────────────────────────────
// (before the /:id routes so it doesn't get swallowed by the param matcher)

// router.get('/monthly-summary', eggProductionController.getMonthlySummary);

// Full updated router.js:
import express from 'express';
import * as eggProductionController from './controller.js';

const router = express.Router();


router.get('/monthly-summary-avg', eggProductionController.getMonthlySummaryWithAvg); // নতুন ← যোগ করো
router.get('/daily-trend',         eggProductionController.getDailyTrend);            // নতুন ← যোগ করো



router.get('/monthly-summary', eggProductionController.getMonthlySummary); // ← new
router.get('/',                eggProductionController.getAll);
router.post('/',               eggProductionController.create);
router.get('/:id',             eggProductionController.getSingle);
router.put('/:id',             eggProductionController.update);
router.delete('/:id',          eggProductionController.remove);

export default router;