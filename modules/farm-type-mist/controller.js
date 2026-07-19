import * as farmTypeService from './service.js';

export const create = async (req, res) => {
  try {
    const result = await farmTypeService.createFarmType(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await farmTypeService.getAllFarmTypes();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmTypeService.updateFarmType(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmTypeService.deleteFarmType(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Farm type not found.' });
    res.json({ success: true, message: 'Farm type deleted successfully.' });
  } catch (err) {
    // FK constraint violation hole (FARM_TYPE used in calendar_d/kpi_target)
    if (err.message?.includes('ORA-02292')) {
      return res.status(409).json({ success: false, message: 'This farm type is in use and cannot be deleted.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};