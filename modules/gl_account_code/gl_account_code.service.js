import { withConnection, oracledb } from "../../config/db.js";

export async function getGlAccountCodes() {
  const sql = `
    SELECT ACCOUNT_ID, ACCOUNT_NAME
    FROM CHART_OF_ACCOUNT
    WHERE LASTLEVEL = 1
    ORDER BY ACCOUNT_ID
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, {},  { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return {
      count: result.rows.length,
      data: result.rows,
    };
  });
}
