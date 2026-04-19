import { addReceiveVoucher } from "./service.js";

export async function createReceive(req, res) {
  try {
    const data = await addReceiveVoucher(req.body);
    res.json({ status: "success", message: "Voucher created successfully.", ...data });
  } catch (error) {
    res.status(500).json({ status: "error", message: `An error occurred: ${error.message}` });
  }
}
