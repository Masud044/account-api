import * as projectService from './service.js';

// ═══════════════════ PROJECT_OBJECTIVES ═══════════════════
export const createObjective = async (req, res) => {
  try {
    const result = await projectService.createObjective(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getObjectives = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getObjectivesByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateObjective(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteObjective(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Objective not found.' });
    res.json({ success: true, message: 'Objective deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PROJECT_CAPACITY ═══════════════════
export const createCapacity = async (req, res) => {
  try {
    const result = await projectService.createCapacity(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCapacity = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getCapacityByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCapacity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateCapacity(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCapacity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteCapacity(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Capacity record not found.' });
    res.json({ success: true, message: 'Capacity record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ INFRASTRUCTURE_REQUIREMENTS ═══════════════════
export const createInfrastructure = async (req, res) => {
  try {
    const result = await projectService.createInfrastructure(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInfrastructure = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getInfrastructureByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateInfrastructure = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateInfrastructure(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteInfrastructure = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteInfrastructure(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Infrastructure item not found.' });
    res.json({ success: true, message: 'Infrastructure item deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PROJECT_INVESTMENTS ═══════════════════
export const createInvestment = async (req, res) => {
  try {
    const result = await projectService.createInvestment(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInvestments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getInvestmentsByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateInvestment(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteInvestment(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Investment record not found.' });
    res.json({ success: true, message: 'Investment record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PRODUCTION_SCHEDULES ═══════════════════
export const createSchedule = async (req, res) => {
  try {
    const result = await projectService.createSchedule(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getSchedulesByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateSchedule(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteSchedule(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    res.json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ MARKETING_CHANNEL ═══════════════════
export const createMarketingChannel = async (req, res) => {
  try {
    const result = await projectService.createMarketingChannel(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMarketingChannels = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getMarketingChannelsByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMarketingChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateMarketingChannel(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteMarketingChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteMarketingChannel(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Marketing channel not found.' });
    res.json({ success: true, message: 'Marketing channel deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PROJECT_PHASE (new) ═══════════════════
export const getPhases = async (req, res) => {
  try {
    const { projectId } = req.query;
    const rows = await projectService.getPhasesByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPhase = async (req, res) => {
  try {
    const result = await projectService.createProjectPhase(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateProjectPhase(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteProjectPhase(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Project phase not found.' });
    res.json({ success: true, message: 'Project phase deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PROJECT_ACTIVITY (new) ═══════════════════
export const getActivities = async (req, res) => {
  try {
    const { phaseId, projectId } = req.query;
    const rows = phaseId
      ? await projectService.getActivitiesByPhaseId(Number(phaseId))
      : await projectService.getActivitiesByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createActivity = async (req, res) => {
  try {
    const result = await projectService.createProjectActivity(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateProjectActivity(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteProjectActivity(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Project activity not found.' });
    res.json({ success: true, message: 'Project activity deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ FINANCIAL_PROJECTIONS ═══════════════════
export const getFinancialProjections = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getFinancialProjectionsByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createFinancialProjection = async (req, res) => {
  try {
    const result = await projectService.createFinancialProjection(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFinancialProjection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateFinancialProjection(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteFinancialProjection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteFinancialProjection(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Financial projection not found.' });
    res.json({ success: true, message: 'Financial projection deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ RISK_MANAGEMENT ═══════════════════
export const createRisk = async (req, res) => {
  try {
    const result = await projectService.createRisk(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRisks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getRisksByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateRisk(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteRisk(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Risk record not found.' });
    res.json({ success: true, message: 'Risk record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ SOCIAL_ECONOMIC_BENEFITS ═══════════════════
export const createSocialBenefit = async (req, res) => {
  try {
    const result = await projectService.createSocialBenefit(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSocialBenefits = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await projectService.getSocialBenefitsByProjectId(Number(projectId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSocialBenefit = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateSocialBenefit(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSocialBenefit = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteSocialBenefit(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Social benefit not found.' });
    res.json({ success: true, message: 'Social benefit deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ CONCLUSION ═══════════════════
export const createConclusion = async (req, res) => {
  try {
    const result = await projectService.createConclusion(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getConclusion = async (req, res) => {
  try {
    const { projectId } = req.params;
    const row = await projectService.getConclusionByProjectId(Number(projectId));
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateConclusion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateConclusion(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteConclusion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteConclusion(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Conclusion not found.' });
    res.json({ success: true, message: 'Conclusion deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════ PROJECTS (Header) + FULL REPORT — generic /:id controllers go LAST ═══════════════════
export const create = async (req, res) => {
  try {
    const result = await projectService.createProject(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await projectService.getAllProjects();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getFullProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const report = await projectService.getFullProjectReport(Number(projectId));
    if (!report) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await projectService.getProjectById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.updateProject(Number(id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteProject(Number(id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};