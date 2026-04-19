import { withConnection, oracledb } from "../../config/db.js";

export async function createAdminUser(data) {
  return withConnection(async (connection) => {
    await connection.execute(
      `INSERT INTO BWAL.ADMINUSER (USERNAME, PASSWORD, ADDRESS, STATUS, FIRSTNAME, LASTNAME, SUPERADMIN, IP, DEPT, POSITION, AUTHER, INVENTORY, BUYER, UNIT_ID)
       VALUES (:USERNAME, :PASSWORD, :ADDRESS, :STATUS, :FIRSTNAME, :LASTNAME, :SUPERADMIN, :IP, :DEPT, :POSITION, :AUTHER, :INVENTORY, :BUYER, :UNIT_ID)`,
      data,
      { autoCommit: true }
    );
  });
}

export async function listAdminUser(id) {
  return withConnection(async (connection) => {
    const sql = id ? "SELECT * FROM BWAL.ADMINUSER WHERE ID = :id" : "SELECT * FROM BWAL.ADMINUSER ORDER BY ID";
    const result = await connection.execute(sql, id ? { id: Number(id) } : {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  });
}

export async function updateAdminUser(data) {
  return withConnection(async (connection) => {
    const id = Number(data.ID);
    const fields = Object.entries(data).filter(([k, v]) => k !== "ID" && v !== null && v !== undefined);
    if (!fields.length) return 0;
    const sets = fields.map(([k], i) => `${k.toUpperCase()} = :v${i}`).join(", ");
    const binds = Object.fromEntries(fields.map(([_, v], i) => [`v${i}`, v]));
    binds.id = id;
    const result = await connection.execute(`UPDATE BWAL.ADMINUSER SET ${sets} WHERE ID = :id`, binds, { autoCommit: true });
    return result.rowsAffected || 0;
  });
}

export async function deleteAdminUser(id) {
  return withConnection(async (connection) => {
    const result = await connection.execute("DELETE FROM BWAL.ADMINUSER WHERE ID = :id", { id: Number(id) }, { autoCommit: true });
    return result.rowsAffected || 0;
  });
}
