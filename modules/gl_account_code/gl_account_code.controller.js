import { getGlAccountCodes } from "./gl_account_code.service.js";

export async function listGlAccountCodes(req, res) {
  try {
    const data = await getGlAccountCodes();
    return res.status(200).json({ success: true, message: "GL account codes fetched.", data });
  } catch (err) {
    console.error("[gl_account_code] listGlAccountCodes error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
