import * as setupService from './service.js';

// ═══════════════════ DEPARTMENTS ═══════════════════
export const createDepartment = async (req, res) => {
  try {
    const result = await setupService.createDepartment(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllDepartments = async (req, res) => {
  try {
    const rows = await setupService.getAllDepartments();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await setupService.getDepartmentById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Department not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.updateDepartment(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.deleteDepartment(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Department not found.' });
    res.json({ success: true, message: 'Department deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ EMPLOYEES ═══════════════════
export const createEmployee = async (req, res) => {
  try {
    const result = await setupService.createEmployee(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const rows = await setupService.getAllEmployees(includeInactive);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await setupService.getEmployeeById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Employee not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.updateEmployee(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.deactivateEmployee(Number(id));
    res.json({ success: true, message: 'Employee deactivated successfully.', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.reactivateEmployee(Number(id));
    res.json({ success: true, message: 'Employee reactivated successfully.', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ MEETING ROOMS ═══════════════════
export const createMeetingRoom = async (req, res) => {
  try {
    const result = await setupService.createMeetingRoom(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllMeetingRooms = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const rows = await setupService.getAllMeetingRooms(includeInactive);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMeetingRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await setupService.getMeetingRoomById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Meeting room not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMeetingRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.updateMeetingRoom(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deactivateMeetingRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.deactivateMeetingRoom(Number(id));
    res.json({ success: true, message: 'Meeting room deactivated successfully.', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reactivateMeetingRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await setupService.reactivateMeetingRoom(Number(id));
    res.json({ success: true, message: 'Meeting room reactivated successfully.', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};