import * as mortalityService from './service.js';

const sendError = (res, err) =>
  res.status(err.status || 500).json({ success: false, message: err.message });

export const getAll = async (req, res) => {
  try {
    const { detailId, hId } = req.query;
    let rows;
    if (detailId) {
      rows = await mortalityService.getMortalitiesByDetailId(Number(detailId));
    } else if (hId) {
      rows = await mortalityService.getMortalitiesByHeaderId(Number(hId));
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'detailId or hId query parameter is required.' });
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, err);
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await mortalityService.getMortalityById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Mortality record not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    sendError(res, err);
  }
};

export const create = async (req, res) => {
  try {
    const result = await mortalityService.createMortality(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mortalityService.updateMortality(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mortalityService.deleteMortality(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Mortality record not found.' });
    res.json({ success: true, message: 'Mortality record deleted successfully.' });
  } catch (err) {
    sendError(res, err);
  }
};