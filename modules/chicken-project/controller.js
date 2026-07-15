import * as chickenProjectService from './service.js';

// ═══════════════════ HEADER ═══════════════════
export const create = async (req, res) => {
  try {
    const result = await chickenProjectService.createChickenProject(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await chickenProjectService.getAllChickenProjects();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await chickenProjectService.getChickenProjectById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Chicken project not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await chickenProjectService.updateChickenProject(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await chickenProjectService.deleteChickenProject(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Chicken project not found.' });
    res.json({ success: true, message: 'Chicken project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ COUNTS ═══════════════════
export const getCounts = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await chickenProjectService.getChickenProjectCounts(Number(id));
    res.json({ success: true, data: counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ DETAILS ═══════════════════
export const getDetails = async (req, res) => {
  try {
    const { hId } = req.query;
    const rows = await chickenProjectService.getDetailsByHeaderId(Number(hId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createDetail = async (req, res) => {
  try {
    const result = await chickenProjectService.createChickenProjectDetail(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await chickenProjectService.updateChickenProjectDetail(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await chickenProjectService.deleteChickenProjectDetail(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Detail not found.' });
    res.json({ success: true, message: 'Detail deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ VACCINATION ═══════════════════
export const getVaccinations = async (req, res) => {
  try {
    const { hid } = req.query;
    const rows = await chickenProjectService.getVaccinationByHeaderId(Number(hid));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createVaccination = async (req, res) => {
  try {
    const result = await chickenProjectService.createVaccination(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateVaccination = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await chickenProjectService.updateVaccination(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteVaccination = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await chickenProjectService.deleteVaccination(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Vaccination record not found.' });
    res.json({ success: true, message: 'Vaccination record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};