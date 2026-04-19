import { withConnection, oracledb } from "../../config/db.js";

export async function getConnectionHealth() {
  return withConnection(async (connection) => {
    const result = await connection.execute("SELECT 1 AS ok FROM dual", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return { connected: true, result: result.rows[0] };
  });
}

export async function getConfigInfo() {
  return {
    dbhost: "localhost",
    dbport: "1521",
    dbname: "RS",
    dbuser: "BWAL"
  };
}
