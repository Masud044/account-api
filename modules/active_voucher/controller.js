import { postVoucher } from "./service.js";

export async function activateVoucher(req, res) {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing or invalid voucher ID." });
    const rows = await postVoucher(id);
    if (rows > 0) return res.json({ success: true, message: `Voucher ID ${id} successfully posted.`, rows_updated: rows });
    return res.status(404).json({ success: false, message: `Voucher ID ${id} not found or was already posted.`, rows_updated: 0 });
  } catch (error) {
    return res.status(500).json({ error: "Voucher posting failed.", details: error.message });
  }
}
