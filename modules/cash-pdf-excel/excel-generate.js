// modules/cash-transfer-pdf-get/excelGenerator.js
import ExcelJS from "exceljs";

const fmt2 = (n) => Number(Number(n || 0).toFixed(2));
const safe  = (v) => (v == null ? "" : String(v).trim());

const BLACK  = "FF111111";
const WHITE  = "FFFFFFFF";
const PURPLE = "FF6D28D9";
const LPURP  = "FFF5F0FF"; // light purple for from/to rows
const GRAY   = "FFF0F0F0";
const DGRAY  = "FF444444";

const border = (style = "thin") => ({
  top: { style }, left: { style }, bottom: { style }, right: { style },
});

const labelStyle = (bg = GRAY) => ({
  font:      { bold: true, size: 10, color: { argb: DGRAY } },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
  alignment: { vertical: "middle", horizontal: "left" },
  border:    border(),
});

const valueStyle = (bg = WHITE) => ({
  font:      { size: 10, color: { argb: BLACK } },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
  alignment: { vertical: "middle", horizontal: "left", wrapText: true },
  border:    border(),
});

const totalStyle = () => ({
  font:      { bold: true, size: 11, color: { argb: BLACK } },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } },
  alignment: { vertical: "middle", horizontal: "right" },
  border:    border("medium"),
});

/**
 * Generate Excel Buffer for cash transfer voucher.
 * @param {object} voucherData – { master, debitRow, creditRow, summary }
 * @returns {Promise<Buffer>}
 */
export async function generateCashTransferExcel(voucherData) {
  const { master: m, debitRow, creditRow, summary } = voucherData;
  const wb = new ExcelJS.Workbook();
  wb.creator  = "HRMS – Accounting";
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Cash Transfer", {
    pageSetup: {
      paperSize: 9, orientation: "portrait",
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
  });

  ws.columns = [
    { key: "A", width: 24 }, // label
    { key: "B", width: 52 }, // value (wide — account name can be long)
  ];

  let row;

  // ── Title ──────────────────────────────────────────────────────────────────
  row = ws.addRow(["CASH TRANSFER VOUCHER", ""]);
  ws.mergeCells(`A${row.number}:B${row.number}`);
  row.getCell(1).style = {
    font:      { bold: true, size: 16, color: { argb: BLACK } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  row.height = 32;

  row = ws.addRow(["Internal Record", ""]);
  ws.mergeCells(`A${row.number}:B${row.number}`);
  row.getCell(1).style = {
    font:      { size: 9, italic: true, color: { argb: "FF666666" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  row.height = 16;

  // Separator
  row = ws.addRow(["", ""]);
  ws.mergeCells(`A${row.number}:B${row.number}`);
  row.getCell(1).border = { bottom: { style: "medium", color: { argb: BLACK } } };
  row.height = 4;

  ws.addRow([]);

  // ── Meta info ──────────────────────────────────────────────────────────────
  const supportingText = safe(m.SUPPORTING) ? `${safe(m.SUPPORTING)} Doc(s)` : "—";

  const metaRows = [
    ["Voucher No:",  `CT-${safe(m.VOUCHERNO)}`],
    ["Date:",        safe(m.TRANS_DATE)],
    ["GL Date:",     safe(m.GL_ENTRY_DATE)],
    ["Supporting:",  supportingText],
  ];

  for (const [label, value] of metaRows) {
    row = ws.addRow([label, value]);
    row.height = 18;
    row.getCell(1).style = { font: { bold: true, size: 10 }, alignment: { vertical: "middle" } };
    row.getCell(2).style = { font: { size: 10 },             alignment: { vertical: "middle" } };
  }

  ws.addRow([]);

  // ── Description ────────────────────────────────────────────────────────────
  row = ws.addRow(["Description / Particulars:", ""]);
  ws.mergeCells(`A${row.number}:B${row.number}`);
  row.getCell(1).style = { font: { bold: true, size: 10 }, alignment: { vertical: "middle" } };
  row.height = 18;

  row = ws.addRow([safe(m.DESCRIPTION) || "—", ""]);
  ws.mergeCells(`A${row.number}:B${row.number}`);
  row.getCell(1).style = { font: { size: 10 }, alignment: { vertical: "middle", wrapText: true } };
  row.height = 18;

  ws.addRow([]);

  // ── Transfer Details header ────────────────────────────────────────────────
  row = ws.addRow(["TRANSFER DETAILS", ""]);
  ws.mergeCells(`A${row.number}:B${row.number}`);
  row.getCell(1).style = {
    font:      { bold: true, color: { argb: WHITE }, size: 10 },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } },
    alignment: { vertical: "middle", horizontal: "left" },
    border:    border(),
  };
  row.height = 22;

  // From Account
  const fromCode = safe(creditRow.CODE);
  const fromName = safe(creditRow.ACCOUNT_NAME || creditRow.CODEDESCRIPTION);
  const fromVal  = fromName ? `${fromCode}  –  ${fromName}` : fromCode;

  row = ws.addRow(["From Account (Credit)", fromVal]);
  row.height = 20;
  row.getCell(1).style = labelStyle(LPURP);
  row.getCell(2).style = valueStyle(LPURP);

  // Arrow row
  row = ws.addRow(["", "↓  Transfer"]);
  row.height = 16;
  row.getCell(1).style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } }, border: border() };
  row.getCell(2).style = {
    font:      { bold: true, size: 10, color: { argb: PURPLE } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } },
    alignment: { vertical: "middle", horizontal: "center" },
    border:    border(),
  };

  // To Account
  const toCode = safe(debitRow.CODE);
  const toName = safe(debitRow.ACCOUNT_NAME || debitRow.CODEDESCRIPTION);
  const toVal  = toName ? `${toCode}  –  ${toName}` : toCode;

  row = ws.addRow(["To Account (Debit)", toVal]);
  row.height = 20;
  row.getCell(1).style = labelStyle(LPURP);
  row.getCell(2).style = valueStyle(LPURP);

  ws.addRow([]);

  // ── Transfer Amount ────────────────────────────────────────────────────────
  row = ws.addRow(["Transfer Amount (USD)", fmt2(summary.amount)]);
  row.height = 24;
  row.getCell(1).style = {
    font:      { bold: true, size: 11, color: { argb: BLACK } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } },
    alignment: { vertical: "middle", horizontal: "left" },
    border:    border("medium"),
  };
  row.getCell(2).style = totalStyle();
  row.getCell(2).numFmt = "#,##0.00";

  // ── Signatures ─────────────────────────────────────────────────────────────
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);

  const sigLineStyle = { border: { bottom: { style: "medium", color: { argb: BLACK } } } };
  row = ws.addRow(["", ""]);
  row.height = 18;
  row.getCell(1).style = sigLineStyle;
  row.getCell(2).style = sigLineStyle;

  row = ws.addRow(["Prepared By", "Authorized Signature"]);
  row.height = 16;
  const sigLabelStyle = { font: { bold: true, size: 9.5 }, alignment: { horizontal: "center" } };
  row.getCell(1).style = sigLabelStyle;
  row.getCell(2).style = sigLabelStyle;

  ws.views = [{ state: "frozen", ySplit: 3 }];

  return await wb.xlsx.writeBuffer();
}