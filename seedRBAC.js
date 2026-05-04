// seedRBAC.js — Account API
// Modules: Dashboard, Main Entry, Main Report, Inventory
// Run AFTER seedRole.js

import { getConnection } from "./config/db.js";
import oracledb from "oracledb";

export const seedRbacData = async () => {
  let conn;
  try {
    conn = await getConnection();

    // ─────────────────────────────────────────────────────────────────────────
    // MODULES (4)
    // ─────────────────────────────────────────────────────────────────────────
    const modulesData = [
      { name: "Dashboard",   desc: "Cash, Expense and Income dashboards",                          seq: 1 },
      { name: "Main Entry",  desc: "Receipt, Payment, Journal, Cash flow and Voucher management",  seq: 2 },
      { name: "Main Report", desc: "Voucher, Journal, Cash transfer and Chart of accounts Reports", seq: 3 },
      { name: "Inventory",   desc: "Items, Stock, Stores, UOM, Types and Requisitions",            seq: 4 },
    ];

    const moduleMap = {};

    console.log("📦 Inserting Modules...");
    for (const m of modulesData) {
      const existing = await conn.execute(
        `SELECT ID FROM HCM.MODULES WHERE MODULE_NAME = :1`, [m.name]
      );
      if (existing.rows.length > 0) {
        moduleMap[m.name] = existing.rows[0][0];
        console.log(`  - Module '${m.name}' already exists → ID ${moduleMap[m.name]}. Skipping.`);
        continue;
      }
      const result = await conn.execute(
        `INSERT INTO HCM.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
         VALUES (:m_name, :m_desc, :m_seq)
         RETURNING ID INTO :returned_id`,
        {
          m_name:      m.name,
          m_desc:      m.desc,
          m_seq:       m.seq,
          returned_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        }
      );
      moduleMap[m.name] = result.outBinds.returned_id[0];
      console.log(`  ✓ Module '${m.name}' → ID ${moduleMap[m.name]}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PERMISSIONS (37)
    // ─────────────────────────────────────────────────────────────────────────
    const permissionsData = [

      // ── 1. Dashboard (3) ──────────────────────────────────────────────────
      { mName: "Dashboard", code: "DASH_VIEW_CASH",    name: "View Cash Dashboard",    desc: "Access cash flow dashboard with monthly and yearly summaries." },
      { mName: "Dashboard", code: "DASH_VIEW_EXPENSE", name: "View Expense Dashboard", desc: "Access expense dashboard with category breakdowns and trends." },
      { mName: "Dashboard", code: "DASH_VIEW_INCOME",  name: "View Income Dashboard",  desc: "Access income dashboard with source analysis and trends." },

      // ── 2. Main Entry (15) ────────────────────────────────────────────────
      { mName: "Main Entry", code: "RECEIPT_VIEW",     name: "View Receipts",       desc: "View all receipt vouchers and receipt history." },
      { mName: "Main Entry", code: "RECEIPT_CREATE",   name: "Create Receipt",      desc: "Create new receipt vouchers." },
      { mName: "Main Entry", code: "RECEIPT_UPDATE",   name: "Update Receipt",      desc: "Edit and update existing receipt vouchers." },
      { mName: "Main Entry", code: "RECEIPT_DELETE",   name: "Delete Receipt",      desc: "Delete receipt vouchers. Admin only." },
      { mName: "Main Entry", code: "PAYMENT_VIEW",     name: "View Payments",       desc: "View all payment vouchers and payment history." },
      { mName: "Main Entry", code: "PAYMENT_CREATE",   name: "Create Payment",      desc: "Create new payment vouchers." },
      { mName: "Main Entry", code: "PAYMENT_UPDATE",   name: "Update Payment",      desc: "Edit and update existing payment vouchers." },
      { mName: "Main Entry", code: "PAYMENT_DELETE",   name: "Delete Payment",      desc: "Delete payment vouchers. Admin only." },
      { mName: "Main Entry", code: "CASH_FLOW_VIEW",   name: "View Cash Flow",      desc: "View cash flow entries and unposted cash transactions." },
      { mName: "Main Entry", code: "CASH_FLOW_CREATE", name: "Add Cash Flow",       desc: "Create new cash flow entries." },
      { mName: "Main Entry", code: "GL_VIEW",          name: "View GL Entries",     desc: "View all General Ledger entries and details." },
      { mName: "Main Entry", code: "GL_CREATE",        name: "Create GL Entry",     desc: "Add new General Ledger journal entries." },
      { mName: "Main Entry", code: "GL_EDIT",          name: "Edit GL Entry",       desc: "Modify existing General Ledger entries." },
      { mName: "Main Entry", code: "GL_UNPOSTED_VIEW", name: "View Unposted GL",    desc: "View all unposted GL, payment, and receive vouchers." },
      { mName: "Main Entry", code: "GL_ACCOUNT_CODE",  name: "Manage Account Codes",desc: "View and manage GL account codes and receive codes." },

      // ── 3. Main Report (5) ────────────────────────────────────────────────
      { mName: "Main Report", code: "REP_VOUCHER",       name: "Voucher Report",       desc: "Download and print payment voucher reports." },
      { mName: "Main Report", code: "REP_JOURNAL",       name: "Journal Report",       desc: "Generate GL journal entry reports." },
      { mName: "Main Report", code: "REP_CASH",          name: "Cash Transfer Report", desc: "Generate cash transfer and cash flow reports." },
      { mName: "Main Report", code: "REP_CHART_ACCOUNT", name: "Chart of Accounts",    desc: "View and export the full chart of accounts." },
      { mName: "Main Report", code: "REP_RECEIVE",       name: "Receive Report",       desc: "Download and print receive voucher reports." },

      // ── 4. Inventory (19) ─────────────────────────────────────────────────
      { mName: "Inventory", code: "INV_VIEW",            name: "View Inventories",       desc: "View all inventory records." },
      { mName: "Inventory", code: "INV_CREATE",          name: "Create Inventory",       desc: "Add new inventory entries." },
      { mName: "Inventory", code: "INV_UPDATE",          name: "Update Inventory",       desc: "Edit existing inventory records." },
      { mName: "Inventory", code: "INV_DELETE",          name: "Delete Inventory",       desc: "Remove inventory records." },
      { mName: "Inventory", code: "ITEM_VIEW",           name: "View Items",             desc: "View all item master records." },
      { mName: "Inventory", code: "ITEM_CREATE",         name: "Create Item",            desc: "Add new items to the item master." },
      { mName: "Inventory", code: "ITEM_UPDATE",         name: "Update Item",            desc: "Edit existing item records." },
      { mName: "Inventory", code: "ITEM_DELETE",         name: "Delete Item",            desc: "Remove item records." },
      { mName: "Inventory", code: "ITEM_STOCK_VIEW",     name: "View Item Stock",        desc: "View current stock levels for all items." },
      { mName: "Inventory", code: "ITEM_STOCK_MANAGE",   name: "Manage Item Stock",      desc: "Update and manage item stock entries." },
      { mName: "Inventory", code: "STORE_VIEW",          name: "View Stores",            desc: "View all store/warehouse records." },
      { mName: "Inventory", code: "STORE_MANAGE",        name: "Manage Stores",          desc: "Create, update and delete store records." },
      { mName: "Inventory", code: "UOM_VIEW",            name: "View UOM",               desc: "View units of measurement." },
      { mName: "Inventory", code: "UOM_MANAGE",          name: "Manage UOM",             desc: "Create and manage units of measurement." },
      { mName: "Inventory", code: "INV_TYPE_VIEW",       name: "View Inventory Types",   desc: "View inventory type classifications." },
      { mName: "Inventory", code: "INV_TYPE_MANAGE",     name: "Manage Inventory Types", desc: "Create and manage inventory type classifications." },
      { mName: "Inventory", code: "REQUISITION_VIEW",    name: "View Requisitions",      desc: "View purchase/inventory requisitions." },
      { mName: "Inventory", code: "REQUISITION_CREATE",  name: "Create Requisition",     desc: "Submit new inventory requisition requests." },
      { mName: "Inventory", code: "REQUISITION_APPROVE", name: "Approve Requisition",    desc: "Approve or reject inventory requisition requests." },
    ];

    console.log("\n🔑 Inserting Permissions...");
    for (const p of permissionsData) {
      const modId = moduleMap[p.mName];
      if (!modId) {
        console.warn(`  ⚠ Module '${p.mName}' not found for '${p.code}'. Skipping.`);
        continue;
      }
      const existing = await conn.execute(
        `SELECT ID FROM HCM.PERMISSIONS WHERE PERMISSION_CODE = :1`, [p.code]
      );
      if (existing.rows.length > 0) {
        console.log(`  - Permission '${p.code}' already exists. Skipping.`);
        continue;
      }
      await conn.execute(
        `INSERT INTO HCM.PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
         VALUES (:mod_id, :p_code, :p_name, :p_desc)`,
        { mod_id: modId, p_code: p.code, p_name: p.name, p_desc: p.desc }
      );
      console.log(`  ✓ [${p.mName}] ${p.code}`);
    }

    await conn.commit();
    console.log(`\n✅ RBAC Seed Complete: ${modulesData.length} Modules, ${permissionsData.length} Permissions.`);
    console.log("  Dashboard:3 | Main Entry:15 | Main Report:5 | Inventory:19");
    console.log("  ─────────────────────────────────────────────────────────────────────");
    console.log("  Total: 42 ✓");

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Critical Seed Failure:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    console.log("🚀 Starting RBAC seed...");
    await seedRbacData();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();