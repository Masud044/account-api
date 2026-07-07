import * as inventoryService from './inventory.service.js';

export const nextGrnNo = async (req, res) => {
  try {
    const grnNo = await inventoryService.getNextGrnNo();
    res.json({ success: true, data: { grnNo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const nextPoNo = async (req, res) => {
  try {
    const poNo = await inventoryService.getNextPoNo();
    res.json({ success: true, data: { poNo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    // ✅ CREATION_BY-te ekhon logged-in user-er NAME jabe (id na)
    const payload = { ...req.body, creationBy: req.user?.name ?? null };
    const result = await inventoryService.createInventory(payload);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { hid } = req.params;
    // ✅ UPDATE_BY-te ekhon logged-in user-er NAME jabe (id na)
    const payload = { ...req.body, updateBy: req.user?.name ?? null };
    const result = await inventoryService.updateInventory(Number(hid), payload);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const rows = await inventoryService.getAllInventories({ page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const row = await inventoryService.getInventoryById(Number(req.params.hid));
    if (!row) return res.status(404).json({ success: false, message: 'Inventory not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const result = await inventoryService.deleteInventory(Number(req.params.hid));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Inventory not found.' });
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};