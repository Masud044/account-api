// seedRole.js — Account API
// Roles: Admin, Inventory
// Run this FIRST before seedRBAC.js and seedRolePermissions.js

import { getConnection } from "./config/db.js";

export const seedRoles = async () => {
  let conn;
  try {
    conn = await getConnection();

    const rolesData = [
      {
        name: "Admin",
        desc: "Full system access — Accounting, GL, Reports, Dashboard, and Inventory management.",
      },
      {
        name: "Inventory",
        desc: "Inventory management access only — Items, Stock, Stores, UOM, Types, and Requisitions.",
      },
    ];

    console.log("🚀 Processing System Roles...");

    for (const r of rolesData) {
      const checkRes = await conn.execute(
        `SELECT ID FROM HCM.ROLES WHERE ROLE_NAME = :1`,
        [r.name]
      );

      if (checkRes.rows.length === 0) {
        await conn.execute(
          `INSERT INTO HCM.ROLES (ROLE_NAME, DESCRIPTION) VALUES (:1, :2)`,
          [r.name, r.desc]
        );
        console.log(`  + Role '${r.name}' inserted successfully.`);
      } else {
        console.log(`  - Role '${r.name}' already exists. Skipping.`);
      }
    }

    await conn.commit();
    console.log("✅ Roles seeding completed.");
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Critical Role Seed Failure:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    await seedRoles();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();