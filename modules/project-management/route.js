// import express from 'express';
// import * as ctrl from './controller.js';

// const router = express.Router();

// // ── PROJECTS ──────────────────────────────────────────────
// router.post('/projects', ctrl.createProject);
// router.get('/projects', ctrl.getAllProjects);
// router.get('/projects/:id', ctrl.getProjectById);
// router.put('/projects/:id', ctrl.updateProject);
// router.delete('/projects/:id', ctrl.deleteProject);

// // ── FULL COMBINED REPORT ─────────────────────────────────────
// router.get('/projects/:projectId/report', ctrl.getFullProjectReport);

// // ── PROJECT_OBJECTIVES ──────────────────────────────────────
// router.post('/objectives', ctrl.createObjective);
// router.get('/objectives/:projectId', ctrl.getObjectives);
// router.put('/objectives/:id', ctrl.updateObjective);
// router.delete('/objectives/:id', ctrl.deleteObjective);

// // ── PROJECT_CAPACITY ─────────────────────────────────────────
// router.post('/capacity', ctrl.createCapacity);
// router.get('/capacity/:projectId', ctrl.getCapacity);
// router.put('/capacity/:id', ctrl.updateCapacity);
// router.delete('/capacity/:id', ctrl.deleteCapacity);

// // ── INFRASTRUCTURE_REQUIREMENTS ─────────────────────────────
// router.post('/infrastructure', ctrl.createInfrastructure);
// router.get('/infrastructure/:projectId', ctrl.getInfrastructure);
// router.put('/infrastructure/:id', ctrl.updateInfrastructure);
// router.delete('/infrastructure/:id', ctrl.deleteInfrastructure);

// // ── PROJECT_INVESTMENTS ──────────────────────────────────────
// router.post('/investments', ctrl.createInvestment);
// router.get('/investments/:projectId', ctrl.getInvestments);
// router.put('/investments/:id', ctrl.updateInvestment);
// router.delete('/investments/:id', ctrl.deleteInvestment);

// // ── PRODUCTION_SCHEDULES ─────────────────────────────────────
// router.post('/schedules', ctrl.createSchedule);
// router.get('/schedules/:projectId', ctrl.getSchedules);
// router.put('/schedules/:id', ctrl.updateSchedule);
// router.delete('/schedules/:id', ctrl.deleteSchedule);

// // ── MARKETING_CHANNEL ────────────────────────────────────────
// router.post('/marketing-channels', ctrl.createMarketingChannel);
// router.get('/marketing-channels/:projectId', ctrl.getMarketingChannels);
// router.put('/marketing-channels/:id', ctrl.updateMarketingChannel);
// router.delete('/marketing-channels/:id', ctrl.deleteMarketingChannel);

// // ── FINANCIAL_PROJECTIONS ────────────────────────────────────
// router.post('/financial-projections', ctrl.createFinancialProjection);
// router.get('/financial-projections/:projectId', ctrl.getFinancialProjections);
// router.put('/financial-projections/:id', ctrl.updateFinancialProjection);
// router.delete('/financial-projections/:id', ctrl.deleteFinancialProjection);

// // ── RISK_MANAGEMENT ──────────────────────────────────────────
// router.post('/risks', ctrl.createRisk);
// router.get('/risks/:projectId', ctrl.getRisks);
// router.put('/risks/:id', ctrl.updateRisk);
// router.delete('/risks/:id', ctrl.deleteRisk);

// // ── SOCIAL_ECONOMIC_BENEFITS ─────────────────────────────────
// router.post('/social-benefits', ctrl.createSocialBenefit);
// router.get('/social-benefits/:projectId', ctrl.getSocialBenefits);
// router.put('/social-benefits/:id', ctrl.updateSocialBenefit);
// router.delete('/social-benefits/:id', ctrl.deleteSocialBenefit);

// // ── CONCLUSION ────────────────────────────────────────────────
// router.post('/conclusion', ctrl.createConclusion);
// router.get('/conclusion/:projectId', ctrl.getConclusion);
// router.put('/conclusion/:id', ctrl.updateConclusion);
// router.delete('/conclusion/:id', ctrl.deleteConclusion);

// export default router;


import express from 'express';
import * as ctrl from './controller.js';

const router = express.Router();

