import { getConnection } from '../../config/db.js';
import oracledb from 'oracledb';

// Income Statement - Income/Revenue/Sales accounts breakdown
export const getIncomeStatement = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
             C.FULL_PATH ACCOUNT_HEAD,
             SUM(NVL(L.CREDIT,0) - NVL(L.DEBIT,0)) AMOUNT
        FROM GLMASTER H
        JOIN GLDETAILS L ON H.ID = L.GLMASTERID
        JOIN COA C ON L.CODE = C.ACCOUNT_ID
       WHERE H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
         AND (
                UPPER(C.FULL_PATH) LIKE '%INCOME%'
             OR UPPER(C.FULL_PATH) LIKE '%REVENUE%'
             OR UPPER(C.FULL_PATH) LIKE '%SALES%'
             )
       GROUP BY C.FULL_PATH
       ORDER BY C.FULL_PATH
    `;

    const binds = {
      P_FROM_DATE: new Date(fromDate),
      P_TO_DATE: new Date(toDate),
    };

    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

// Expense Statement - Expense accounts breakdown
export const getExpenseStatement = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
             C.FULL_PATH ACCOUNT_HEAD,
             SUM(NVL(L.DEBIT,0) - NVL(L.CREDIT,0)) AMOUNT
        FROM GLMASTER H
        JOIN GLDETAILS L ON H.ID = L.GLMASTERID
        JOIN COA C ON L.CODE = C.ACCOUNT_ID
       WHERE H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
         AND UPPER(C.FULL_PATH) LIKE '%EXPENSE%'
       GROUP BY C.FULL_PATH
       ORDER BY C.FULL_PATH
    `;

    const binds = {
      P_FROM_DATE: new Date(fromDate),
      P_TO_DATE: new Date(toDate),
    };

    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

