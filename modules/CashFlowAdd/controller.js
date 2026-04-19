import { insertCashFlow } from "./service.js";

export async function createCashFlow(req, res) {
  try {
    const data = await insertCashFlow(req.body);
    res.json({ status: "success", message: "Record inserted successfully.", ...data });
  } catch (error) {
    res.status(500).json({ status: "error", message: `Failed to insert record: ${error.message}` });
  }
}