// ── PROJECT_OBJECTIVES ──────────────────────────────────────
router.post('/objectives', ctrl.createObjective);
router.get('/objectives/:projectId', ctrl.getObjectives);
router.put('/objectives/:id', ctrl.updateObjective);
router.delete('/objectives/:id', ctrl.deleteObjective);

// ── PROJECT_CAPACITY ─────────────────────────────────────────
router.post('/capacity', ctrl.createCapacity);
router.get('/capacity/:projectId', ctrl.getCapacity);
router.put('/capacity/:id', ctrl.updateCapacity);
router.delete('/capacity/:id', ctrl.deleteCapacity);

// ── INFRASTRUCTURE_REQUIREMENTS ─────────────────────────────
router.post('/infrastructure', ctrl.createInfrastructure);
router.get('/infrastructure/:projectId', ctrl.getInfrastructure);
router.put('/infrastructure/:id', ctrl.updateInfrastructure);
router.delete('/infrastructure/:id', ctrl.deleteInfrastructure);

// ── PROJECT_INVESTMENTS ──────────────────────────────────────
router.post('/investments', ctrl.createInvestment);
router.get('/investments/:projectId', ctrl.getInvestments);
router.put('/investments/:id', ctrl.updateInvestment);
router.delete('/investments/:id', ctrl.deleteInvestment);

// ── PRODUCTION_SCHEDULES ─────────────────────────────────────
router.post('/schedules', ctrl.createSchedule);
router.get('/schedules/:projectId', ctrl.getSchedules);
router.put('/schedules/:id', ctrl.updateSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);

// ── MARKETING_CHANNEL ────────────────────────────────────────
router.post('/marketing-channels', ctrl.createMarketingChannel);
router.get('/marketing-channels/:projectId', ctrl.getMarketingChannels);
router.put('/marketing-channels/:id', ctrl.updateMarketingChannel);
router.delete('/marketing-channels/:id', ctrl.deleteMarketingChannel);

// ── PROJECT_PHASE (new — brought over from Farm Project) ──────
router.get('/phases', ctrl.getPhases);               // ?projectId=
router.post('/phases', ctrl.createPhase);
router.put('/phases/:id', ctrl.updatePhase);
router.delete('/phases/:id', ctrl.deletePhase);

// ── PROJECT_ACTIVITY (new — brought over from Farm Project) ───
router.get('/activities', ctrl.getActivities);        // ?phaseId= or ?projectId=
router.post('/activities', ctrl.createActivity);
router.put('/activities/:id', ctrl.updateActivity);
router.delete('/activities/:id', ctrl.deleteActivity);

// ── FINANCIAL_PROJECTIONS ────────────────────────────────────
router.post('/financial-projections', ctrl.createFinancialProjection);
router.get('/financial-projections/:projectId', ctrl.getFinancialProjections);
router.put('/financial-projections/:id', ctrl.updateFinancialProjection);
router.delete('/financial-projections/:id', ctrl.deleteFinancialProjection);

// ── RISK_MANAGEMENT ──────────────────────────────────────────
router.post('/risks', ctrl.createRisk);
router.get('/risks/:projectId', ctrl.getRisks);
router.put('/risks/:id', ctrl.updateRisk);
router.delete('/risks/:id', ctrl.deleteRisk);

// ── SOCIAL_ECONOMIC_BENEFITS ─────────────────────────────────
router.post('/social-benefits', ctrl.createSocialBenefit);
router.get('/social-benefits/:projectId', ctrl.getSocialBenefits);
router.put('/social-benefits/:id', ctrl.updateSocialBenefit);
router.delete('/social-benefits/:id', ctrl.deleteSocialBenefit);

// ── CONCLUSION ────────────────────────────────────────────────
router.post('/conclusion', ctrl.createConclusion);
router.get('/conclusion/:projectId', ctrl.getConclusion);
router.put('/conclusion/:id', ctrl.updateConclusion);
router.delete('/conclusion/:id', ctrl.deleteConclusion);

// ── PROJECTS (Header) + FULL COMBINED REPORT — generic /:id routes go LAST ──
router.post('/projects', ctrl.create);
router.get('/projects', ctrl.getAll);
router.get('/projects/:projectId/report', ctrl.getFullProjectReport); // literal sub-path before /:id
router.get('/projects/:id', ctrl.getSingle);
router.put('/projects/:id', ctrl.update);
router.delete('/projects/:id', ctrl.remove);

export default router;