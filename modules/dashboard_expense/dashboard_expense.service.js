// import { withConnection } from "../../config/db.js";

// export async function getExpenseTotal({ month, year }) {
//   const mm = String(month).padStart(2, "0");
//   const dateParam = `${mm}-${year}`;

//   const sql = `
//     SELECT SUM(L.DEBIT) AS EXPENSE_TOTAL
//     FROM GLMASTER H
//     JOIN GLDETAILS L ON H.ID = L.GLMASTERID
//     JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
//     WHERE H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
//       AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
//       AND H.VOUCHER_TYPE = 2
//       AND H.POSTED = 1
//   `;

//   return withConnection(async (conn) => {
//     const result = await conn.execute(sql, { date_bv: dateParam }, { outFormat: 4002 });
//     const row = result.rows?.[0];
//     return {
//       date_range: dateParam,
//       voucher_type: 2,
//       total_expense: row?.EXPENSE_TOTAL != null ? Number(row.EXPENSE_TOTAL) : 0,
//     };
//   });
// }

// export async function getExpenseBreakdown({ month, year, date } = {}) {
//   let sql = `
//     SELECT DESCRIPTION, SUM(CREDIT) AS AMT, GL_ENTRY_DATE
//     FROM GLDATA
//     WHERE VOUCHER_TYPE = 'Expense'
//   `;

//   const binds = {};

//   if (date) {
//     // specific date — YYYY-MM-DD format আসবে frontend থেকে
//     binds.exact_date = date;
//     sql += ` AND TRUNC(GL_ENTRY_DATE) = TO_DATE(:exact_date, 'YYYY-MM-DD') `;
//   } else if (month && year) {
//     const mm = String(month).padStart(2, "0");
//     binds.date_bv = `${mm}-${year}`;
//     sql += `
//       AND GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
//       AND GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
//     `;
//   } else if (year) {
//     binds.year_start = `01-${year}`;
//     binds.year_end   = `01-${year + 1}`;
//     sql += `
//       AND GL_ENTRY_DATE >= TO_DATE(:year_start, 'MM-YYYY')
//       AND GL_ENTRY_DATE < TO_DATE(:year_end, 'MM-YYYY')
//     `;
//   } else if (month) {
//     sql += ` AND EXTRACT(MONTH FROM GL_ENTRY_DATE) = :month_bv `;
//     binds.month_bv = month;
//   }

//   sql += ` GROUP BY DESCRIPTION, GL_ENTRY_DATE ORDER BY GL_ENTRY_DATE `;

//   return withConnection(async (conn) => {
//     const result = await conn.execute(sql, binds, { outFormat: 4002 });
//     const rows = result.rows ?? [];
//     const total = rows.reduce((sum, row) => sum + (Number(row.AMT) || 0), 0);
//     return { total, rows };
//   });
// }


// // ─── EXPENSE BREAKDOWN BY ACCOUNT (chart of account level, not category) ─────
// export async function getExpenseByAccount({ month, year } = {}) {
//   console.log('[getExpenseByAccount] input:', { month, year, monthType: typeof month, yearType: typeof year });

//   const binds = {};
//   let dateFilter = '';

//   if (month && year) {
//     const mm = String(month).padStart(2, "0");
//     binds.date_bv = `${mm}-${year}`;
//     dateFilter = `
//       AND H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
//       AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
//     `;
//   } else if (year) {
//     binds.year_start = `01-${year}`;
//     binds.year_end   = `01-${year + 1}`;
//     dateFilter = `
//       AND H.GL_ENTRY_DATE >= TO_DATE(:year_start, 'MM-YYYY')
//       AND H.GL_ENTRY_DATE < TO_DATE(:year_end, 'MM-YYYY')
//     `;
//   }

//   const sql = `
//     SELECT
//       C.ACCOUNT_ID,
//       C.ACCOUNT_NAME,
//       SUM(L.DEBIT) AS TOTAL_AMT
//     FROM GLMASTER H
//     JOIN GLDETAILS L ON H.ID = L.GLMASTERID
//     JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
//     WHERE H.VOUCHER_TYPE = 2
      
//       ${dateFilter}
//     GROUP BY C.ACCOUNT_ID, C.ACCOUNT_NAME
//     ORDER BY TOTAL_AMT DESC
//   `;

//   return withConnection(async (conn) => {
//     const result = await conn.execute(sql, binds, { outFormat: 4002 });
//     const rows = (result.rows || []).map((row) => ({
//       ACCOUNT_NAME: row.ACCOUNT_NAME,
//       AMT: row.TOTAL_AMT != null ? Number(row.TOTAL_AMT) : 0,
//     }));
//     return { rows };
//   });
// }


import { withConnection } from "../../config/db.js";

