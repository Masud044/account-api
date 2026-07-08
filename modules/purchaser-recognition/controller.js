// import * as service from './service.js';

// // ═══════════════════════════════════════════════════════════════
// // PURCHASE RECOGNITION
// // ═══════════════════════════════════════════════════════════════

// export const create = async (req, res) => {
//   try {
//     const result = await service.createPurchaseRecognition({
//       ...req.body,
//       createdBy: req.user?.id ?? null,
//     });
//     res.status(201).json({ success: true, data: result });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getAll = async (req, res) => {
//   try {
//     const rows = await service.getAllPurchaseRecognitions();
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getSingle = async (req, res) => {
//   try {
//     const { formId } = req.params;
//     const row = await service.getPurchaseRecognitionByFormId(formId);
//     if (!row) return res.status(404).json({ success: false, message: 'Form not found.' });
//     res.json({ success: true, data: row });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const update = async (req, res) => {
//   try {
//     const { formId } = req.params;
//     const result = await service.updatePurchaseRecognition(formId, {
//       ...req.body,
//       updatedBy: req.user?.id ?? null,
//     });
//     res.json({ success: true, data: result });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const remove = async (req, res) => {
//   try {
//     const { formId } = req.params;
//     const result = await service.deletePurchaseRecognition(formId);
//     if (result.rowsAffected === 0)
//       return res.status(404).json({ success: false, message: 'Form not found.' });
//     res.json({ success: true, message: 'Form deleted successfully.' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // APPROVAL TRACKING
// // ═══════════════════════════════════════════════════════════════

// export const getAllApprovals = async (req, res) => {
//   try {
//     const rows = await service.getAllApprovalTracking();
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getSingleApproval = async (req, res) => {
//   try {
//     const { formId } = req.params;
//     const row = await service.getApprovalTrackingByFormId(formId);
//     if (!row) return res.status(404).json({ success: false, message: 'Tracking row not found.' });
//     res.json({ success: true, data: row });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const updateApprovalStage = async (req, res) => {
//   try {
//     const { formId } = req.params;
//     const { stage, value } = req.body; // { stage: 'STAGE1_IT_RECV', value: 'Approved' }
//     const result = await service.updateApprovalStage(formId, stage, value);
//     res.json({ success: true, data: result });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

import * as service from './service.js';

// ═══════════════════════════════════════════════════════════════
// ITEM MASTER (search/autocomplete for item line picker)
// ═══════════════════════════════════════════════════════════════

export const searchItems = async (req, res) => {
  try {
    const { q } = req.query;
    const rows = await service.searchItems(q);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// PURCHASE RECOGNITION
// ═══════════════════════════════════════════════════════════════

export const create = async (req, res) => {
  try {
    const result = await service.createPurchaseRecognition({
      ...req.body,
      createdBy: req.user?.id ?? null,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await service.getAllPurchaseRecognitions();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { formId } = req.params;
    const row = await service.getPurchaseRecognitionByFormId(formId);
    if (!row) return res.status(404).json({ success: false, message: 'Form not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { formId } = req.params;
    const result = await service.updatePurchaseRecognition(formId, {
      ...req.body,
      updatedBy: req.user?.id ?? null,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { formId } = req.params;
    const result = await service.deletePurchaseRecognition(formId);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Form not found.' });
    res.json({ success: true, message: 'Form deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// APPROVAL TRACKING
// ═══════════════════════════════════════════════════════════════

export const getAllApprovals = async (req, res) => {
  try {
    const rows = await service.getAllApprovalTracking();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingleApproval = async (req, res) => {
  try {
    const { formId } = req.params;
    const row = await service.getApprovalTrackingByFormId(formId);
    if (!row) return res.status(404).json({ success: false, message: 'Tracking row not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateApprovalStatus = async (req, res) => {
  try {
    const { formId } = req.params;
    const { status } = req.body; // { status: 'Approved' }
    const result = await service.updateApprovalStatus(formId, status);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const lockAction = async (req, res) => {
  try {
    const { formId } = req.params;
    // ✅ fix: was `recognitionService` (undefined) — should be `service`
    const result = await service.lockRecognitionAction(formId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};