import { getVoucherReview } from "./service.js";

export const getReview = async (req, res) => {
  try {
    const data = await getVoucherReview(req.params.id);
    if (!data.master) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};