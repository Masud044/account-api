import { getAccountCodeList } from "./service.js";

export async function listAccountCode(_req, res) {
  try {
    const data = await getAccountCodeList();
    res.json({ success: 1, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: 0, error: error.message });
  }
}
