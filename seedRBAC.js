// seedRBAC.js
// Modules & Permissions for BWA (Bangladesh Welfare Agro) — schema: BWA
// Run AFTER seedRole.js (ROLES must already exist: Admin, Inventory, ...)
import "dotenv/config";

import {  getConnection } from "./config/db.js";
import oracledb from "oracledb";

// ── Modules (must match src/lib/constants/nav-item.js on the frontend) ─────
// Module name → toModulePrefix() must exactly equal the requiredPermission
// prefix used in nav-item.js (e.g. "Receive Voucher" → RECEIVE_VOUCHER_VIEW)
const modulesData = [
  // ── Home / Dashboard ──
  { name: "Overview",                      desc: "Welcome / overview page",              seq: 1 },
  { name: "Dashboard Overview",            desc: "Expense & Income dashboard",           seq: 2 },
  { name: "Sale Dashboard",                desc: "Sales and Invoice dashboard",          seq: 3 },
  { name: "Egg Dashboard",                 desc: "Egg production summary dashboard",     seq: 4 },
  { name: "Approval Dashboard",            desc: "Purchase approval dashboard",          seq: 5 },

  // ── Voucher Entry ──
  { name: "Home Voucher",                  desc: "Home voucher entry table",             seq: 6 },
  { name: "Receive Voucher",               desc: "Receive voucher entry",                seq: 7 },
  { name: "Payment Voucher",               desc: "Payment voucher entry",                seq: 8 },
  { name: "Journal Voucher",               desc: "Journal voucher entry",                seq: 9 },
  { name: "Cash Transfer",                 desc: "Cash transfer entry",                  seq: 10 },

  // ── Production ──
  { name: "Egg Production",                desc: "Egg production records",               seq: 11 },
  { name: "Sale Invoice",                  desc: "Sale invoice management",              seq: 12 },
  { name: "Purchase Recognition",          desc: "Purchase recognition (PR) records",    seq: 13 },
  { name: "Chicken Project",               desc: "Chicken project records",              seq: 14 },
  { name: "Cow Project",                   desc: "Cow project records",                  seq: 15 },
  { name: "Fish Project",                  desc: "Fish project records",                 seq: 16 },
  { name: "Farm Calendar",                 desc: "Farm calendar & activity log",         seq: 17 },
  { name: "Farm Budget",                   desc: "Farm budget planning",                 seq: 18 },
  { name: "Project Profile",               desc: "Farm project management",              seq: 19 },

  // ── Inventory ──
  { name: "Inventory",                     desc: "Inventory management",                 seq: 20 },
  { name: "Dispatch",                      desc: "Inventory dispatch / requisition",     seq: 21 },
  { name: "Item Stock",                    desc: "Item stock overview",                  seq: 22 },

  // ── Account Report ──
  { name: "Income Expense Voucher Report", desc: "Income & expense voucher report",      seq: 23 },
  { name: "Expense Report",                desc: "Expense statement report",             seq: 24 },
  { name: "Income Report",                 desc: "Income statement report",              seq: 25 },
  { name: "Sale Report",                   desc: "Sale expense report",                  seq: 26 },
  { name: "General Ledger",                desc: "General ledger report",                seq: 27 },
  { name: "Trail Balance",                 desc: "Trial balance report",                 seq: 28 },
  { name: "Cash Flow",                     desc: "Cash flow statement report",           seq: 29 },
  { name: "Project Profile Report",        desc: "Project profile report",               seq: 30 },
  { name: "Farm Calendar Report",          desc: "Farm calendar report",                 seq: 31 },

  // ── Inventory Report ──
  { name: "Daily Expense Report",          desc: "Daily expense report",                 seq: 32 },
  { name: "Daily Income Report",           desc: "Daily income report",                  seq: 33 },
  { name: "Ledger",                        desc: "Ledger report",                        seq: 34 },
  { name: "Cash Book",                     desc: "Cash book report",                     seq: 35 },

  // ── Setup ──
  { name: "Chart Account",                 desc: "Chart of accounts setup",              seq: 36 },
  { name: "Customer",                      desc: "Customer information setup",           seq: 37 },
  { name: "Supplier",                      desc: "Supplier information setup",           seq: 38 },
  { name: "Item",                          desc: "Item master setup",                    seq: 39 },
  { name: "Farm Type",                     desc: "Farm type setup",                      seq: 40 },

  // ── User Management ──
  { name: "User Management",               desc: "User accounts management",             seq: 41 },
  { name: "Module",                        desc: "RBAC module definitions",              seq: 42 },
  { name: "Role",                          desc: "RBAC role definitions",                seq: 43 },
  { name: "Permission",                    desc: "RBAC permission definitions",          seq: 44 },
];

// ── Actions per module ──────────────────────────────────────────────────
// Standard set: VIEW, CREATE, EDIT, DELETE, DOWNLOAD.
const DEFAULT_ACTIONS = [
  { code: "VIEW",     name: "View" },
  { code: "CREATE",   name: "Create" },
  { code: "EDIT",     name: "Edit" },
  { code: "DELETE",   name: "Delete" },
  { code: "DOWNLOAD", name: "Download" },
];

// "Receive Voucher" -> "RECEIVE_VOUCHER" (must match toModulePrefix() on the frontend)
const toModulePrefix = (moduleName) =>
  moduleName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const seedRbacData = async () => {
  let conn;
  try {
    conn = await getConnection();

    // ── MODULES ──
    const moduleMap = {};
    console.log("📦 Inserting Modules...");
    for (const m of modulesData) {
      const existing = await conn.execute(
        `SELECT ID FROM BWA.MODULES WHERE MODULE_NAME = :1`, [m.name]
      );
      if (existing.rows.length > 0) {
        moduleMap[m.name] = existing.rows[0][0];
        console.log(`  - Module '${m.name}' already exists → ID ${moduleMap[m.name]}. Skipping.`);
        continue;
      }
      const result = await conn.execute(
        `INSERT INTO BWA.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
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

    // ── PERMISSIONS (VIEW/CREATE/EDIT/DELETE/DOWNLOAD per module) ──
    console.log("\n🔑 Inserting Permissions...");
    let total = 0;
    for (const m of modulesData) {
      const modId = moduleMap[m.name];
      const prefix = toModulePrefix(m.name);

      for (const action of DEFAULT_ACTIONS) {
        const code = `${prefix}_${action.code}`;
        const name = `${m.name} ${action.name}`;

        const existing = await conn.execute(
          `SELECT ID FROM BWA.PERMISSIONS WHERE PERMISSION_CODE = :1`, [code]
        );
        if (existing.rows.length > 0) {
          console.log(`  - Permission '${code}' already exists. Skipping.`);
          continue;
        }

        await conn.execute(
          `INSERT INTO BWA.PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
           VALUES (:mod_id, :p_code, :p_name, :p_desc)`,
          { mod_id: modId, p_code: code, p_name: name, p_desc: `${action.name} access for ${m.name}.` }
        );
        console.log(`  ✓ [${m.name}] ${code}`);
        total++;
      }
    }

    await conn.commit();
    console.log(`\n✅ RBAC Seed Complete: ${modulesData.length} Modules, ${total} Permissions inserted.`);
    console.log("  Next step: assign permissions to roles (ROLE_PERMISSIONS) — not done by this script.");

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