import { withConnection, oracledb } from "../../config/db.js";

export async function listCashAllUnposted() {
  return withConnection(async (connection) => {
    const sql = `SELECT H.ID, H.VOUCHERNO, H.DESCRIPTION,
      TO_CHAR(H.TRANS_DATE, 'YYYY-MM-DD') AS TRANS_DATE,
      TO_CHAR(H.GL_ENTRY_DATE, 'YYYY-MM-DD') AS GL_ENTRY_DATE,
      SUM(L.DEBIT) AS DEBIT, SUM(L.CREDIT) AS CREDIT
      FROM GLDETAILS L JOIN GLMASTER H ON H.ID = L.GLMASTERID
      WHERE H.VOUCHER_TYPE = 4 AND H.POSTED = 0
      GROUP BY H.ID, H.VOUCHERNO, H.DESCRIPTION, H.TRANS_DATE, H.GL_ENTRY_DATE
      ORDER BY H.TRANS_DATE DESC`;
    const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  });
}
