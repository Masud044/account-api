import * as cowProjectService from './service.js';

/* ══════════════════ COW_PROJECT ══════════════════ */

export const create = async (req, res) => {
  try {
    const result = await cowProjectService.createCowProject(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await cowProjectService.getAllCowProjects();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const row = await cowProjectService.getCowProjectById(Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Cow project not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const result = await cowProjectService.updateCowProject(Number(req.params.id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const result = await cowProjectService.deleteCowProject(Number(req.params.id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Cow project not found.' });
    res.json({ success: true, message: 'Cow project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════ COW_PROJECT_MEDICIN ══════════════════ */

export const createMedicine = async (req, res) => {
  try {
    const result = await cowProjectService.createCowMedicine(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllMedicine = async (req, res) => {
  try {
    const rows = await cowProjectService.getAllCowMedicine();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMedicineByCow = async (req, res) => {
  try {
    const rows = await cowProjectService.getCowMedicineByCow(Number(req.params.cowNo));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingleMedicine = async (req, res) => {
  try {
    const row = await cowProjectService.getCowMedicineById(Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Vaccine record not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const result = await cowProjectService.updateCowMedicine(Number(req.params.id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const removeMedicine = async (req, res) => {
  try {
    const result = await cowProjectService.deleteCowMedicine(Number(req.params.id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Vaccine record not found.' });
    res.json({ success: true, message: 'Vaccine record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════ COW_PROJECT_WEIGHT ══════════════════ */

export const createWeight = async (req, res) => {
  try {
    const result = await cowProjectService.createCowWeight(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllWeight = async (req, res) => {
  try {
    const rows = await cowProjectService.getAllCowWeights();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWeightByCow = async (req, res) => {
  try {
    const rows = await cowProjectService.getCowWeightsByCow(Number(req.params.cowNo));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingleWeight = async (req, res) => {
  try {
    const row = await cowProjectService.getCowWeightById(Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Weight record not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateWeight = async (req, res) => {
  try {
    const result = await cowProjectService.updateCowWeight(Number(req.params.id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const removeWeight = async (req, res) => {
  try {
    const result = await cowProjectService.deleteCowWeight(Number(req.params.id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Weight record not found.' });
    res.json({ success: true, message: 'Weight record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};