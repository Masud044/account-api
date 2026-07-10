import * as fishProjectService from './service.js';

// POST /api/fish-project
export const create = async (req, res) => {
  try {
    const result = await fishProjectService.createFishProject(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/fish-project
export const getAll = async (req, res) => {
  try {
    const rows = await fishProjectService.getAllFishProjects();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/fish-project/:id
export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await fishProjectService.getFishProjectById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Fish project not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/fish-project/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fishProjectService.updateFishProject(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/fish-project/:id
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fishProjectService.deleteFishProject(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Fish project not found.' });
    res.json({ success: true, message: 'Fish project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};