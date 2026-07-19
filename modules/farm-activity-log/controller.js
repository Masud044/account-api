import * as activityLogService from './service.js';

export const create = async (req, res) => {
  try {
    const result = await activityLogService.createActivityLog(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/farm-activity-log/detail/:detailId
export const getByDetailId = async (req, res) => {
  try {
    const { detailId } = req.params;
    const rows = await activityLogService.getActivityLogsByDetailId(Number(detailId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await activityLogService.getAllActivityLogs();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await activityLogService.getActivityLogById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Activity log not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await activityLogService.updateActivityLog(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await activityLogService.deleteActivityLog(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Activity log not found.' });
    res.json({ success: true, message: 'Activity log deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};