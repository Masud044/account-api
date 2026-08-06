// import oracledb from 'oracledb';
// import { getConnection } from '../../config/db.js';

// export async function getExpenseReport(startDate, endDate) {
//   let connection;
//   try {
//     connection = await getConnection();

//     const result = await connection.execute(
//       `SELECT ID,
//               VOUCHERNO,
//               DESCRIPTION,
//               GL_ENTRY_DATE,
//               DESCRIPTION || ' (' || CODE || ')' AS DESCRIPTION_WITH_CODE,
//               DEBIT AMOUNT
//        FROM GLDATA
//        WHERE DEBIT > 0
//          AND GL_ENTRY_DATE >= TO_DATE(:startDate, 'YYYY-MM-DD')
//          AND GL_ENTRY_DATE <= TO_DATE(:endDate, 'YYYY-MM-DD')
//          AND UPPER(VOUCHER_TYPE) = 'EXPENSE'
//        ORDER BY GL_ENTRY_DATE, ID`,
//       { startDate, endDate },
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

//     const result = await connection.execute(
//       `SELECT ID,
//               VOUCHERNO,
//               DESCRIPTION,
//               GL_ENTRY_DATE,
//               DESCRIPTION || ' (' || CODE || ')' AS DESCRIPTION_WITH_CODE,
//               CREDIT AMOUNT
//        FROM GLDATA
//        WHERE CREDIT > 0
//          AND GL_ENTRY_DATE >= TO_DATE(:startDate, 'YYYY-MM-DD')
//          AND GL_ENTRY_DATE <= TO_DATE(:endDate, 'YYYY-MM-DD')
//          AND UPPER(VOUCHER_TYPE) = 'INCOME'
//        ORDER BY GL_ENTRY_DATE, ID`,
//       { startDate, endDate },
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

export async function getExpenseReport(startDate, endDate) {
  let connection;
  try {
    connection = await getConnection();

    let query = `
      SELECT ID,
             VOUCHERNO,
             DESCRIPTION,
             GL_ENTRY_DATE,
             DESCRIPTION || ' (' || CODE || ')' AS DESCRIPTION_WITH_CODE,
             DEBIT AMOUNT
      FROM GLDATA
      WHERE DEBIT > 0
        AND UPPER(VOUCHER_TYPE) = 'EXPENSE'
    `;

    const binds = {};

    if (startDate) {
      query += ` AND GL_ENTRY_DATE >= TO_DATE(:startDate, 'YYYY-MM-DD')`;
      binds.startDate = startDate;
    }

    if (endDate) {
      query += ` AND GL_ENTRY_DATE <= TO_DATE(:endDate, 'YYYY-MM-DD')`;
      binds.endDate = endDate;
    }

    query += ` ORDER BY GL_ENTRY_DATE, ID`;

    const result = await connection.execute(
      query,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
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

export async function getIncomeReport(startDate, endDate) {
  let connection;
  try {
    connection = await getConnection();

    let query = `
      SELECT ID,
             VOUCHERNO,
             DESCRIPTION,
             GL_ENTRY_DATE,
             DESCRIPTION || ' (' || CODE || ')' AS DESCRIPTION_WITH_CODE,
             CREDIT AMOUNT
      FROM GLDATA
      WHERE CREDIT > 0
        AND UPPER(VOUCHER_TYPE) = 'INCOME'
    `;

    const binds = {};

    if (startDate) {
      query += ` AND GL_ENTRY_DATE >= TO_DATE(:startDate, 'YYYY-MM-DD')`;
      binds.startDate = startDate;
    }

    if (endDate) {
      query += ` AND GL_ENTRY_DATE <= TO_DATE(:endDate, 'YYYY-MM-DD')`;
      binds.endDate = endDate;
    }

    query += ` ORDER BY GL_ENTRY_DATE, ID`;

    const result = await connection.execute(
      query,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
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