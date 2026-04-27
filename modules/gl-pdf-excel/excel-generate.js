// modules/journal-pdf-get/excelGenerator.js
import ExcelJS from "exceljs";

const fmt2 = (n) => Number(Number(n || 0).toFixed(2));
const safe  = (v) => (v == null ? "" : String(v).trim());

const BLACK  = "FF111111";
const WHITE  = "FFFFFFFF";
const LIGHT  = "FFFFF8E1"; // light amber tint for journal
const GRAY   = "FFF0F0F0";

const border = (style = "thin") => ({
  top: { style }, left: { style }, bottom: { style }, right: { style },
});

const thStyle = () => ({
  font:      { bold: true, color: { argb: WHITE }, size: 10 },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } },
  alignment: { vertical: "middle", horizontal: "left", wrapText: true },
  border:    border(),
});

const thAmountStyle = () => ({
  font:      { bold: true, color: { argb: WHITE }, size: 10 },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } },
  alignment: { vertical: "middle", horizontal: "right" },
  border:    border(),
});

const tdStyle = (bg = WHITE, align = "left") => ({
  font:      { size: 10, color: { argb: BLACK } },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
  alignment: { vertical: "middle", horizontal: align, wrapText: true },
  border:    border(),
});

const totalStyle = (align = "right") => ({
  font:      { bold: true, size: 10.5, color: { argb: BLACK } },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } },
  alignment: { vertical: "middle", horizontal: align },
  border:    border("medium"),
});

/**
 * Generate an Excel Buffer from journal voucher data.
 * @param {object} voucherData – { master, details, summary }
 * @returns {Promise<Buffer>}
 */
export async function generateJournalExcel(voucherData) {
  const { master: m, details, summary } = voucherData;
  const wb = new ExcelJS.Workbook();
  wb.creator  = "HRMS – Accounting";
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Journal Voucher", {
    pageSetup: {
      paperSize: 9, orientation: "portrait",
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
  });

  // Journal has 5 columns: Code | Particulars | Debit | Credit (no right-side meta)
  ws.columns = [
    { key: "A", width: 22 }, // Account Code
    { key: "B", width: 42 }, // Particulars
    { key: "C", width: 20 }, // Debit
    { key: "D", width: 20 }, // Credit
  ];

  let row;

  // ── Title ──────────────────────────────────────────────────────────────────
  row = ws.addRow(["JOURNAL VOUCHER", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).style = {
    font:      { bold: true, size: 16, color: { argb: BLACK } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  row.height = 32;

  row = ws.addRow(["Internal Record", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).style = {
    font:      { size: 9, italic: true, color: { argb: "FF666666" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  row.height = 16;

  row = ws.addRow(["", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).border = { bottom: { style: "medium", color: { argb: BLACK } } };
  row.height = 4;

  ws.addRow([]);

  // ── Meta info (2-column layout using A+B and C+D) ─────────────────────────
  const supportingText = safe(m.SUPPORTING) ? `${safe(m.SUPPORTING)} Doc(s)` : "—";

  const metaRows = [
    ["Voucher No:",  `JV-${safe(m.VOUCHERNO)}`,  "Date:",       safe(m.TRANS_DATE)],
    ["GL Date:",     safe(m.GL_ENTRY_DATE),        "Supporting:", supportingText],
  ];

  for (const [labelA, valA, labelC, valC] of metaRows) {
    row = ws.addRow([labelA, valA, labelC, valC]);
    row.height = 18;
    const styleLabel = { font: { bold: true, size: 10 }, alignment: { vertical: "middle" } };
    const styleVal   = { font: { size: 10 },             alignment: { vertical: "middle" } };
    row.getCell(1).style = styleLabel;
    row.getCell(2).style = styleVal;
    row.getCell(3).style = styleLabel;
    row.getCell(4).style = styleVal;
  }

  ws.addRow([]);

  // ── Description ────────────────────────────────────────────────────────────
  row = ws.addRow(["Description / Particulars:", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).style = { font: { bold: true, size: 10 }, alignment: { vertical: "middle" } };
  row.height = 18;

  row = ws.addRow([safe(m.DESCRIPTION) || "—", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).style = { font: { size: 10 }, alignment: { vertical: "middle", wrapText: true } };
  row.height = 18;

  ws.addRow([]);

  // ── Table header ───────────────────────────────────────────────────────────
  row = ws.addRow(["ACCOUNT CODE", "PARTICULARS", "DEBIT", "CREDIT"]);
  row.height = 22;
  row.getCell(1).style = thStyle();
  row.getCell(2).style = thStyle();
  row.getCell(3).style = thAmountStyle();
  row.getCell(4).style = thAmountStyle();

  // ── Data rows (all journal lines) ─────────────────────────────────────────
  details.forEach((d, i) => {
    const bg           = i % 2 === 0 ? WHITE : LIGHT;
    const accountLabel = safe(d.ACCOUNT_NAME || d.CODEDESCRIPTION) || safe(d.CODE);
    const extraDesc    = safe(d.DESCRIPTION);
    const particulars  = extraDesc ? `${accountLabel}\n${extraDesc}` : accountLabel;
    const debitAmt     = fmt2(d.DEBIT);
    const creditAmt    = fmt2(d.CREDIT);

    row = ws.addRow([safe(d.CODE), particulars, debitAmt || "", creditAmt || ""]);
    row.height = 18;
    row.getCell(1).style = tdStyle(bg, "left");
    row.getCell(2).style = tdStyle(bg, "left");
    row.getCell(3).style = tdStyle(bg, "right");
    row.getCell(4).style = tdStyle(bg, "right");

    if (debitAmt)  { row.getCell(3).numFmt = "#,##0.00"; row.getCell(3).value = debitAmt; }
    if (creditAmt) { row.getCell(4).numFmt = "#,##0.00"; row.getCell(4).value = creditAmt; }
  });

  // ── Total row ──────────────────────────────────────────────────────────────
  row = ws.addRow(["", "Total (USD)", fmt2(summary.totalDebit), fmt2(summary.totalCredit)]);
  row.height = 22;
  row.getCell(1).style = totalStyle("left");
  row.getCell(2).style = { ...totalStyle("right"), font: { bold: true, size: 10.5 } };
  row.getCell(3).style = totalStyle("right");
  row.getCell(4).style = totalStyle("right");
  row.getCell(3).numFmt = "#,##0.00";
  row.getCell(4).numFmt = "#,##0.00";

  // ── Signatures ─────────────────────────────────────────────────────────────
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);

  const sigLineStyle = { border: { bottom: { style: "medium", color: { argb: BLACK } } } };
  row = ws.addRow(["", "", "", ""]);
  row.height = 18;
  ["A", "B", "C", "D"].forEach((col) => { row.getCell(col).style = sigLineStyle; });

  row = ws.addRow(["Prepared By", "", "Authorized Signature", ""]);
  row.height = 16;
  const sigLabelStyle = { font: { bold: true, size: 9.5 }, alignment: { horizontal: "center" } };
  ws.mergeCells(`A${row.number}:B${row.number}`);
  ws.mergeCells(`C${row.number}:D${row.number}`);
  row.getCell(1).style = sigLabelStyle;
  row.getCell(3).style = sigLabelStyle;

  ws.views = [{ state: "frozen", ySplit: 3 }];

  return await wb.xlsx.writeBuffer();
}