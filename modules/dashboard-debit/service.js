import { getConnection, oracledb } from '../../config/db.js';

// ─── Monthly Debit Summary by Account Code ────────────────────────────────
export const getMonthlyDebitByAccount = async (code) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         TO_CHAR(G.GL_ENTRY_DATE, 'YYYY-MM') AS MONTH_YEAR,
         SUM(G.DEBIT)                        AS TOTAL_DEBIT,
         C.ACCOUNT_NAME
       FROM GLDATA G, COA C
       WHERE G.CODE = :code
         AND G.CODE = C.ACCOUNT_ID
       GROUP BY TO_CHAR(G.GL_ENTRY_DATE, 'YYYY-MM'), C.ACCOUNT_NAME
       ORDER BY MONTH_YEAR`,
      { code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};


// ─── Cash Flow Summary (root account wise + grand total) ─────────────────────
export const getCashFlowSummary = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
          C.ROOT_ACCOUNT,
          C.ACCOUNT_NAME,
          NVL(SUM(L.DEBIT), 0)                         AS CASH_IN,
          NVL(SUM(L.CREDIT), 0)                        AS CASH_OUT,
          NVL(SUM(L.DEBIT), 0) - NVL(SUM(L.CREDIT), 0) AS NET_CASH_FLOW,
          CASE C.ROOT_ACCOUNT
              WHEN 'Asset'   THEN 1
              WHEN 'Income'  THEN 2
              WHEN 'Expense' THEN 3
              ELSE 4
          END AS ROOT_SORT_ORDER
       FROM GLDETAILS L
       JOIN GLMASTER H ON H.ID = L.GLMASTERID
       JOIN COA C      ON C.ACCOUNT_ID = L.CODE
       WHERE H.GL_ENTRY_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                                  AND TO_DATE(:toDate,   'YYYY-MM-DD')
       GROUP BY C.ROOT_ACCOUNT, C.ACCOUNT_NAME

       UNION ALL

       SELECT
          'ZZZ_TOTAL'                                   AS ROOT_ACCOUNT,
          'Grand Total (Net Cash Flow)'                 AS ACCOUNT_NAME,
          NVL(SUM(L.DEBIT), 0)                          AS CASH_IN,
          NVL(SUM(L.CREDIT), 0)                         AS CASH_OUT,
          NVL(SUM(L.DEBIT), 0) - NVL(SUM(L.CREDIT), 0)  AS NET_CASH_FLOW,
          99                                             AS ROOT_SORT_ORDER
       FROM GLDETAILS L
       JOIN GLMASTER H ON H.ID = L.GLMASTERID
       JOIN COA C      ON C.ACCOUNT_ID = L.CODE
       WHERE H.GL_ENTRY_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                                  AND TO_DATE(:toDate,   'YYYY-MM-DD')

       ORDER BY ROOT_SORT_ORDER, ACCOUNT_NAME`,
      { fromDate, toDate },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};