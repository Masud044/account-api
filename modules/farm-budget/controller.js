import * as farmBudgetService from './service.js';

// ═══════════════════ HEADER ═══════════════════
export const create = async (req, res) => {
  try {
    const result = await farmBudgetService.createFarmBudget(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await farmBudgetService.getAllFarmBudgets();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await farmBudgetService.getFarmBudgetById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Farm budget not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmBudgetService.updateFarmBudget(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmBudgetService.deleteFarmBudget(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Farm budget not found.' });
    res.json({ success: true, message: 'Farm budget deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ COUNTS ═══════════════════
export const getCounts = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await farmBudgetService.getFarmBudgetCounts(Number(id));
    res.json({ success: true, data: counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ DETAILS (Expense Lines) ═══════════════════
export const getDetails = async (req, res) => {
  try {
    const { budgetId } = req.query;
    const rows = await farmBudgetService.getDetailsByBudgetId(Number(budgetId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createDetail = async (req, res) => {
  try {
    const result = await farmBudgetService.createFarmBudgetDetail(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmBudgetService.updateFarmBudgetDetail(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmBudgetService.deleteFarmBudgetDetail(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Budget detail not found.' });
    res.json({ success: true, message: 'Budget detail deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};