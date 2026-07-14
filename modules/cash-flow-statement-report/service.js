import { getConnection } from '../../config/db.js';
import oracledb from 'oracledb';

// Cash Flow Statement - Monthly summary
export const getCashFlowStatement = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT TO_CHAR(H.GL_ENTRY_DATE, 'MON-YYYY') PERIOD,
             SUM(CASE WHEN C.ROOT_ACCOUNT = 'Income'
                      THEN NVL(L.CREDIT,0) - NVL(L.DEBIT,0)
                      ELSE 0 END) CASH_INFLOW,
             SUM(CASE WHEN C.ROOT_ACCOUNT = 'Expense'
                      THEN NVL(L.DEBIT,0) - NVL(L.CREDIT,0)
                      ELSE 0 END) CASH_OUTFLOW,
             SUM(CASE WHEN C.ROOT_ACCOUNT = 'Income'
                      THEN NVL(L.CREDIT,0) - NVL(L.DEBIT,0)
                      ELSE 0 END)
           - SUM(CASE WHEN C.ROOT_ACCOUNT = 'Expense'
                      THEN NVL(L.DEBIT,0) - NVL(L.CREDIT,0)
                      ELSE 0 END) NET_CASH_FLOW
        FROM GLMASTER H
        JOIN GLDETAILS L ON H.ID = L.GLMASTERID
        JOIN COA C ON L.CODE = C.ACCOUNT_ID
       WHERE H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
       GROUP BY TO_CHAR(H.GL_ENTRY_DATE, 'MON-YYYY'),
                TO_CHAR(H.GL_ENTRY_DATE, 'YYYYMM')
       ORDER BY TO_CHAR(H.GL_ENTRY_DATE, 'YYYYMM')
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

// Cash Flow Details - Category-wise breakdown
export const getCashFlowDetails = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT CATEGORY, SUM(AMOUNT) AMOUNT
        FROM (
              SELECT C.ACCOUNT_NAME CATEGORY,
                     SUM(NVL(L.CREDIT,0) - NVL(L.DEBIT,0)) AMOUNT
                FROM GLMASTER H
                JOIN GLDETAILS L ON H.ID = L.GLMASTERID
                JOIN COA C ON L.CODE = C.ACCOUNT_ID
               WHERE C.ROOT_ACCOUNT = 'Income'
                 AND H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
               GROUP BY C.ACCOUNT_NAME
              UNION ALL
              SELECT C.ACCOUNT_NAME CATEGORY,
                     -SUM(NVL(L.DEBIT,0) - NVL(L.CREDIT,0)) AMOUNT
                FROM GLMASTER H
                JOIN GLDETAILS L ON H.ID = L.GLMASTERID
                JOIN COA C ON L.CODE = C.ACCOUNT_ID
               WHERE C.ROOT_ACCOUNT = 'Expense'
                 AND H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
               GROUP BY C.ACCOUNT_NAME
             )
       GROUP BY CATEGORY
       ORDER BY CATEGORY
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


// Cash Flow Summary - Operating Inflow/Outflow + Net + Opening/Closing Balance
export const getCashFlowSummary = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const sql = `
      WITH CF AS (
        SELECT
          SUM(CASE WHEN H.GL_ENTRY_DATE < :P_FROM_DATE AND C.ROOT_ACCOUNT = 'Income'
                   THEN NVL(L.CREDIT,0) - NVL(L.DEBIT,0) ELSE 0 END) OPEN_INCOME,
          SUM(CASE WHEN H.GL_ENTRY_DATE < :P_FROM_DATE AND C.ROOT_ACCOUNT = 'Expense'
                   THEN NVL(L.DEBIT,0) - NVL(L.CREDIT,0) ELSE 0 END) OPEN_EXPENSE,
          SUM(CASE WHEN H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE AND C.ROOT_ACCOUNT = 'Income'
                   THEN NVL(L.CREDIT,0) - NVL(L.DEBIT,0) ELSE 0 END) PERIOD_INFLOW,
          SUM(CASE WHEN H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE AND C.ROOT_ACCOUNT = 'Expense'
                   THEN NVL(L.DEBIT,0) - NVL(L.CREDIT,0) ELSE 0 END) PERIOD_OUTFLOW
        FROM GLMASTER H
        JOIN GLDETAILS L ON H.ID = L.GLMASTERID
        JOIN COA C ON L.CODE = C.ACCOUNT_ID
      )
      SELECT 'Opening Cash Balance' LINE_NAME, (OPEN_INCOME - OPEN_EXPENSE) AMOUNT, 1 SORT_ORDER FROM CF
      UNION ALL
      SELECT 'Operating Cash Inflow', PERIOD_INFLOW, 2 FROM CF
      UNION ALL
      SELECT 'Operating Cash Outflow', PERIOD_OUTFLOW, 3 FROM CF
      UNION ALL
      SELECT 'Net Cash Flow', (PERIOD_INFLOW - PERIOD_OUTFLOW), 4 FROM CF
      UNION ALL
      SELECT 'Closing Cash Balance', (OPEN_INCOME - OPEN_EXPENSE) + (PERIOD_INFLOW - PERIOD_OUTFLOW), 5 FROM CF
      ORDER BY 3
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