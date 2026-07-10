import express from 'express';
import * as farmDashboardController from './controller.js';

const router = express.Router();

router.get('/summary', farmDashboardController.summary);

export default router;