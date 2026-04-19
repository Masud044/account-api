import { createGlEntry } from "./gl_add.service.js";

export async function addGlEntry(req, res) {
  try {
    const { trans_date, GL_ENTRY_DATE, receive_desc, details } = req.body;

    if (!trans_date || !GL_ENTRY_DATE || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: trans_date, GL_ENTRY_DATE, and details[].",
      });
    }

    const data = await createGlEntry({ trans_date, GL_ENTRY_DATE, receive_desc, details });

    return res.status(201).json({
      success: true,
      message: "Journal entry created successfully.",
      data,
    });
  } catch (err) {
    console.error("[gl_add] addGlEntry error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
