// // import { createGlEntry } from "./gl_add.service.js";

// // export async function addGlEntry(req, res) {
// //   try {
// //     const { trans_date, GL_ENTRY_DATE, receive_desc, details } = req.body;

// //     if (!trans_date || !GL_ENTRY_DATE || !Array.isArray(details) || details.length === 0) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Missing required fields: trans_date, GL_ENTRY_DATE, and details[].",
// //       });
// //     }

// //     const data = await createGlEntry({ trans_date, GL_ENTRY_DATE, receive_desc, details });

// //     return res.status(201).json({
// //       success: true,
// //       message: "Journal entry created successfully.",
// //       data,
// //     });
// //   } catch (err) {
// //     console.error("[gl_add] addGlEntry error:", err.message);
// //     return res.status(500).json({ success: false, message: "Internal server error." });
// //   }
// // }

// import { createGlEntry } from "./gl_add.service.js";

// export async function addGlEntry(req, res) {
//   try {
//     const { trans_date, GL_ENTRY_DATE, receive_desc, supporting, details,  type,               // ← ADD
//       ref_reverse_entry,  // ← ADD } = req.body;

//     // ── Validation ────────────────────────────────────────────────────
//     if (!trans_date || !GL_ENTRY_DATE || !receive_desc) {
//       return res.status(400).json({
//         status:  "error",
//         message: "trans_date, GL_ENTRY_DATE, and receive_desc are required.",
//       });
//     }
//     if (!Array.isArray(details) || details.length === 0) {
//       return res.status(400).json({
//         status:  "error",
//         message: "At least one detail row is required.",
//       });
//     }

//     const result = await createGlEntry({
//       trans_date,
//       GL_ENTRY_DATE,
//       receive_desc,
//       supporting,
//       details,
//     });

//     return res.status(201).json({
//       status:     "success",
//       message:    "Journal entry created successfully.",
//       masterId:   result.masterId,
//       voucherNo:  result.voucherNo,
//     });

//   } catch (err) {
//     console.error("[gl_add.controller] error:", err.message);
//     return res.status(500).json({
//       status:  "error",
//       message: err.message || "Failed to create GL entry.",
//     });
//   }
// }

import { createGlEntry } from "./gl_add.service.js";

export async function addGlEntry(req, res) {
  try {
     console.log("REQ BODY:", req.body); // ← temporary debug line
    const { trans_date, GL_ENTRY_DATE, receive_desc, supporting, details, entry_by, type, ref_reverse_entry } = req.body;
    console.log("EXTRACTED TYPE:", type); // ← temporary debug line
    // const {
    //   trans_date,
    //   GL_ENTRY_DATE,
    //   receive_desc,
    //   supporting,
    //   details,
    //   entry_by,
    //   type,               // ← ADD
    //   ref_reverse_entry,  // ← ADD
    // } = req.body;

    // ── Validation ────────────────────────────────────────────────────
    if (!trans_date || !GL_ENTRY_DATE || !receive_desc) {
      return res.status(400).json({
        status:  "error",
        message: "trans_date, GL_ENTRY_DATE, and receive_desc are required.",
      });
    }
    if (!Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        status:  "error",
        message: "At least one detail row is required.",
      });
    }

    const result = await createGlEntry({
      trans_date,
      GL_ENTRY_DATE,
      receive_desc,
      supporting,
      details,
      entry_by,
      type,               // ← ADD
      ref_reverse_entry,  // ← ADD
    });

    return res.status(201).json({
      status:     "success",
      message:    "Journal entry created successfully.",
      masterId:   result.masterId,
      voucherNo:  result.voucherNo,
    });

  } catch (err) {
    console.error("[gl_add.controller] error:", err.message);
    return res.status(500).json({
      status:  "error",
      message: err.message || "Failed to create GL entry.",
    });
  }
}
