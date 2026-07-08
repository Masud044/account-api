// import express from 'express';
// import * as controller from './controller.js';

// const router = express.Router();

// // ── Purchase Recognition (H + D) ──────────────────────────────────────────────
// router.get('/',           controller.getAll);
// router.post('/',          controller.create);
// router.get('/:formId',    controller.getSingle);
// router.put('/:formId',    controller.update);
// router.delete('/:formId', controller.remove);

// // ── Approval Tracking ──────────────────────────────────────────────────────────
// router.get('/approvals/all',           controller.getAllApprovals);
// router.get('/approvals/:formId',       controller.getSingleApproval);
// router.patch('/approvals/:formId/stage', controller.updateApprovalStage);

// export default router;
import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ── Item Master (autocomplete/search for item line picker) ───────────────────
router.get('/item/search', controller.searchItems);

// ── Purchase Recognition (H + D) ──────────────────────────────────────────────
router.get('/',           controller.getAll);
router.post('/',          controller.create);
router.get('/:formId',    controller.getSingle);
router.put('/:formId/lock', controller.lockAction);
router.put('/:formId',    controller.update);
router.delete('/:formId', controller.remove);

// ── Approval Tracking (single status: Pending → Approved / Rejected) ─────────
router.get('/approvals/all',            controller.getAllApprovals);
router.get('/approvals/:formId',        controller.getSingleApproval);
router.patch('/approvals/:formId/status', controller.updateApprovalStatus);

export default router;