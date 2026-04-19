import { updateGlVoucher } from "./service.js";

export async function updateVoucher(req, res) {
  try {
    await updateGlVoucher(req.body);
    res.json({ status: "success", message: "Voucher updated successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}
