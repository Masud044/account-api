import * as ledgerPeriodService from './service.js';

// ═══════════════════ FISCAL YEAR ═══════════════════
export const createFiscalYear = async (req, res) => {
  try {
    const result = await ledgerPeriodService.createFiscalYear(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllFiscalYears = async (req, res) => {
  try {
    const rows = await ledgerPeriodService.getAllFiscalYears();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getFiscalYear = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await ledgerPeriodService.getFiscalYearById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Fiscal year not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFiscalYearStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['OPEN', 'CLOSED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be OPEN or CLOSED.' });
    }
    const result = await ledgerPeriodService.updateFiscalYearStatus(Number(id), status);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PERIOD TYPE ═══════════════════
export const getAllPeriodTypes = async (req, res) => {
  try {
    const rows = await ledgerPeriodService.getAllPeriodTypes();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ LEDGER MODULE ═══════════════════
export const getAllModules = async (req, res) => {
  try {
    const rows = await ledgerPeriodService.getAllModules();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ LEDGER PERIOD ═══════════════════
export const createLedgerPeriod = async (req, res) => {
  try {
    const result = await ledgerPeriodService.createLedgerPeriod(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLedgerPeriodsByFiscalYear = async (req, res) => {
  try {
    const { fiscalYearId } = req.params;
    const rows = await ledgerPeriodService.getLedgerPeriodsByFiscalYear(Number(fiscalYearId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCalendarByFiscalYear = async (req, res) => {
  try {
    const { fiscalYearId } = req.params;
    const rows = await ledgerPeriodService.getCalendarByFiscalYear(Number(fiscalYearId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PERIOD MODULE STATUS ═══════════════════
export const togglePeriodModuleStatus = async (req, res) => {
  try {
    const { periodId, moduleId } = req.params;
    const { status } = req.body;
    if (!['OPEN', 'CLOSED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be OPEN or CLOSED.' });
    }
    // changedBy should come from your auth middleware (req.user.employeeId or similar),
    // matching the useAuthUserId pattern used on the frontend.
    const changedBy = req.user?.employeeId ?? req.user?.id ?? null;
    const result = await ledgerPeriodService.togglePeriodModuleStatus(
      Number(periodId),
      Number(moduleId),
      status,
      changedBy
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPeriodStatusSummary = async (req, res) => {
  try {
    const { periodId } = req.params;
    const row = await ledgerPeriodService.getPeriodStatusSummary(Number(periodId));
    if (!row) return res.status(404).json({ success: false, message: 'Period not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ═══════════════════ LEDGER PERIOD (update) ═══════════════════
export const updateLedgerPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ledgerPeriodService.updateLedgerPeriod(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PERIOD TYPE (create / update) ═══════════════════
export const createPeriodType = async (req, res) => {
  try {
    const result = await ledgerPeriodService.createPeriodType(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePeriodType = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ledgerPeriodService.updatePeriodType(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};