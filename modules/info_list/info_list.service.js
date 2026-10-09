// import { withConnection } from "../../config/db.js";

// export async function getInfoList() {
//   return withConnection(async (conn) => {
//     // --- 1. Fetch all unposted vouchers from GLMASTER ---
//     const masterResult = await conn.execute(
//       // "SELECT * FROM GLMASTER WHERE POSTED = 0 ORDER BY ID DESC",
//       // "SELECT * FROM GLMASTER ORDER BY ID DESC",
//       "SELECT * FROM GLMASTER ORDER BY GL_ENTRY_DATE DESC",
//       {},
//       { outFormat: 4002 }
//     );

//     const vouchers = [];

//     // --- 2. For each voucher check debit/credit balance ---
//     for (const row of masterResult.rows || []) {
//       const balResult = await conn.execute(
//         `SELECT SUM(DEBIT) AS DBT, SUM(CREDIT) AS CDT
//          FROM GLDETAILS
//          WHERE GLMASTERID = :id`,
//         { id: row.ID },
//         { outFormat: 4002 }
//       );

//       const bal         = balResult.rows?.[0];
//       const totalDebit  = bal?.DBT  != null ? Number(bal.DBT)  : 0;
//       const totalCredit = bal?.CDT  != null ? Number(bal.CDT)  : 0;

//       vouchers.push({
//         ...row,
//         TOTAL_DEBIT:  totalDebit,
//         TOTAL_CREDIT: totalCredit,
//         IS_BALANCED:  totalDebit === totalCredit,
//       });
//     }

//     return {
//       record_count: vouchers.length,
//       vouchers,
//     };
//   });
// }
import { withConnection } from "../../config/db.js";

export async function getInfoList() {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `SELECT m.*,
              NVL(d.DBT, 0) AS TOTAL_DEBIT,
              NVL(d.CDT, 0) AS TOTAL_CREDIT,
              NVL(dc.CNT, 0) AS DOC_COUNT
         FROM GLMASTER m
         LEFT JOIN (
               SELECT GLMASTERID,
                      SUM(DEBIT)  AS DBT,
                      SUM(CREDIT) AS CDT
                 FROM GLDETAILS
                GROUP BY GLMASTERID
              ) d  ON d.GLMASTERID = m.ID
         LEFT JOIN (
               SELECT GLMASTERID, COUNT(*) AS CNT
                 FROM GLDOC
                GROUP BY GLMASTERID
              ) dc ON dc.GLMASTERID = m.ID
        ORDER BY m.GL_ENTRY_DATE DESC`,
      {},
      { outFormat: 4002 }
    );

    const vouchers = (result.rows || []).map((row) => {
      const totalDebit = Number(row.TOTAL_DEBIT || 0);
      const totalCredit = Number(row.TOTAL_CREDIT || 0);
      return {
        ...row,
        TOTAL_DEBIT: totalDebit,
        TOTAL_CREDIT: totalCredit,
        DOC_COUNT: Number(row.DOC_COUNT || 0),
        IS_BALANCED: Math.abs(totalDebit - totalCredit) < 0.005,
      };
    });

    return { record_count: vouchers.length, vouchers };
  });
}