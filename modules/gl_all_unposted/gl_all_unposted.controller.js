import { getAllUnpostedGl } from "./gl_all_unposted.service.js";

export async function listAllUnpostedGl(req, res) {
  try {
    const data = await getAllUnpostedGl();
    return res.status(200).json({ success: true, message: "Unposted GL entries fetched.", ...data });
  } catch (err) {
    console.error("[gl_all_unposted] listAllUnpostedGl error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
