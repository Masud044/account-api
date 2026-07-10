import * as chickenProjectService from './service.js';

// POST /api/chicken-project
export const create = async (req, res) => {
  try {
    const result = await chickenProjectService.createChickenProject(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chicken-project
export const getAll = async (req, res) => {
  try {
    const rows = await chickenProjectService.getAllChickenProjects();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chicken-project/:id
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

// PUT /api/chicken-project/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await chickenProjectService.updateChickenProject(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/chicken-project/:id
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