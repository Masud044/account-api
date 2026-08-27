// import { withConnection } from "../../config/db.js";

// export async function getAllUnpostedReceipts() {
//   const sql = `
//     SELECT
//       H.ID,
//       H.VOUCHERNO,
//       H.DESCRIPTION,
//       H.POSTED,
//       TO_CHAR(H.TRANS_DATE, 'YYYY-MM-DD') AS TRANS_DATE,
//   TO_CHAR(H.GL_ENTRY_DATE, 'YYYY-MM-DD') AS GL_ENTRY_DATE,
//       SUM(L.CREDIT) AS CREDIT
//     FROM GLDETAILS L
//     JOIN GLMASTER H ON H.ID = L.GLMASTERID
//     WHERE H.VOUCHER_TYPE = 1
     
//     GROUP BY H.ID, H.VOUCHERNO, H.DESCRIPTION,H.POSTED, H.TRANS_DATE, H.GL_ENTRY_DATE
//     ORDER BY H.TRANS_DATE DESC
//   `;

//   return withConnection(async (conn) => {
//     const result = await conn.execute(sql, {}, { outFormat: 4002 });
//     const rows = (result.rows || []).map((r) => ({
//       ...r,
//       CREDIT: r.CREDIT != null ? Number(r.CREDIT) : 0,
//     }));
//     return { count: rows.length, data: rows };
//   });
// }


import { withConnection } from "../../config/db.js";

export async function getAllUnpostedReceipts() {
  const sql = `
    SELECT
      H.ID,
      H.VOUCHERNO,
      H.DESCRIPTION,
      H.POSTED,
      H.TYPE,
      H.REF_REVERSE_ENTRY,
      TO_CHAR(H.TRANS_DATE, 'YYYY-MM-DD') AS TRANS_DATE,
      TO_CHAR(H.GL_ENTRY_DATE, 'YYYY-MM-DD') AS GL_ENTRY_DATE,
      SUM(L.CREDIT) AS CREDIT
    FROM GLDETAILS L
    JOIN GLMASTER H ON H.ID = L.GLMASTERID
    WHERE H.VOUCHER_TYPE = 1
    GROUP BY
      H.ID,
      H.VOUCHERNO,
      H.DESCRIPTION,
      H.POSTED,
      H.TYPE,
      H.REF_REVERSE_ENTRY,
      H.TRANS_DATE,
      H.GL_ENTRY_DATE
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