import { insertGlVoucher } from "./service.js";

export async function createGlVoucher(req, res) {
  try {
    const data = await insertGlVoucher(req.body);
    res.json({ status: "success", message: "Voucher inserted successfully", ...data });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}
