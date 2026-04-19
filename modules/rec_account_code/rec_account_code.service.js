import { withConnection } from "../../config/db.js";

export async function getRecAccountCodes() {
  const sql = `
    SELECT ACCOUNT_ID, ACCOUNT_NAME
    FROM CHART_OF_ACCOUNT
    WHERE LASTLEVEL = 1
      AND (SUBSTR(ACCOUNT_ID, 1, 1) = '4' OR SUBSTR(ACCOUNT_ID, 1, 1) = '2')
    ORDER BY ACCOUNT_ID
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, {}, { outFormat: 4002 });
    return { count: result.rows.length, data: result.rows };
  });
}
