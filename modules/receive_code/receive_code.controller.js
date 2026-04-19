import { getReceiveCodes } from "./receive_code.service.js";

export async function listReceiveCodes(req, res) {
  try {
    const data = await getReceiveCodes();
    return res.status(200).json({
      success: true,
      message: "Receive codes fetched.",
      data,
    });
  } catch (err) {
    console.error("[receive_code] listReceiveCodes error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
