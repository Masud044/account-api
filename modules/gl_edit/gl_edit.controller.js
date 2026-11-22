// // // import { updateGlEntry } from "./gl_edit.service.js";

// // // export async function editGlEntry(req, res) {
// // //   try {
// // //     const {
// // //       master_id,
// // //       trans_date,
// // //       gl_entry_date,
// // //       receive_desc,
// // //       supporting,
// // //       details,
// // //     } = req.body;

// // //     if (
// // //       !master_id ||
// // //       !trans_date ||
// // //       !gl_entry_date ||
// // //       !Array.isArray(details) ||
// // //       details.length === 0
// // //     ) {
// // //       return res.status(400).json({
// // //         success: false,
// // //         message:
// // //           "Missing required fields: master_id, trans_date, gl_entry_date, and details[].",
// // //       });
// // //     }

// // //     const data = await updateGlEntry({
// // //       master_id,
// // //       trans_date,
// // //       gl_entry_date,
// // //       receive_desc,
// // //       supporting,
// // //       details,
// // //     });

// // //     return res.status(200).json({
// // //       success: true,
// // //       message: "Journal entry updated successfully.",
// // //       data,
// // //     });
// // //   } catch (err) {
// // //     console.error("[gl_edit] editGlEntry error:", err.message);
// // //     return res.status(500).json({ success: false, message: "Internal server error." });
// // //   }
// // // }

// // import { updateGlEntry } from "./gl_edit.service.js";

// // export async function editGlEntry(req, res) {
// //   try {
// //     const {
// //       master_id,
// //       trans_date,
// //       gl_entry_date,
// //       receive_desc,
// //       supporting,
// //       details,
// //     } = req.body;

// //     // ── Validation ────────────────────────────────────────────────────
// //     if (!master_id || !trans_date || !gl_entry_date) {
// //       return res.status(400).json({
// //         status:  "error",
// //         message: "master_id, trans_date, and gl_entry_date are required.",
// //       });
// //     }
// //     if (!Array.isArray(details) || details.length === 0) {
// //       return res.status(400).json({
// //         status:  "error",
// //         message: "At least one detail row is required.",
// //       });
// //     }

// //     const result = await updateGlEntry({
// //       master_id,
// //       trans_date,
// //       gl_entry_date,
// //       receive_desc,
// //       supporting,
// //       details,
// //     });

// //     return res.status(200).json({
// //       status:   "success",
// //       message:  "Journal entry updated successfully.",
// //       masterId: result.masterId,
// //     });

// //   } catch (err) {
// //     console.error("[gl_edit.controller] error:", err.message);
// //     return res.status(500).json({
// //       status:  "error",
// //       message: err.message || "Failed to update GL entry.",
// //     });
// //   }
// // }

// import { updateGlEntry } from "./gl_edit.service.js";

// export async function editGlEntry(req, res) {
//   try {
//     const {
//       master_id,
//       trans_date,
//       gl_entry_date,
//       receive_desc,
//       supporting,
//       details,
//       update_by,          // ← ADD
//       type,               // ← ADD
//       // ref_reverse_entry,  // ← ADD
//     } = req.body;

//     // ── Validation ────────────────────────────────────────────────────
//     if (!master_id || !trans_date || !gl_entry_date) {
//       return res.status(400).json({
//         status:  "error",
//         message: "master_id, trans_date, and gl_entry_date are required.",
//       });
//     }
//     if (!Array.isArray(details) || details.length === 0) {
//       return res.status(400).json({
//         status:  "error",
//         message: "At least one detail row is required.",
//       });
//     }

//     const result = await updateGlEntry({
//       master_id,
//       trans_date,
//       gl_entry_date,
//       receive_desc,
//       supporting,
//       details,
//       update_by,          // ← ADD
//       type,               // ← ADD
    
//     });

//     return res.status(200).json({
//       status:   "success",
//       message:  "Journal entry updated successfully.",
//       masterId: result.masterId,
//     });

//   } catch (err) {
//     console.error("[gl_edit.controller] error:", err.message);
//     return res.status(500).json({
//       status:  "error",
//       message: err.message || "Failed to update GL entry.",
//     });
//   }
// }

import { updateGlEntry, deleteGlEntry } from "./gl_edit.service.js";

export async function editGlEntry(req, res) {
  try {
    const {
      master_id,
      trans_date,
      gl_entry_date,
      receive_desc,
      supporting,
      details,
      update_by,
      type,
    } = req.body;

    // ── Validation ────────────────────────────────────────────────────
    if (!master_id || !trans_date || !gl_entry_date) {
      return res.status(400).json({
        status:  "error",
        message: "master_id, trans_date, and gl_entry_date are required.",
      });
    }
    if (!Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        status:  "error",
        message: "At least one detail row is required.",
      });
    }

    const result = await updateGlEntry({
      master_id,
      trans_date,
      gl_entry_date,
      receive_desc,
      supporting,
      details,
      update_by,
      type,
    });

    return res.status(200).json({
      status:   "success",
      message:  "Journal entry updated successfully.",
      masterId: result.masterId,
    });

  } catch (err) {
    console.error("[gl_edit.controller] edit error:", err.message);
    return res.status(err.statusCode || 500).json({
      status:  "error",
      message: err.message || "Failed to update GL entry.",
    });
  }
}

export async function removeGlEntry(req, res) {
  try {
    const { id } = req.params;

    const result = await deleteGlEntry({ master_id: id });

    return res.status(200).json({
      status:   "success",
      success:  1,
      message:  "Voucher deleted successfully.",
      masterId: result.masterId,
      deleted:  result.deleted,
    });

  } catch (err) {
    console.error("[gl_edit.controller] delete error:", err.message);
    return res.status(err.statusCode || 500).json({
      status:  "error",
      success: 0,
      message: err.message || "Failed to delete voucher.",
    });
  }
}