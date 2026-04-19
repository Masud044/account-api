import { withConnection, oracledb } from "../../config/db.js";

export async function healthCheck() {
  return withConnection(async (connection) => {
    const result = await connection.execute("SELECT 'ok' status FROM dual", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows[0];
  });
}
