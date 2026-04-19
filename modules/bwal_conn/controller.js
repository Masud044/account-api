import { healthCheck } from "./service.js";

export async function checkBwalConn(_req, res) {
  try {
    res.json({ success: 1, data: await healthCheck() });
  } catch (error) {
    res.status(500).json({ success: 0, message: error.message });
  }
}
