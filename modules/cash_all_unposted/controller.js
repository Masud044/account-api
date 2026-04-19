import { listCashAllUnposted } from "./service.js";

export async function getCashAllUnposted(_req, res) {
  try {
    res.json({ status: "success", data: await listCashAllUnposted() });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}
