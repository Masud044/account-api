import oracledb from "oracledb";
import ExcelJS from "exceljs";
import { getConnection } from "../../config/db.js";

/**
 * NOTE / ASSUMPTION:
 * FARM_BUDGET_H / FARM_BUDGET_D only store BUDGET_AMOUNT — there is no
 * ACTUAL_AMOUNT column in either table yet. Until an "actual spend" source
 * is wired up (e.g. GLDETAILS / FARM_ACTIVITY_LOG), ACTUAL is returned as 0
 * everywhere below. Swap `getActualAmounts()` for a real query later — the
 * rest of the report (variance formulas, Excel layout) will keep working.
 */

// ---------- header ----------
export async function getFarmBudgetHeader(budgetId) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT BUDGET_ID, BUDGET_YEAR, FARM_NAME, STATUS, CREATED_BY, CREATED_DATE, B_MONTH
       FROM FARM_BUDGET_H
       WHERE BUDGET_ID = :budget_id_bv`,
      { budget_id_bv: Number(budgetId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows?.[0] || null;
  } finally {
    await connection.close();
  }
}

// ---------- budgeted amounts, grouped by expense head (= Budget Category) ----------
export async function getFarmBudgetSummary(budgetId) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT d.EXPENSE_HEAD,
              SUM(d.BUDGET_AMOUNT) AS BUDGET_AMOUNT
       FROM FARM_BUDGET_D d
       WHERE d.BUDGET_ID = :budget_id_bv
       GROUP BY d.EXPENSE_HEAD
       ORDER BY MIN(d.EXPENSE_CODE)`,
      { budget_id_bv: Number(budgetId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ---------- actual amounts (placeholder until a real source is wired up) ----------
async function getActualAmounts(_budgetId, expenseHeads) {
  // Returns 0 for every category. Replace body with a real query
  // (e.g. join to GLDETAILS by EXPENSE_CODE/EXPENSE_HEAD) when available.
  const map = {};
  for (const head of expenseHeads) map[head] = 0;
  return map;
}

// ---------- combined data the report/API needs ----------
export async function getFarmBudgetReportData(budgetId) {
  const header = await getFarmBudgetHeader(budgetId);
  if (!header) return null;

  const summary = await getFarmBudgetSummary(budgetId);
  const actuals = await getActualAmounts(
    budgetId,
    summary.map((r) => r.EXPENSE_HEAD)
  );

  const categories = summary.map((r) => {
    const budgeted = Number(r.BUDGET_AMOUNT) || 0;
    const actual = Number(actuals[r.EXPENSE_HEAD]) || 0;
    const varianceAmount = actual - budgeted;
    const variancePercent = budgeted !== 0 ? varianceAmount / budgeted : 0;
    return {
      category: r.EXPENSE_HEAD,
      budgeted,
      actual,
      varianceAmount,
      variancePercent,
    };
  });

  const totals = categories.reduce(
    (acc, c) => {
      acc.budgeted += c.budgeted;
      acc.actual += c.actual;
      return acc;
    },
    { budgeted: 0, actual: 0 }
  );
  totals.varianceAmount = totals.actual - totals.budgeted;
  totals.variancePercent = totals.budgeted !== 0 ? totals.varianceAmount / totals.budgeted : 0;

  return { header, categories, totals };
}

// ---------- Excel report, laid out like Department_Budget_Report_Template.xlsx ----------
export async function generateFarmBudgetReportExcel(budgetId) {
  const data = await getFarmBudgetReportData(budgetId);
  if (!data) return null;

  const { header, categories } = data;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Budget Report");
  sheet.columns = [
    { width: 28 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 14 },
    { width: 30 },
  ];

  const titleFont = { name: "Arial", bold: true, size: 14 };
  const labelFont = { name: "Arial", bold: true };
  const normalFont = { name: "Arial" };
  const yellowFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
  const thinBorder = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Title
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "FARM BUDGET REPORT";
  sheet.getCell("A1").font = titleFont;

  // Header info block (row 2-5)
  const infoRows = [
    ["Farm Name:", header.FARM_NAME],
    ["Budget Year:", header.BUDGET_YEAR],
    ["Status:", header.STATUS],
    ["Prepared By:", header.CREATED_BY],
  ];
  infoRows.forEach((row, i) => {
    const r = i + 2;
    sheet.getCell(`A${r}`).value = row[0];
    sheet.getCell(`A${r}`).font = labelFont;
    sheet.getCell(`B${r}`).value = row[1] ?? "";
    sheet.getCell(`B${r}`).font = normalFont;
  });

  // Table header (row 7)
  const tableHeaderRow = 7;
  const columns = ["Budget Category", "Budgeted Amount", "Actual Amount", "Variance ($)", "Variance (%)", "Notes"];
  columns.forEach((col, i) => {
    const cell = sheet.getRow(tableHeaderRow).getCell(i + 1);
    cell.value = col;
    cell.font = labelFont;
    cell.fill = headerFill;
    cell.border = thinBorder;
  });

  // Category rows
  let r = tableHeaderRow + 1;
  const firstDataRow = r;
  for (const cat of categories) {
    sheet.getCell(`A${r}`).value = cat.category;
    sheet.getCell(`B${r}`).value = cat.budgeted;
    sheet.getCell(`B${r}`).fill = yellowFill;
    sheet.getCell(`C${r}`).value = cat.actual;
    sheet.getCell(`C${r}`).fill = yellowFill;
    // formulas, not hardcoded results — recalculates if B/C change
    sheet.getCell(`D${r}`).value = { formula: `C${r}-B${r}` };
    sheet.getCell(`E${r}`).value = { formula: `IF(B${r}=0,0,D${r}/B${r})` };
    sheet.getCell(`E${r}`).numFmt = "0.0%";
    sheet.getCell(`B${r}`).numFmt = "#,##0.00";
    sheet.getCell(`C${r}`).numFmt = "#,##0.00";
    sheet.getCell(`D${r}`).numFmt = "#,##0.00;(#,##0.00)";
    ["A", "B", "C", "D", "E", "F"].forEach((col) => {
      sheet.getCell(`${col}${r}`).border = thinBorder;
    });
    r++;
  }
  const lastDataRow = r - 1;

  // TOTAL row
  sheet.getCell(`A${r}`).value = "TOTAL";
  sheet.getCell(`A${r}`).font = labelFont;
  sheet.getCell(`B${r}`).value = { formula: `SUM(B${firstDataRow}:B${lastDataRow})` };
  sheet.getCell(`C${r}`).value = { formula: `SUM(C${firstDataRow}:C${lastDataRow})` };
  sheet.getCell(`D${r}`).value = { formula: `C${r}-B${r}` };
  sheet.getCell(`E${r}`).value = { formula: `IF(B${r}=0,0,D${r}/B${r})` };
  sheet.getCell(`E${r}`).numFmt = "0.0%";
  sheet.getCell(`B${r}`).numFmt = "#,##0.00";
  sheet.getCell(`C${r}`).numFmt = "#,##0.00";
  sheet.getCell(`D${r}`).numFmt = "#,##0.00;(#,##0.00)";
  ["A", "B", "C", "D", "E", "F"].forEach((col) => {
    sheet.getCell(`${col}${r}`).font = labelFont;
    sheet.getCell(`${col}${r}`).border = thinBorder;
  });

  // Footer note (assumption disclosure, mirrors template's "How to use" block)
  r += 2;
  sheet.getCell(`A${r}`).value =
    "Note: Actual Amount is not yet tracked in FARM_BUDGET_D — values shown as 0 until an actual-spend source is connected.";
  sheet.getCell(`A${r}`).font = { name: "Arial", italic: true, size: 9 };

  return workbook;
}