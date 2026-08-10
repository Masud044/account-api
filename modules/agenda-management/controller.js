import * as meetingService from './service.js';

// ═══════════════════ MEETING (Header) ═══════════════════
export const create = async (req, res) => {
  try {
    const result = await meetingService.createMeeting(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await meetingService.getAllMeetings();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await meetingService.getMeetingById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await meetingService.updateMeeting(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await meetingService.deleteMeeting(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    res.json({ success: true, message: 'Meeting deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ LOOKUPS (for form dropdowns) ═══════════════════
export const getDepartments = async (req, res) => {
  try {
    const rows = await meetingService.getDepartments();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const rows = await meetingService.getEmployees();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMeetingRooms = async (req, res) => {
  try {
    const rows = await meetingService.getMeetingRooms();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};