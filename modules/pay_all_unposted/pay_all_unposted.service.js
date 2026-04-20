import { withConnection } from "../../config/db.js";

export async function getAllUnpostedPayments() {
  const sql = `
    SELECT
      H.ID,
      H.VOUCHERNO,
      H.DESCRIPTION,
       TO_CHAR(H.TRANS_DATE, 'YYYY-MM-DD') AS TRANS_DATE,
  TO_CHAR(H.GL_ENTRY_DATE, 'YYYY-MM-DD') AS GL_ENTRY_DATE,
      SUM(L.CREDIT) AS CREDIT
    FROM GLDETAILS L
    JOIN GLMASTER H ON H.ID = L.GLMASTERID
    WHERE H.VOUCHER_TYPE = 2
      AND H.POSTED = 0
    GROUP BY H.ID, H.VOUCHERNO, H.DESCRIPTION, H.TRANS_DATE, H.GL_ENTRY_DATE
    ORDER BY H.TRANS_DATE DESC
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, {}, { outFormat: 4002 });
    const rows = (result.rows || []).map((r) => ({
      ...r,
      CREDIT: r.CREDIT != null ? Number(r.CREDIT) : 0,
    }));
    return { count: rows.length, data: rows };
  });
}
