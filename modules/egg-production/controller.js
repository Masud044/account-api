import * as eggProductionService from './service.js';

export const create = async (req, res) => {
  try {
    const result = await eggProductionService.createEggProduction(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const update = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await eggProductionService.updateEggProduction(Number(id), req.body);
//     if (result.rowsAffected === 0)
//       return res.status(404).json({ success: false, message: 'Egg production record not found.' });
//     res.json({ success: true, data: result });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getAll = async (req, res) => {
//   try {
//     const { fromDate, toDate, page = 1, limit = 20 } = req.query;

//     // ✅ fromDate/toDate thakle date range filter
//     if (fromDate && toDate) {
//       const rows = await eggProductionService.getEggProductionByDateRange(fromDate, toDate);
//       return res.json({ success: true, data: rows });
//     }

//     const rows = await eggProductionService.getAllEggProduction({ page: Number(page), limit: Number(limit) });
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eggProductionService.updateEggProduction(Number(id), req.body);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.message.includes('ORA-00001') || err.message.includes('unique constraint')) {
      return res.status(409).json({ success: false, message: 'A record for this date already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getAll = async (req, res) => {
//   try {
//     const { fromDate, toDate, page = 1, limit = 20 } = req.query;

//     if (fromDate && toDate) {
//       const rows = await eggProductionService.getEggProductionByDateRange(fromDate, toDate);
//       return res.json({ success: true, data: rows });
//     }

//     // ✅ limit না দিলে সব আনবে
//     const rows = await eggProductionService.getAllEggProduction({
//       page: Number(page),
//       limit: Number(limit),
//     });
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


export const getAll = async (req, res) => {
  try {
    const { fromDate, toDate, page = 1, limit = 20, excludeInvoiced } = req.query;

    if (fromDate && toDate) {
      const rows = await eggProductionService.getEggProductionByDateRange(fromDate, toDate);
      return res.json({ success: true, data: rows });
    }

    const rows = await eggProductionService.getAllEggProduction({
      page: Number(page),
      limit: Number(limit),
      excludeInvoiced: excludeInvoiced === 'true',   // ← নতুন
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await eggProductionService.getEggProductionById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Egg production record not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eggProductionService.deleteEggProduction(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Egg production record not found.' });
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Add this to your existing controller.js ─────────────────────────────────
export const getMonthlySummary = async (req, res) => {
  try {
    const year = req.query.year ?? new Date().getFullYear();
    const rows = await eggProductionService.getMonthlyProduction(year);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// controller.js এর একদম শেষে paste করো

export const getMonthlySummaryWithAvg = async (req, res) => {
  try {
    const year = req.query.year ?? new Date().getFullYear();
    const rows = await eggProductionService.getMonthlySummaryWithAvg(year);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDailyTrend = async (req, res) => {
  try {
    const year  = req.query.year  ?? new Date().getFullYear();
    const month = req.query.month ?? new Date().getMonth() + 1;
    const rows  = await eggProductionService.getDailyTrend(year, month);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};