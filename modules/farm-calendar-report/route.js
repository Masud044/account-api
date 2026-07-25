import express from 'express';
import { getFarmCalendarReportController } from './controller.js';

const router = express.Router();

// GET /api/farm-calendar-report/:calendarId
router.get('/:calendarId', getFarmCalendarReportController);

export default router;