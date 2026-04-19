import { getAllUnpostedReceipts } from "./receive_all_unposted.service.js";

export async function listUnpostedReceipts(req, res) {
  try {
    const data = await getAllUnpostedReceipts();
    return res.status(200).json({
      success: true,
      message: "Unposted receipt vouchers fetched.",
      ...data,
    });
  } catch (err) {
    console.error("[receive_all_unposted] listUnpostedReceipts error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
