import { withConnection, oracledb } from "../../config/db.js";

export async function searchAutocomplete(term = "") {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `SELECT NAME_ENG FROM BWAL.dhaka_014
       WHERE UPPER(NAME_ENG) LIKE :name AND ROWNUM <= 10`,
      { name: `%${String(term).trim().toUpperCase()}%` },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows.map((x) => x.NAME_ENG);
  });
}