// ─── EXPENSE TOTAL (single number, month/year) ─────────────────────────────
export async function getExpenseTotal({ month, year }) {
  const mm = String(month).padStart(2, "0");
  const dateParam = `${mm}-${year}`;

  const sql = `
    SELECT SUM(L.DEBIT) AS EXPENSE_TOTAL
    FROM GLMASTER H
    JOIN GLDETAILS L ON H.ID = L.GLMASTERID
    JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
    WHERE H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
      AND H.VOUCHER_TYPE = 2
      AND H.POSTED = 1
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, { date_bv: dateParam }, { outFormat: 4002 });
    const row = result.rows?.[0];
    return {
      date_range: dateParam,
      voucher_type: 2,
      total_expense: row?.EXPENSE_TOTAL != null ? Number(row.EXPENSE_TOTAL) : 0,
    };
  });
}

// ─── EXPENSE BREAKDOWN (date/description level, shob ekshathe) ────────────
export async function getExpenseBreakdown({ month, year, date } = {}) {
  let sql = `
    SELECT DESCRIPTION, SUM(CREDIT) AS AMT, GL_ENTRY_DATE
    FROM GLDATA
    WHERE VOUCHER_TYPE = 'Expense'
  `;

  const binds = {};

  if (date) {
    binds.exact_date = date;
    sql += ` AND TRUNC(GL_ENTRY_DATE) = TO_DATE(:exact_date, 'YYYY-MM-DD') `;
  } else if (month && year) {
    const mm = String(month).padStart(2, "0");
    binds.date_bv = `${mm}-${year}`;
    sql += `
      AND GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
      AND GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
    `;
  } else if (year) {
    binds.year_start = `01-${year}`;
    binds.year_end   = `01-${year + 1}`;
    sql += `
      AND GL_ENTRY_DATE >= TO_DATE(:year_start, 'MM-YYYY')
      AND GL_ENTRY_DATE < TO_DATE(:year_end, 'MM-YYYY')
    `;
  } else if (month) {
    sql += ` AND EXTRACT(MONTH FROM GL_ENTRY_DATE) = :month_bv `;
    binds.month_bv = month;
  }

  sql += ` GROUP BY DESCRIPTION, GL_ENTRY_DATE ORDER BY GL_ENTRY_DATE `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, binds, { outFormat: 4002 });
    const rows = result.rows ?? [];
    const total = rows.reduce((sum, row) => sum + (Number(row.AMT) || 0), 0);
    return { total, rows };
  });
}

// ─── EXPENSE BREAKDOWN BY ACCOUNT (chart of account level, not category) ──
export async function getExpenseByAccount({ month, year } = {}) {
  const binds = {};
  let dateFilter = '';

  if (month && year) {
    const mm = String(month).padStart(2, "0");
    binds.date_bv = `${mm}-${year}`;
    dateFilter = `
      AND H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
    `;
  } else if (year) {
    binds.year_start = `01-${year}`;
    binds.year_end   = `01-${year + 1}`;
    dateFilter = `
      AND H.GL_ENTRY_DATE >= TO_DATE(:year_start, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < TO_DATE(:year_end, 'MM-YYYY')
    `;
  }

  const sql = `
    SELECT
      C.ACCOUNT_ID,
      C.ACCOUNT_NAME,
      SUM(L.DEBIT) AS TOTAL_AMT
    FROM GLMASTER H
    JOIN GLDETAILS L ON H.ID = L.GLMASTERID
    JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
    WHERE H.VOUCHER_TYPE = 2
      ${dateFilter}
    GROUP BY C.ACCOUNT_ID, C.ACCOUNT_NAME
    ORDER BY TOTAL_AMT DESC
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, binds, { outFormat: 4002 });
    const rows = (result.rows || []).map((row) => ({
      ACCOUNT_NAME: row.ACCOUNT_NAME,
      AMT: row.TOTAL_AMT != null ? Number(row.TOTAL_AMT) : 0,
    }));
    return { rows };
  });
}

// ─── EXPENSE BREAKDOWN — Project vs Other Expense আলাদা (date/description/account shoho) ─
// ─── EXPENSE BREAKDOWN — Project vs Other Expense আলাদা (date/description/account shoho) ─
export async function getExpenseBreakdownSplit({ month, year, date } = {}) {
  let sql = `
    SELECT
      H.GL_ENTRY_DATE,
      H.DESCRIPTION,
      C.ACCOUNT_NAME,
      CASE WHEN UPPER(C.ACCOUNT_NAME) LIKE '%PROJECT%' THEN 1 ELSE 0 END AS IS_PROJECT,
      SUM(L.DEBIT) AS AMT
    FROM GLMASTER H
    JOIN GLDETAILS L ON H.ID = L.GLMASTERID
    JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
    WHERE H.VOUCHER_TYPE = 2
      AND L.DEBIT > 0
  `;

  const binds = {};

  if (date) {
    binds.exact_date = date;
    sql += ` AND TRUNC(H.GL_ENTRY_DATE) = TO_DATE(:exact_date, 'YYYY-MM-DD') `;
  } else if (month && year) {
    const mm = String(month).padStart(2, "0");
    binds.date_bv = `${mm}-${year}`;
    sql += `
      AND H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
    `;
  } else if (year) {
    binds.year_start = `01-${year}`;
    binds.year_end   = `01-${year + 1}`;
    sql += `
      AND H.GL_ENTRY_DATE >= TO_DATE(:year_start, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < TO_DATE(:year_end, 'MM-YYYY')
    `;
  } else if (month) {
    sql += ` AND EXTRACT(MONTH FROM H.GL_ENTRY_DATE) = :month_bv `;
    binds.month_bv = month;
  }

  sql += `
    GROUP BY H.GL_ENTRY_DATE, H.DESCRIPTION, C.ACCOUNT_NAME
    HAVING SUM(L.DEBIT) > 0
    ORDER BY H.GL_ENTRY_DATE
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, binds, { outFormat: 4002 });
    const allRows = result.rows ?? [];

    const projectRows = [];
    const otherRows   = [];

    allRows.forEach((row) => {
      const entry = {
        GL_ENTRY_DATE: row.GL_ENTRY_DATE,
        DESCRIPTION:   row.DESCRIPTION,
        ACCOUNT_NAME:  row.ACCOUNT_NAME,
        AMT: row.AMT != null ? Number(row.AMT) : 0,
      };
      (row.IS_PROJECT === 1 ? projectRows : otherRows).push(entry);
    });

    const projectTotal = projectRows.reduce((sum, r) => sum + r.AMT, 0);
    const otherTotal   = otherRows.reduce((sum, r) => sum + r.AMT, 0);

    return {
      project: { rows: projectRows, total: projectTotal },
      other:   { rows: otherRows,   total: otherTotal },
    };
  });
}