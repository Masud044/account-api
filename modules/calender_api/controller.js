import { getCalendar } from "./service.js";

export async function listCalendar(req, res) {
  try {
    const rows = await getCalendar(req.query);
    if (!rows.length) return res.json({ success: 0, message: "No records found" });
    return res.json({ success: 1, records: rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (error) {
    return res.status(500).json({ success: 0, message: error.message });
  }
}
