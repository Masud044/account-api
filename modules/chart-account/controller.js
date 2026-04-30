import {
  addChartAccount,
  getAllChartAccounts,
  getChartAccountById,
  updateChartAccount,
} from "../chart-account/service.js";

/**
 * POST /api/chart-account/add
 *
 * Body:
 *   account_name {string}  – required
 *   drop_1       {string}  – optional, ID of a level-1 parent
 *   drop_2       {string}  – optional, ID of a level-2 parent
 *   drop_3       {string}  – optional, ID of a level-3 parent
 *   lastLevel    {string}  – optional, UI flag
 */
export async function addChartAccountHandler(req, res) {
  const { account_name, drop_1, drop_2, drop_3, lastLevel } = req.body;

  if (!account_name || String(account_name).trim() === "") {
    return res.status(400).json({ success: false, message: "account_name is required." });
  }

  try {
    await addChartAccount({ account_name, drop_1, drop_2, drop_3, lastLevel });
    return res.status(201).json({ success: true, message: "Chart of account added successfully." });
  } catch (err) {
    console.error("[ChartAccount] addChartAccountHandler error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/chart-account
 * Optional query params: ?enabled=1  ?lebel=2
 */
export async function getAllChartAccountsHandler(req, res) {
  try {
    const rows = await getAllChartAccounts(req.query);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("[ChartAccount] getAllChartAccountsHandler error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/chart-account/:id
 */
export async function getChartAccountByIdHandler(req, res) {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: "id must be a number." });
  }

  try {
    const row = await getChartAccountById(id);
    if (!row) {
      return res.status(404).json({ success: false, message: `Chart account with id ${id} not found.` });
    }
    return res.status(200).json({ success: true, data: row });
  } catch (err) {
    console.error("[ChartAccount] getChartAccountByIdHandler error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/chart-account/:id
 *
 * Body (all optional — only provided fields are updated):
 *   account_name, account_type, parent_account_id, is_parent,
 *   lebel, lastlevel, enabled, unit_id, amount, update_by
 */
export async function updateChartAccountHandler(req, res) {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: "id must be a number." });
  }

  if (!req.body || !Object.keys(req.body).length) {
    return res.status(400).json({ success: false, message: "Request body must not be empty." });
  }

  try {
    await updateChartAccount(id, req.body);
    return res.status(200).json({ success: true, message: "Chart account updated successfully." });
  } catch (err) {
    console.error("[ChartAccount] updateChartAccountHandler error:", err);
    const status = err.message.includes("not found") ? 404 : 500;
    return res.status(status).json({ success: false, message: err.message || "Internal server error." });
  }
}