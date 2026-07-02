import * as invoiceService from './service.js';

// POST /api/sal-invoice
export const create = async (req, res) => {
  try {
    const result = await invoiceService.createInvoice(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sal-invoice
export const getAll = async (req, res) => {
  try {
    const rows = await invoiceService.getAllInvoices();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sal-invoice/:hid
export const getSingle = async (req, res) => {
  try {
    const { hid } = req.params;
    const row = await invoiceService.getInvoiceById(Number(hid));
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/sal-invoice/:hid
export const remove = async (req, res) => {
  try {
    const { hid } = req.params;
    const result = await invoiceService.deleteInvoice(Number(hid));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { hid } = req.params;
    const result = await invoiceService.updateInvoice(Number(hid), {
      ...req.body,
      updatedBy: req.user?.id ?? null, // auth থাকলে logged-in user id বসবে
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};