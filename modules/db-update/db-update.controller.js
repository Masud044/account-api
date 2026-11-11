import { runScript } from "./db-update.service.js";

const ALLOWED_SCHEMAS = ["BWA", "PM"];

export async function execute(req, res) {
  const { schema, sql } = req.body || {};

  if (!ALLOWED_SCHEMAS.includes(schema)) {
    return res.status(400).json({ error: "schema must be 'BWA' or 'PM'." });
  }
  if (!sql || typeof sql !== "string" || !sql.trim()) {
    return res.status(400).json({ error: "sql is required." });
  }

  console.log(`[dbupdate] schema=${schema} ip=${req.ip} len=${sql.length}`);

  try {
    const outcome = await runScript(schema, sql);
    res.json(outcome);
  } catch (err) {
    console.error("[dbupdate] execution error:", err);
    res.status(500).json({ error: err.message });
  }
}
