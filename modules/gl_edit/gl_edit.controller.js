import { updateGlEntry } from "./gl_edit.service.js";

export async function editGlEntry(req, res) {
  try {
    const {
      master_id,
      trans_date,
      gl_entry_date,
      receive_desc,
      supporting,
      details,
    } = req.body;

    if (
      !master_id ||
      !trans_date ||
      !gl_entry_date ||
      !Array.isArray(details) ||
      details.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: master_id, trans_date, gl_entry_date, and details[].",
      });
    }

    const data = await updateGlEntry({
      master_id,
      trans_date,
      gl_entry_date,
      receive_desc,
      supporting,
      details,
    });

    return res.status(200).json({
      success: true,
      message: "Journal entry updated successfully.",
      data,
    });
  } catch (err) {
    console.error("[gl_edit] editGlEntry error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
