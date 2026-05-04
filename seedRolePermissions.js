// seedRolePermissions.js — Account API
// Maps permissions to roles:
//   Admin     → All 42 permissions (full access)
//   Inventory → 19 inventory permissions only
// Run AFTER: seedRole.js → seedRBAC.js → this file

import { getConnection } from "./config/db.js";

export const seedRolePermissions = async () => {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Fetch role IDs ─────────────────────────────────────────────────────
    const getRoleId = async (name) => {
      const res = await conn.execute(
        `SELECT ID FROM HCM.ROLES WHERE ROLE_NAME = :1`, [name]
      );
      if (res.rows.length === 0)
        throw new Error(`Role '${name}' not found. Run seedRole.js first.`);
      return res.rows[0][0];
    };

    const adminId     = await getRoleId("Admin");
    const inventoryId = await getRoleId("Inventory");

    console.log(`✅ Roles → Admin:${adminId}  Inventory:${inventoryId}`);

    // ── 2. Fetch all permissions: code → id ───────────────────────────────────
    const allPermsRes = await conn.execute(
      `SELECT ID, PERMISSION_CODE FROM HCM.PERMISSIONS`
    );
    const permMap = {};
    for (const [id, code] of allPermsRes.rows) {
      permMap[code] = id;
    }
    console.log(`✅ ${Object.keys(permMap).length} permissions loaded.\n`);

    // ── 3. Insert helper (duplicate-safe) ─────────────────────────────────────
    const assign = async (roleId, permCode) => {
      const permId = permMap[permCode];
      if (!permId) {
        console.warn(`  ⚠ Permission '${permCode}' not in DB. Skipping.`);
        return;
      }
      const check = await conn.execute(
        `SELECT 1 FROM HCM.ROLE_PERMISSIONS
          WHERE ROLE_ID = :1 AND PERMISSION_ID = :2`,
        [roleId, permId]
      );
      if (check.rows.length === 0) {
        await conn.execute(
          `INSERT INTO HCM.ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID, GRANTED_BY)
           VALUES (:1, :2, NULL)`,
          [roleId, permId]
        );
      }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // ADMIN — Full access to ALL 42 permissions
    // Dashboard + Main Entry + Main Report + Inventory
    // ═════════════════════════════════════════════════════════════════════════
    console.log("👑 Seeding ADMIN (full access to all permissions)...");
    for (const code of Object.keys(permMap)) {
      await assign(adminId, code);
    }
    console.log("  ✓ Admin — all permissions assigned.");

    // ═════════════════════════════════════════════════════════════════════════
    // INVENTORY — Only 19 inventory permissions
    // No access to Dashboard, Main Entry, or Main Report
    // ═════════════════════════════════════════════════════════════════════════
    console.log("\n📦 Seeding INVENTORY (inventory permissions only)...");
    const INVENTORY_PERMISSIONS = [
      "INV_VIEW",
      "INV_CREATE",
      "INV_UPDATE",
      "INV_DELETE",
      "ITEM_VIEW",
      "ITEM_CREATE",
      "ITEM_UPDATE",
      "ITEM_DELETE",
      "ITEM_STOCK_VIEW",
      "ITEM_STOCK_MANAGE",
      "STORE_VIEW",
      "STORE_MANAGE",
      "UOM_VIEW",
      "UOM_MANAGE",
      "INV_TYPE_VIEW",
      "INV_TYPE_MANAGE",
      "REQUISITION_VIEW",
      "REQUISITION_CREATE",
      "REQUISITION_APPROVE",
    ];

    for (const code of INVENTORY_PERMISSIONS) {
      await assign(inventoryId, code);
      console.log(`  ✓ ${code}`);
    }

    await conn.commit();

    // ── Summary ───────────────────────────────────────────────────────────────
    const countRes = await conn.execute(
      `SELECT r.ROLE_NAME, COUNT(rp.PERMISSION_ID) AS CNT
       FROM HCM.ROLES r
       LEFT JOIN HCM.ROLE_PERMISSIONS rp ON r.ID = rp.ROLE_ID
       WHERE r.ROLE_NAME IN ('Admin', 'Inventory')
       GROUP BY r.ROLE_NAME
       ORDER BY CNT DESC`
    );
    console.log("\n📊 Final Role–Permission Summary:");
    for (const [roleName, cnt] of countRes.rows) {
      console.log(`  ${String(roleName).padEnd(12)}: ${cnt} permissions`);
    }
    console.log("\n✅ Role–Permission Mapping Complete!");

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Mapping failed:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    await seedRolePermissions();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();