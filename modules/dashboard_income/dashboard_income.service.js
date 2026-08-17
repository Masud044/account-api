import { withConnection } from "../../config/db.js";

export async function getIncomeTotal({ month, year }) {
  const mm = String(month).padStart(2, "0");
  const dateParam = `${mm}-${year}`;

  const sql = `
    SELECT SUM(L.CREDIT) AS INCOME_TOTAL
    FROM GLMASTER H
    JOIN GLDETAILS L ON H.ID = L.GLMASTERID
    JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
    WHERE H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
      AND H.VOUCHER_TYPE = 1
      AND H.POSTED = 0
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(sql, { date_bv: dateParam }, { outFormat: 4002 });
    const row = result.rows?.[0];
    return {
      date_range: dateParam,
      voucher_type: 1,
      total_income: row?.INCOME_TOTAL != null ? Number(row.INCOME_TOTAL) : 0,
    };
  });
}

export async function getIncomeBreakdown({ month, year, date } = {}) {
  let sql = `
    SELECT DESCRIPTION, SUM(DEBIT) AS AMT, GL_ENTRY_DATE
    FROM GLDATA
    WHERE VOUCHER_TYPE = 'Income'
  `;

  const binds = {};

  if (date) {
    // specific date
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


