// import { getGlById } from "./gl_view.service.js";

// export async function viewGlEntry(req, res) {
//   try {
//     const insertID = parseInt(req.params.id);

//     if (isNaN(insertID) || insertID <= 0) {
//       return res.status(400).json({ success: false, message: "Invalid or missing ID." });
//     }

//     const data = await getGlById(insertID);

//     if (!data) {
//       return res.status(404).json({ success: false, message: "Journal entry not found." });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "GL entry fetched successfully.",
//       data,
//     });
//   } catch (err) {
//     console.error("[gl_view] viewGlEntry error:", err.message);
//     return res.status(500).json({ success: false, message: "Internal server error." });
//   }
// }
import { getGlById } from "./gl_view.service.js";

export async function viewGlEntry(req, res) {
  try {
    const insertID = req.query.insertID;

    if (!insertID) {
      return res.status(400).json({
        status:  "error",
        message: "insertID query parameter is required.",
      });
    }

    const result = await getGlById(insertID);

    if (!result) {
      return res.status(404).json({
        status:  "error",
        message: `GL entry with ID ${insertID} not found.`,
      });
    }

    return res.status(200).json({
      status:  "success",
      master:  result.master,
      details: result.details,
    });

  } catch (err) {
    console.error("[gl_view.controller] error:", err.message);
    return res.status(500).json({
      status:  "error",
      message: err.message || "Failed to fetch GL entry.",
    });
  }
}