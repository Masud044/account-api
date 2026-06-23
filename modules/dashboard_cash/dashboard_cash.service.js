import { withConnection } from "../../config/db.js";

export async function getCashSummary({ month, year }) {
  const mm = String(month).padStart(2, "0");
  const dateParam = `${mm}-${year}`;

  const sql = `
    SELECT
      C.ACCOUNT_ID,
      C.ACCOUNT_NAME,
      SUM(L.DEBIT) AS TOTAL_DEBIT
    FROM
      GLMASTER H
      JOIN GLDETAILS L ON H.ID = L.GLMASTERID
      JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
    WHERE
      H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
      AND H.VOUCHER_TYPE = 1
      AND H.POSTED = 0
      AND C.ACCOUNT_TYPE = 1
    GROUP BY
      C.ACCOUNT_ID,
      C.ACCOUNT_NAME
    ORDER BY
      C.ACCOUNT_ID
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(
      sql,
      { date_bv: dateParam },
      { outFormat: 4002 }
    );

    const rows = (result.rows || []).map((row) => ({
      ...row,
      TOTAL_DEBIT: row.TOTAL_DEBIT != null ? Number(row.TOTAL_DEBIT) : 0,
    }));

    return {
      query_month: dateParam,
      filters: { posted: "No (POSTED=0)", voucher_type: 1, account_type: 1 },
      cash_summary: rows,
      record_count: rows.length,
    };
  });
}

export async function getAccountBalance({ code }) {
  const sql = `
    SELECT
      (SUM(DEBIT) - SUM(CREDIT)) AS BALANCE
    FROM
      GLDATA
    WHERE
      CODE = :code_bv
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(
      sql,
      { code_bv: code },
      { outFormat: 4002 }
    );

    const row = result.rows?.[0];
    const balance = row?.BALANCE != null ? Number(row.BALANCE) : 0;

    return {
      code,
      balance,
    };
  });
}
