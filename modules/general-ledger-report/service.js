import { getConnection } from '../../config/db.js';
import oracledb from 'oracledb';

export const getGeneralLedger = async (fromDate, toDate, accountCode = null) => {
  const conn = await getConnection();
  try {
    const sql = `
      WITH OPENING AS (
        SELECT L.CODE,
               SUM(NVL(L.DEBIT, 0) - NVL(L.CREDIT, 0)) OPENING_BAL
        FROM GLMASTER H
        JOIN GLDETAILS L ON H.ID = L.GLMASTERID
        WHERE H.GL_ENTRY_DATE < :P_FROM_DATE
          AND (:P_ACCOUNT_CODE IS NULL OR L.CODE = :P_ACCOUNT_CODE)
        GROUP BY L.CODE
      ),
      GL_DATA AS (
        SELECT H.GL_ENTRY_DATE,
               L.CODE,
               C.FULL_PATH AS ACCOUNT_NAME,
               H.DESCRIPTION,
               NVL(L.DEBIT, 0)  DEBIT,
               NVL(L.CREDIT, 0) CREDIT
        FROM GLMASTER H
        JOIN GLDETAILS L ON H.ID = L.GLMASTERID
        JOIN COA C ON L.CODE = C.ACCOUNT_ID
        WHERE H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
          AND (:P_ACCOUNT_CODE IS NULL OR L.CODE = :P_ACCOUNT_CODE)
      )
      SELECT G.GL_ENTRY_DATE,
             G.CODE,
             G.ACCOUNT_NAME,
             G.DESCRIPTION,
             G.DEBIT,
             G.CREDIT,
             NVL(O.OPENING_BAL, 0)
             + SUM(G.DEBIT - G.CREDIT)
                   OVER (PARTITION BY G.CODE
                         ORDER BY G.GL_ENTRY_DATE
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) BALANCE
      FROM GL_DATA G
      LEFT JOIN OPENING O ON G.CODE = O.CODE
      ORDER BY G.CODE, G.GL_ENTRY_DATE
    `;

    const binds = {
      P_FROM_DATE:    new Date(fromDate),
      P_TO_DATE:      new Date(toDate),
      P_ACCOUNT_CODE: accountCode || null,
    };

    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};