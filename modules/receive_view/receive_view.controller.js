import { getReceiveById } from "./receive_view.service.js";

export async function viewReceive(req, res) {
  try {
    const insertID = parseInt(req.params.id);

    if (isNaN(insertID) || insertID <= 0) {
      return res.status(400).json({ success: false, message: "Invalid or missing ID." });
    }

    const data = await getReceiveById(insertID);

    if (!data) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Receive entry fetched successfully.",
      data,
    });
  } catch (err) {
    console.error("[receive_view] viewReceive error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
