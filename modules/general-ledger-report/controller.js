import * as generalLedgerService from './service.js';

export const getGeneralLedger = async (req, res) => {
  try {
    const { fromDate, toDate, accountCode } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate ar toDate required.' });
    }

    const rows = await generalLedgerService.getGeneralLedger(fromDate, toDate, accountCode || null);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};