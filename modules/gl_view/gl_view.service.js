// import { withConnection } from "../../config/db.js";

// export async function getGlById(id) {
//   return withConnection(async (conn) => {
//     // --- 1. Fetch GLMASTER record ---
//     const masterResult = await conn.execute(
//       "SELECT * FROM GLMASTER WHERE ID = :id",
//       { id: Number(id) },
//       { outFormat: 4002 }
//     );

//     const master = masterResult.rows?.[0];
//     if (!master) return null;

//     // --- 2. Fetch GLDETAILS joined with CHART_OF_ACCOUNT ---
//     const detailResult = await conn.execute(
//       `SELECT GD.*, COA.ACCOUNT_NAME
//        FROM GLDETAILS GD
//        JOIN CHART_OF_ACCOUNT COA ON GD.CODE = COA.ACCOUNT_ID
//        WHERE GD.GLMASTERID = :id
//        ORDER BY GD.ID ASC`,
//       { id: Number(id) },
//       { outFormat: 4002 }
//     );

//     return {
//       master,
//       details: detailResult.rows || [],
//     };
//   });
// }

import { withConnection, oracledb } from "../../config/db.js";

export async function getGlById(id) {
  return withConnection(async (conn) => {
    // ── 1. Fetch GLMASTER ─────────────────────────────────────────────
    const masterResult = await conn.execute(
      `SELECT
         ID,
         TO_CHAR(TRANS_DATE,    'YYYY-MM-DD') AS TRANS_DATE,
         TO_CHAR(GL_ENTRY_DATE, 'YYYY-MM-DD') AS GL_ENTRY_DATE,
         VOUCHER_TYPE,
         VOUCHERNO,
         DESCRIPTION,
         SUPPORTING,
         POSTED
       FROM GLMASTER
       WHERE ID = :id`,
      { id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const master = masterResult.rows?.[0];
    if (!master) return null;

    // ── 2. Fetch GLDETAILS ────────────────────────────────────────────
   // gl_view.service.js
const detailResult = await conn.execute(
  `SELECT
     GD.ID,
     GD.GLMASTERID,
     GD.CODE,
     GD.DEBIT,
     GD.CREDIT,
     GD.CODEDESCRIPTION,
     GD.DESCRIPTION,
     (SELECT COA.ACCOUNT_NAME 
      FROM CHART_OF_ACCOUNT COA 
      WHERE COA.ACCOUNT_ID = GD.CODE 
      AND ROWNUM = 1) AS ACCOUNT_NAME   -- ✅ ROWNUM=1 দিয়ে duplicate বন্ধ
   FROM GLDETAILS GD
   WHERE GD.GLMASTERID = :id
   ORDER BY GD.ID ASC`,
  { id: Number(id) },
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);

    return {
      master,
      details: detailResult.rows || [],
    };
  });
}