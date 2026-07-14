import { getConnection } from '../../config/db.js';
import oracledb from 'oracledb';

export const getTrialBalance = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const sql = `
      WITH TB AS (
        SELECT L.CODE,
               C.FULL_PATH AS ACCOUNT_NAME,
               SUM(CASE WHEN H.GL_ENTRY_DATE < :P_FROM_DATE THEN NVL(L.DEBIT,0) ELSE 0 END)  OPEN_DR,
               SUM(CASE WHEN H.GL_ENTRY_DATE < :P_FROM_DATE THEN NVL(L.CREDIT,0) ELSE 0 END) OPEN_CR,
               SUM(CASE WHEN H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE THEN NVL(L.DEBIT,0) ELSE 0 END)  PERIOD_DR,
               SUM(CASE WHEN H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE THEN NVL(L.CREDIT,0) ELSE 0 END) PERIOD_CR
        FROM GLMASTER H
        JOIN GLDETAILS L ON H.ID = L.GLMASTERID
        JOIN COA C ON L.CODE = C.ACCOUNT_ID
        GROUP BY L.CODE, C.FULL_PATH
      )
      SELECT CODE,
             ACCOUNT_NAME,
             CASE WHEN (OPEN_DR - OPEN_CR) > 0 THEN (OPEN_DR - OPEN_CR) ELSE 0 END OPENING_DR,
             CASE WHEN (OPEN_CR - OPEN_DR) > 0 THEN (OPEN_CR - OPEN_DR) ELSE 0 END OPENING_CR,
             PERIOD_DR,
             PERIOD_CR,
             CASE
                 WHEN ((OPEN_DR + PERIOD_DR) - (OPEN_CR + PERIOD_CR)) > 0
                 THEN ((OPEN_DR + PERIOD_DR) - (OPEN_CR + PERIOD_CR))
                 ELSE 0
             END CLOSING_DR,
             CASE
                 WHEN ((OPEN_CR + PERIOD_CR) - (OPEN_DR + PERIOD_DR)) > 0
                 THEN ((OPEN_CR + PERIOD_CR) - (OPEN_DR + PERIOD_DR))
                 ELSE 0
             END CLOSING_CR
      FROM TB
      ORDER BY CODE
    `;

    const binds = {
      P_FROM_DATE: new Date(fromDate),
      P_TO_DATE:   new Date(toDate),
    };

    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};