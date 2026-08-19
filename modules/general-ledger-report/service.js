// import { getConnection } from '../../config/db.js';
// import oracledb from 'oracledb';

// export const getGeneralLedger = async (fromDate, toDate, accountCode = null) => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       WITH OPENING AS (
//         SELECT L.CODE,
//                SUM(NVL(L.DEBIT, 0) - NVL(L.CREDIT, 0)) OPENING_BAL
//         FROM GLMASTER H
//         JOIN GLDETAILS L ON H.ID = L.GLMASTERID
//         WHERE H.GL_ENTRY_DATE < :P_FROM_DATE
//           AND (:P_ACCOUNT_CODE IS NULL OR L.CODE = :P_ACCOUNT_CODE)
//         GROUP BY L.CODE
//       ),
//       GL_DATA AS (
//         SELECT H.GL_ENTRY_DATE,
//                L.CODE,
//                C.FULL_PATH AS ACCOUNT_NAME,
//                H.DESCRIPTION,
//                NVL(L.DEBIT, 0)  DEBIT,
//                NVL(L.CREDIT, 0) CREDIT
//         FROM GLMASTER H
//         JOIN GLDETAILS L ON H.ID = L.GLMASTERID
//         JOIN COA C ON L.CODE = C.ACCOUNT_ID
//         WHERE H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
//           AND (:P_ACCOUNT_CODE IS NULL OR L.CODE = :P_ACCOUNT_CODE)
//       )
//       SELECT G.GL_ENTRY_DATE,
//              G.CODE,
//              G.ACCOUNT_NAME,
//              G.DESCRIPTION,
//              G.DEBIT,
//              G.CREDIT,
//              NVL(O.OPENING_BAL, 0)
//              + SUM(G.DEBIT - G.CREDIT)
//                    OVER (PARTITION BY G.CODE
//                          ORDER BY G.GL_ENTRY_DATE
//                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) BALANCE
//       FROM GL_DATA G
//       LEFT JOIN OPENING O ON G.CODE = O.CODE
//       ORDER BY G.CODE, G.GL_ENTRY_DATE
//     `;

//     const binds = {
//       P_FROM_DATE:    new Date(fromDate),
//       P_TO_DATE:      new Date(toDate),
//       P_ACCOUNT_CODE: accountCode || null,
//     };

//     const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };



import { getConnection } from '../../config/db.js';
import oracledb from 'oracledb';

export const getGeneralLedger = async (fromDate, toDate, accountCode = null) => {
  const conn = await getConnection();
  try {
    const sql = `
      WITH ANCESTORS (LEAF_ID, ANCESTOR_ID) AS (
        -- prottek account nijer o nijer sokol upor er (parent, grandparent...) ID
        SELECT ACCOUNT_ID, ACCOUNT_ID
        FROM COA
        UNION ALL
        SELECT A.LEAF_ID, C.PARENT_ACCOUNT_ID
        FROM ANCESTORS A
        JOIN COA C ON C.ACCOUNT_ID = A.ANCESTOR_ID
        WHERE C.PARENT_ACCOUNT_ID IS NOT NULL
      ),
      OPENING AS (
        SELECT AN.ANCESTOR_ID CODE,
               SUM(NVL(L.DEBIT, 0) - NVL(L.CREDIT, 0)) OPENING_BAL
        FROM GLMASTER H
        JOIN GLDETAILS L  ON H.ID = L.GLMASTERID
        JOIN ANCESTORS AN ON AN.LEAF_ID = L.CODE
        WHERE H.GL_ENTRY_DATE < :P_FROM_DATE
          AND (:P_ACCOUNT_CODE IS NULL OR AN.ANCESTOR_ID = :P_ACCOUNT_CODE)
        GROUP BY AN.ANCESTOR_ID
      ),
      GL_DATA AS (
        SELECT H.GL_ENTRY_DATE,
               AN.ANCESTOR_ID       AS CODE,
               C.FULL_PATH          AS ACCOUNT_NAME,
               H.DESCRIPTION,
               NVL(L.DEBIT, 0)      AS DEBIT,
               NVL(L.CREDIT, 0)     AS CREDIT
        FROM GLMASTER H
        JOIN GLDETAILS L  ON H.ID = L.GLMASTERID
        JOIN ANCESTORS AN ON AN.LEAF_ID = L.CODE
        JOIN COA C        ON C.ACCOUNT_ID = AN.ANCESTOR_ID
        WHERE H.GL_ENTRY_DATE BETWEEN :P_FROM_DATE AND :P_TO_DATE
          AND (:P_ACCOUNT_CODE IS NULL OR AN.ANCESTOR_ID = :P_ACCOUNT_CODE)
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