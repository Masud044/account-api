import { withConnection } from "../../config/db.js";

export async function getIncomeTotal({ month, year }) {
  const mm = String(month).padStart(2, "0");
  const dateParam = `${mm}-${year}`;

  const sql = `
    SELECT
      SUM(L.CREDIT) AS INCOME_TOTAL
    FROM
      GLMASTER H
      JOIN GLDETAILS L ON H.ID = L.GLMASTERID
      JOIN CHART_OF_ACCOUNT C ON C.ACCOUNT_ID = L.CODE
    WHERE
      H.GL_ENTRY_DATE >= TO_DATE(:date_bv, 'MM-YYYY')
      AND H.GL_ENTRY_DATE < ADD_MONTHS(TO_DATE(:date_bv, 'MM-YYYY'), 1)
      AND H.VOUCHER_TYPE = 1
      AND H.POSTED = 0
  `;

  return withConnection(async (conn) => {
    const result = await conn.execute(
      sql,
      { date_bv: dateParam },
      { outFormat: 4002 }
    );

    const row = result.rows?.[0];
    const incomeTotal = row?.INCOME_TOTAL != null ? Number(row.INCOME_TOTAL) : 0;

    return {
      date_range: dateParam,
      voucher_type: 1,
      total_income: incomeTotal,
    };
  });
}
