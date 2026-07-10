import * as farmDashboardService from './service.js';

// GET /api/farm-dashboard/summary
export const summary = async (req, res) => {
  try {
    const data = await farmDashboardService.getFarmSummary();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};