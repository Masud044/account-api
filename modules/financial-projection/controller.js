import * as financialProjectionService from './service.js';

// ═══════════════════ FINANCIAL PROJECTIONS ═══════════════════
export const getFinancialProjections = async (req, res) => {
  try {
    const rows = await financialProjectionService.getAllFinancialProjections();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createFinancialProjection = async (req, res) => {
  try {
    const result = await financialProjectionService.createFinancialProjection(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFinancialProjection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await financialProjectionService.updateFinancialProjection(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteFinancialProjection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await financialProjectionService.deleteFinancialProjection(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Financial projection not found.' });
    res.json({ success: true, message: 'Financial projection deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};