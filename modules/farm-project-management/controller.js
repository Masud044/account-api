import * as farmProjectService from './service.js';

// ═══════════════════ PROJECT (Header) ═══════════════════
export const create = async (req, res) => {
  try {
    const result = await farmProjectService.createFarmProject(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await farmProjectService.getAllFarmProjects();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await farmProjectService.getFarmProjectById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Farm project not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.updateFarmProject(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.deleteFarmProject(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Farm project not found.' });
    res.json({ success: true, message: 'Farm project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PHASE ═══════════════════
export const getPhases = async (req, res) => {
  try {
    const { projectId } = req.query;
    const rows = await farmProjectService.getPhasesByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPhase = async (req, res) => {
  try {
    const result = await farmProjectService.createFarmProjectPhase(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.updateFarmProjectPhase(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.deleteFarmProjectPhase(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Farm project phase not found.' });
    res.json({ success: true, message: 'Farm project phase deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ ACTIVITY ═══════════════════
export const getActivities = async (req, res) => {
  try {
    const { phaseId, projectId } = req.query;
    const rows = phaseId
      ? await farmProjectService.getActivitiesByPhaseId(Number(phaseId))
      : await farmProjectService.getActivitiesByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createActivity = async (req, res) => {
  try {
    const result = await farmProjectService.createFarmProjectActivity(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.updateFarmProjectActivity(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.deleteFarmProjectActivity(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Farm project activity not found.' });
    res.json({ success: true, message: 'Farm project activity deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ FINANCIAL PROJECTIONS ═══════════════════
export const getFinancialProjections = async (req, res) => {
  try {
    const { projectId } = req.query;
    const rows = await farmProjectService.getFinancialProjectionsByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createFinancialProjection = async (req, res) => {
  try {
    const result = await farmProjectService.createFinancialProjection(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFinancialProjection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.updateFinancialProjection(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteFinancialProjection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await farmProjectService.deleteFinancialProjection(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Financial projection not found.' });
    res.json({ success: true, message: 'Financial projection deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};