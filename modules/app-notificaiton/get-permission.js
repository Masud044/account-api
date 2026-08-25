import { getConnection, oracledb } from '../../config/db.js';

// ─── Get all USER_IDs who hold a given permission ───────────────────────────
// Covers BOTH paths:
//   1) Role-based: USER_ROLES -> ROLE_PERMISSIONS -> PERMISSIONS
//   2) Direct:     USER_PERMISSIONS -> PERMISSIONS  (individual override)
// permissionCode e.g. 'PURCHASE_RECOGNITION_EDIT' (matches PERMISSIONS.PERMISSION_CODE)
export const getUserIdsByPermission = async (permissionCode) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DISTINCT USER_ID FROM (
         -- role-based
         SELECT ur.USER_ID
         FROM BWA.USER_ROLES ur
         JOIN BWA.ROLE_PERMISSIONS rp ON rp.ROLE_ID = ur.ROLE_ID
         JOIN BWA.PERMISSIONS p       ON p.ID = rp.PERMISSION_ID
         WHERE p.PERMISSION_CODE = :permissionCode

         UNION

         -- direct user-level override
         SELECT up.USER_ID
         FROM BWA.USER_PERMISSIONS up
         JOIN BWA.PERMISSIONS p ON p.ID = up.PERMISSION_ID
         WHERE p.PERMISSION_CODE = :permissionCode
       )`,
      { permissionCode },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows.map((r) => r.USER_ID);
  } finally {
    await conn.close();
  }
};