import { reverseGlEntry } from "./service.js";

export async function handleReverseVoucher(req, res) {
  try {
    const id = req.body?.id ?? req.query?.id;
    if (!id) {
      return res.status(400).json({ status: "error", message: "Missing voucher ID." });
    }

    const entry_by = req.body?.entry_by ?? req.query?.entry_by ?? null;

    const result = await reverseGlEntry(Number(id), entry_by);
    return res.json({
      status: "success",
      message: `Voucher reversed successfully as ${result.voucherNo}.`,
      ...result,
    });
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ status: "error", message: error.message });
  }
}