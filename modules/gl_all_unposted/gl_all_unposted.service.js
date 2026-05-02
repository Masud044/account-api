import { withConnection } from "../../config/db.js";

export async function getAllUnpostedGl() {
  const sql = `
    SELECT
      H.ID,
      H.VOUCHERNO,
      H.DESCRIPTION,
      H.POSTED,
      H.TRANS_DATE,
      H.GL_ENTRY_DATE,
      SUM(L.DEBIT)   AS DEBIT,
      SUM(L.CREDIT)  AS CREDIT
    FROM GLDETAILS L
    JOIN GLMASTER H ON H.ID = L.GLMASTERID
    WHERE H.VOUCHER_TYPE = 3
      
    GROUP BY H.ID, H.VOUCHERNO, H.DESCRIPTION,H.POSTED, H.TRANS_DATE, H.GL_ENTRY_DATE
    ORDER BY H.TRANS_DATE DESC
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, {}, { outFormat: 4002 });
    const rows = (result.rows || []).map((row) => ({
      ...row,
      DEBIT:  row.DEBIT  != null ? Number(row.DEBIT)  : 0,
      CREDIT: row.CREDIT != null ? Number(row.CREDIT) : 0,
    }));
    return { count: rows.length, data: rows };
  });
}
