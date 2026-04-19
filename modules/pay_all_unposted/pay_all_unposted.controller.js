import { getAllUnpostedPayments } from "./pay_all_unposted.service.js";

export async function listUnpostedPayments(req, res) {
  try {
    const data = await getAllUnpostedPayments();
    return res.status(200).json({
      success: true,
      message: "Unposted payment vouchers fetched.",
      ...data,
    });
  } catch (err) {
    console.error("[pay_all_unposted] listUnpostedPayments error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
