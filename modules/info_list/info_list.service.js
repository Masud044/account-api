import { withConnection } from "../../config/db.js";

export async function getInfoList() {
  return withConnection(async (conn) => {
    // --- 1. Fetch all unposted vouchers from GLMASTER ---
    const masterResult = await conn.execute(
      // "SELECT * FROM GLMASTER WHERE POSTED = 0 ORDER BY ID DESC",
      "SELECT * FROM GLMASTER ORDER BY ID DESC",
      {},
      { outFormat: 4002 }
    );

    const vouchers = [];

    // --- 2. For each voucher check debit/credit balance ---
    for (const row of masterResult.rows || []) {
      const balResult = await conn.execute(
        `SELECT SUM(DEBIT) AS DBT, SUM(CREDIT) AS CDT
         FROM GLDETAILS
         WHERE GLMASTERID = :id`,
        { id: row.ID },
        { outFormat: 4002 }
      );

      const bal         = balResult.rows?.[0];
      const totalDebit  = bal?.DBT  != null ? Number(bal.DBT)  : 0;
      const totalCredit = bal?.CDT  != null ? Number(bal.CDT)  : 0;

      vouchers.push({
        ...row,
        TOTAL_DEBIT:  totalDebit,
        TOTAL_CREDIT: totalCredit,
        IS_BALANCED:  totalDebit === totalCredit,
      });
    }

    return {
      record_count: vouchers.length,
      vouchers,
    };
  });
}
