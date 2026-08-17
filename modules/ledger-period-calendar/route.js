import express from 'express';
import * as c from './controller.js';
const router = express.Router();

// Period types & modules (reference/lookup — literal paths)
router.get('/modules',      c.getAllModules);
// Period types (CRUD — literal paths, must stay above other :id patterns on this router)
router.post('/period-types',      c.createPeriodType);
router.patch('/period-types/:id', c.updatePeriodType);
router.get('/period-types',       c.getAllPeriodTypes);   // keep existing GET here too (order fine, different verb)



// Period module status (literal paths — must come before any /:id on this router)
router.get('/check-period-status', c.checkPeriodStatus);
router.patch('/period-module-status/:periodId/:moduleId', c.togglePeriodModuleStatus);
router.get('/period-status-summary/:periodId',             c.getPeriodStatusSummary);

// Ledger periods (literal sub-paths before dynamic ones)
router.post('/ledger-periods',                        c.createLedgerPeriod);
router.patch('/ledger-periods/:id', c.updateLedgerPeriod);
router.get('/ledger-periods/calendar/:fiscalYearId',   c.getCalendarByFiscalYear);
router.get('/ledger-periods/:fiscalYearId',            c.getLedgerPeriodsByFiscalYear);

// Fiscal years (header) — generic /:id routes go LAST
router.get('/fiscal-years',            c.getAllFiscalYears);
router.post('/fiscal-years',           c.createFiscalYear);
router.patch('/fiscal-years/:id/status', c.updateFiscalYearStatus);
router.get('/fiscal-years/:id',        c.getFiscalYear);

export default router;