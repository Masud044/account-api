import { getConfigInfo, getConnectionHealth } from "./service.js";

export async function health(req, res) {
  try {
    res.json({ success: 1, ...(await getConnectionHealth()) });
  } catch (error) {
    res.status(500).json({ success: 0, message: error.message });
  }
}

export async function config(_req, res) {
  res.json({ success: 1, data: await getConfigInfo() });
}
