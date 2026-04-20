import { getRecAccountCodes } from "./rec_account_code.service.js";

export async function listRecAccountCodes(req, res) {
  try {
    const data = await getRecAccountCodes();
    return res.status(200).json({
      success: true,
      message: "Receive account codes fetched.",
      ...data,
    });
  } catch (err) {
    console.error("[rec_account_code] listRecAccountCodes error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
