import * as svc from './service.js';

// Generic wrapper: keeps every controller consistent, one line per route
const handle = (fn, { notFoundMsg } = {}) => async (req, res) => {
  try {
    const result = await fn(req);
    if (result === null && notFoundMsg) {
      return res.status(404).json({ success: false, message: notFoundMsg });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error(`${fn.name || 'controller'} error:`, err);
    return res.status(500).json({ success: false, message: err.message || 'Operation failed.' });
  }
};

// ── PROJECTS ──────────────────────────────────────────────
export const createProject          = handle((req) => svc.createProject(req.body));
export const getAllProjects         = handle(() => svc.getAllProjects());
export const getProjectById         = handle((req) => svc.getProjectById(req.params.id), { notFoundMsg: 'Project not found.' });
export const updateProject          = handle((req) => svc.updateProject(req.params.id, req.body));
export const deleteProject          = handle((req) => svc.deleteProject(req.params.id));

// ── PROJECT_OBJECTIVES ──────────────────────────────────────
export const createObjective        = handle((req) => svc.createObjective(req.body));
export const getObjectives          = handle((req) => svc.getObjectivesByProjectId(req.params.projectId));
export const updateObjective        = handle((req) => svc.updateObjective(req.params.id, req.body));
export const deleteObjective        = handle((req) => svc.deleteObjective(req.params.id));

// ── PROJECT_CAPACITY ─────────────────────────────────────────
export const createCapacity         = handle((req) => svc.createCapacity(req.body));
export const getCapacity            = handle((req) => svc.getCapacityByProjectId(req.params.projectId));
export const updateCapacity         = handle((req) => svc.updateCapacity(req.params.id, req.body));
export const deleteCapacity         = handle((req) => svc.deleteCapacity(req.params.id));

// ── INFRASTRUCTURE_REQUIREMENTS ─────────────────────────────
export const createInfrastructure   = handle((req) => svc.createInfrastructure(req.body));
export const getInfrastructure      = handle((req) => svc.getInfrastructureByProjectId(req.params.projectId));
export const updateInfrastructure   = handle((req) => svc.updateInfrastructure(req.params.id, req.body));
export const deleteInfrastructure   = handle((req) => svc.deleteInfrastructure(req.params.id));

// ── PROJECT_INVESTMENTS ──────────────────────────────────────
export const createInvestment       = handle((req) => svc.createInvestment(req.body));
export const getInvestments         = handle((req) => svc.getInvestmentsByProjectId(req.params.projectId));
export const updateInvestment       = handle((req) => svc.updateInvestment(req.params.id, req.body));
export const deleteInvestment       = handle((req) => svc.deleteInvestment(req.params.id));

// ── PRODUCTION_SCHEDULES ─────────────────────────────────────
export const createSchedule         = handle((req) => svc.createSchedule(req.body));
export const getSchedules           = handle((req) => svc.getSchedulesByProjectId(req.params.projectId));
export const updateSchedule         = handle((req) => svc.updateSchedule(req.params.id, req.body));
export const deleteSchedule         = handle((req) => svc.deleteSchedule(req.params.id));

// ── MARKETING_CHANNEL ────────────────────────────────────────
export const createMarketingChannel = handle((req) => svc.createMarketingChannel(req.body));
export const getMarketingChannels   = handle((req) => svc.getMarketingChannelsByProjectId(req.params.projectId));
export const updateMarketingChannel = handle((req) => svc.updateMarketingChannel(req.params.id, req.body));
export const deleteMarketingChannel = handle((req) => svc.deleteMarketingChannel(req.params.id));

// ── FINANCIAL_PROJECTIONS ────────────────────────────────────
export const createFinancialProjection = handle((req) => svc.createFinancialProjection(req.body));
export const getFinancialProjections   = handle((req) => svc.getFinancialProjectionsByProjectId(req.params.projectId));
export const updateFinancialProjection = handle((req) => svc.updateFinancialProjection(req.params.id, req.body));
export const deleteFinancialProjection = handle((req) => svc.deleteFinancialProjection(req.params.id));

// ── RISK_MANAGEMENT ──────────────────────────────────────────
export const createRisk             = handle((req) => svc.createRisk(req.body));
export const getRisks               = handle((req) => svc.getRisksByProjectId(req.params.projectId));
export const updateRisk             = handle((req) => svc.updateRisk(req.params.id, req.body));
export const deleteRisk             = handle((req) => svc.deleteRisk(req.params.id));

// ── SOCIAL_ECONOMIC_BENEFITS ─────────────────────────────────
export const createSocialBenefit    = handle((req) => svc.createSocialBenefit(req.body));
export const getSocialBenefits      = handle((req) => svc.getSocialBenefitsByProjectId(req.params.projectId));
export const updateSocialBenefit    = handle((req) => svc.updateSocialBenefit(req.params.id, req.body));
export const deleteSocialBenefit    = handle((req) => svc.deleteSocialBenefit(req.params.id));

// ── CONCLUSION ────────────────────────────────────────────────
export const createConclusion       = handle((req) => svc.createConclusion(req.body));
export const getConclusion          = handle((req) => svc.getConclusionByProjectId(req.params.projectId));
export const updateConclusion       = handle((req) => svc.updateConclusion(req.params.id, req.body));
export const deleteConclusion       = handle((req) => svc.deleteConclusion(req.params.id));

// ── FULL REPORT (all tables combined) ───────────────────────
export const getFullProjectReport   = handle(
  (req) => svc.getFullProjectReport(req.params.projectId),
  { notFoundMsg: 'Project not found.' }
);