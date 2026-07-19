import * as farmCalendarService from './service.js';

// ═══════════════════ HEADER ═══════════════════
export const create = async (req, res) => {
  try {
    const result = await farmCalendarService.createFarmCalendar(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await farmCalendarService.getAllFarmCalendars();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await farmCalendarService.getFarmCalendarById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Farm calendar not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmCalendarService.updateFarmCalendar(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmCalendarService.deleteFarmCalendar(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Farm calendar not found.' });
    res.json({ success: true, message: 'Farm calendar deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ COUNTS ═══════════════════
export const getCounts = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await farmCalendarService.getFarmCalendarCounts(Number(id));
    res.json({ success: true, data: counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ DETAILS (Activities) ═══════════════════
export const getDetails = async (req, res) => {
  try {
    const { calendarId } = req.query;
    const rows = await farmCalendarService.getDetailsByCalendarId(Number(calendarId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createDetail = async (req, res) => {
  try {
    const result = await farmCalendarService.createFarmCalendarDetail(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmCalendarService.updateFarmCalendarDetail(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmCalendarService.deleteFarmCalendarDetail(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Activity detail not found.' });
    res.json({ success: true, message: 'Activity detail deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ KPI TARGETS ═══════════════════
export const getKpiTargets = async (req, res) => {
  try {
    const { calendarId } = req.query;
    const rows = await farmCalendarService.getKpiTargetsByCalendarId(Number(calendarId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createKpi = async (req, res) => {
  try {
    const result = await farmCalendarService.createKpiTarget(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateKpi = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmCalendarService.updateKpiTarget(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteKpi = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmCalendarService.deleteKpiTarget(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'KPI target not found.' });
    res.json({ success: true, message: 'KPI target deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};