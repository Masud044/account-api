// import oracledb from 'oracledb';
// import { getConnection } from '../../config/db.js';


// export async function getExpenseReport(startDate, endDate) {
//   let connection;
//   try {
//     connection = await getConnection();

//     let query = `
//       SELECT ID,
//              VOUCHERNO,
//              DESCRIPTION,
//              GL_ENTRY_DATE,
//              DESCRIPTION || ' (' || CODE || ')' AS DESCRIPTION_WITH_CODE,
//              DEBIT AMOUNT
//       FROM GLDATA
//       WHERE DEBIT > 0
//         AND UPPER(VOUCHER_TYPE) = 'EXPENSE'
//     `;

//     const binds = {};

//     if (startDate) {
//       query += ` AND GL_ENTRY_DATE >= TO_DATE(:startDate, 'YYYY-MM-DD')`;
//       binds.startDate = startDate;
//     }

//     if (endDate) {
//       query += ` AND GL_ENTRY_DATE <= TO_DATE(:endDate, 'YYYY-MM-DD')`;
//       binds.endDate = endDate;
//     }

//     query += ` ORDER BY GL_ENTRY_DATE DESC, ID DESC`;

//     const result = await connection.execute(
//       query,
//       binds,
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return result.rows;
//   } finally {
//     if (connection) {
//       try {
//         await connection.close();
//       } catch (err) {
//         console.error('Error closing connection:', err);
//       }
//     }
//   }
// }



// export async function getIncomeReport(startDate, endDate) {
//   let connection;
//   try {
//     connection = await getConnection();

//     let query = `
//       SELECT ID,
//              VOUCHERNO,
//              DESCRIPTION,
//              GL_ENTRY_DATE,
//              DESCRIPTION || ' (' || CODE || ')' AS DESCRIPTION_WITH_CODE,
//              CREDIT AMOUNT
//       FROM GLDATA
//       WHERE CREDIT > 0
//         AND UPPER(VOUCHER_TYPE) = 'INCOME'
//     `;

//     const binds = {};

//     if (startDate) {
//       query += ` AND GL_ENTRY_DATE >= TO_DATE(:startDate, 'YYYY-MM-DD')`;
//       binds.startDate = startDate;
//     }

//     if (endDate) {
//       query += ` AND GL_ENTRY_DATE <= TO_DATE(:endDate, 'YYYY-MM-DD')`;
//       binds.endDate = endDate;
//     }

//     query += ` ORDER BY GL_ENTRY_DATE DESC, ID DESC`;

//     const result = await connection.execute(
//       query,
//       binds,
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return result.rows;
//   } finally {
//     if (connection) {
//       try {
//         await connection.close();
//       } catch (err) {
//         console.error('Error closing connection:', err);
//       }
//     }
//   }
// }

import oracledb from 'oracledb';
import { getConnection } from '../../config/db.js';

// Dashboard er shathe same voucher type
const EXPENSE_VOUCHER_TYPE = 2;
const INCOME_VOUCHER_TYPE = 1; // TODO: dashboard er income service er voucher type diye confirm koro

// Reverse pair + refunded entry bad
const BASE_WHERE = `
  H.VOUCHER_TYPE = :voucherType
  AND NVL(H.TYPE, 'X') <> 'REVERSE'
  AND H.REF_REVERSE_ENTRY IS NULL
  AND UPPER(NVL(H.DESCRIPTION, ' ')) NOT LIKE '%REFUNDED%'
`;

function buildRangeFilter(startDate, endDate, col = 'H.GL_ENTRY_DATE') {
  const binds = {};
  let sql = '';

  if (startDate) {
    sql += ` AND TRUNC(${col}) >= TO_DATE(:startDate, 'YYYY-MM-DD')`;
    binds.startDate = startDate;
  }
  if (endDate) {
    sql += ` AND TRUNC(${col}) <= TO_DATE(:endDate, 'YYYY-MM-DD')`;
    binds.endDate = endDate;
  }
  return { sql, binds };
}

// amountCol: je side er sum amount hobe (expense = CREDIT)
// accountCol: je side e account code thake (expense = DEBIT)
async function getVoucherReport({ voucherType, amountCol, accountCol, startDate, endDate }) {
  let connection;
  try {
    connection = await getConnection();

    const f = buildRangeFilter(startDate, endDate);

    const query = `
      SELECT H.ID,
             H.VOUCHERNO,
             H.DESCRIPTION,
             H.GL_ENTRY_DATE,
             H.DESCRIPTION || ' (' ||
               NVL(MAX(CASE WHEN L.${accountCol} > 0 THEN TO_CHAR(L.CODE) END), '-')
             || ')' AS DESCRIPTION_WITH_CODE,
             SUM(L.${amountCol}) AS AMOUNT
      FROM GLMASTER H
      JOIN GLDETAILS L ON L.GLMASTERID = H.ID
      WHERE ${BASE_WHERE}
        ${f.sql}
      GROUP BY H.ID, H.VOUCHERNO, H.DESCRIPTION, H.GL_ENTRY_DATE
      ORDER BY H.GL_ENTRY_DATE DESC, H.ID DESC
    `;

    const binds = { voucherType, ...f.binds };

    const result = await connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return (result.rows ?? []).map((r) => ({
      ...r,
      AMOUNT: r.AMOUNT != null ? Number(r.AMOUNT) : 0,
    }));
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

export function getExpenseReport(startDate, endDate) {
  return getVoucherReport({
    voucherType: EXPENSE_VOUCHER_TYPE,
    amountCol: 'CREDIT',
    accountCol: 'DEBIT',
    startDate,
    endDate,
  });
}

export function getIncomeReport(startDate, endDate) {
  return getVoucherReport({
    voucherType: INCOME_VOUCHER_TYPE,
    amountCol: 'DEBIT',
    accountCol: 'CREDIT',
    startDate,
    endDate,
  });
}