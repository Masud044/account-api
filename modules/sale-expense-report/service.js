import { withConnection, oracledb } from "../../config/db.js";

function toMmDdYyyy(input) {
  const [year, month, day] = String(input).split("-");
  return `${month}-${day}-${year}`;
}

async function fetchGlLines(conn, { from_date, to_date, accountPrefix }) {
  const sql = `
    SELECT
      gm.VOUCHERNO,
      gm.TRANS_DATE,
      gm.DESCRIPTION                                AS VOUCHER_DESC,
      gm.VOUCHER_TYPE,
      gd.CODE                                       AS ACCOUNT_ID,
      gd.CODEDESCRIPTION                            AS ACCOUNT_LABEL,
      COALESCE(ca.ACCOUNT_NAME, gd.CODEDESCRIPTION) AS ACCOUNT_NAME,
      gd.DESCRIPTION                                AS LINE_DESC,
      gd.DEBIT,
      gd.CREDIT
    FROM  GLMASTER  gm
    JOIN  GLDETAILS gd  ON gd.GLMASTERID = gm.ID
    LEFT JOIN CHART_OF_ACCOUNT ca ON ca.ACCOUNT_ID = gd.CODE
    WHERE SUBSTR(gd.CODE, 1, 1) = :prefix
      AND gm.TRANS_DATE >= TO_DATE(:from_date, 'MM-DD-YYYY')
      AND gm.TRANS_DATE <= TO_DATE(:to_date,   'MM-DD-YYYY')
    ORDER BY gm.TRANS_DATE, gm.VOUCHERNO, gd.ID
  `;

  const result = await conn.execute(
    sql,
    {
      prefix:    accountPrefix,
      from_date: toMmDdYyyy(from_date),
      to_date:   toMmDdYyyy(to_date),
    },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows;
}

function groupByAccount(rows, amountField) {
  const map = {};
  for (const r of rows) {
    const key = r.ACCOUNT_NAME || r.ACCOUNT_LABEL || r.ACCOUNT_ID;
    map[key] = (map[key] || 0) + (Number(r[amountField]) || 0);
  }
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function calcTotals(salesRows, expenseRows) {
  const totalSales   = salesRows.reduce((s, r)   => s + (Number(r.CREDIT) || 0), 0);
  const totalExpense = expenseRows.reduce((s, r) => s + (Number(r.DEBIT)  || 0), 0);
  const netSurplus   = totalSales - totalExpense;
  return { totalSales, totalExpense, netSurplus };
}

export async function getSaleExpenseReportService({ from_date, to_date }) {
  return withConnection(async (conn) => {
    const [salesRows, expenseRows] = await Promise.all([
      fetchGlLines(conn, { from_date, to_date, accountPrefix: "4" }),
      fetchGlLines(conn, { from_date, to_date, accountPrefix: "5" }),
    ]);

    // ── Journal only (VOUCHER_TYPE = 3) ──────────────────────────────
    const journalSales   = salesRows.filter(r   => r.VOUCHER_TYPE === 3);
    const journalExpense = expenseRows.filter(r => r.VOUCHER_TYPE === 3);

    const journal = calcTotals(journalSales, journalExpense);

    // ── All vouchers ──────────────────────────────────────────────────
    const all = calcTotals(salesRows, expenseRows);

    const profitMargin = all.totalSales > 0
      ? ((all.netSurplus / all.totalSales) * 100).toFixed(2)
      : "0.00";

    const incomeVouchers  = new Set(salesRows.map(r   => r.VOUCHERNO)).size;
    const expenseVouchers = new Set(expenseRows.map(r => r.VOUCHERNO)).size;

    return {
      summary: {
        from_date,
        to_date,

        // Journal (voucher_type = 3) totals
        journal: {
          total_sales:   journal.totalSales,
          total_expense: journal.totalExpense,
          net_surplus:   journal.netSurplus,
        },

        // All vouchers totals + profit margin
        all: {
          total_sales:       all.totalSales,
          total_expense:     all.totalExpense,
          net_surplus:       all.netSurplus,
          profit_margin_pct: profitMargin,
        },

        income_vouchers:  incomeVouchers,
        expense_vouchers: expenseVouchers,
        total_vouchers:   incomeVouchers + expenseVouchers,
        total_gl_lines:   salesRows.length + expenseRows.length,
      },
      sales_breakdown:   groupByAccount(salesRows,   "CREDIT"),
      expense_breakdown: groupByAccount(expenseRows, "DEBIT"),
      sales:             salesRows,
      expenses:          expenseRows,
    };
  });
}