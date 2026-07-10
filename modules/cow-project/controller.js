import * as cowProjectService from './service.js';

// POST /api/cow-project
export const create = async (req, res) => {
  try {
    const result = await cowProjectService.createCowProject(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/cow-project
export const getAll = async (req, res) => {
  try {
    const rows = await cowProjectService.getAllCowProjects();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/cow-project/:id
export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await cowProjectService.getCowProjectById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Cow project not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/cow-project/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cowProjectService.updateCowProject(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/cow-project/:id
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cowProjectService.deleteCowProject(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Cow project not found.' });
    res.json({ success: true, message: 'Cow project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};