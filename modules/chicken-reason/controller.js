import * as reasonService from './service.js';

const sendError = (res, err) =>
  res.status(err.status || 500).json({ success: false, message: err.message });

export const create = async (req, res) => {
  try {
    const result = await reasonService.createMortalityReason(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await reasonService.getAllMortalityReasons();
    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, err);
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await reasonService.getMortalityReasonById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Mortality reason not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    sendError(res, err);
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await reasonService.updateMortalityReason(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await reasonService.deleteMortalityReason(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Mortality reason not found.' });
    res.json({ success: true, message: 'Mortality reason deleted successfully.' });
  } catch (err) {
    sendError(res, err);
  }
};