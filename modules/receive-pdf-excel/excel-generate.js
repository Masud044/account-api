// modules/receipt-pdf-get/excelGenerator.js
import ExcelJS from "exceljs";

const fmt2 = (n) => Number(Number(n || 0).toFixed(2));
const safe  = (v) => (v == null ? "" : String(v).trim());

const BLACK = "FF111111";
const WHITE = "FFFFFFFF";
const LIGHT = "FFF0F7FF"; // light blue tint for receipt (vs purple for payment)
const GRAY  = "FFF0F0F0";

const border = (style = "thin") => ({
  top: { style }, left: { style }, bottom: { style }, right: { style },
});

const thStyle = () => ({
  font:      { bold: true, color: { argb: WHITE }, size: 10 },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } },
  alignment: { vertical: "middle", horizontal: "left", wrapText: true },
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
 * Generate an Excel Buffer from receipt voucher data.
 * @param {object} voucherData – { master, details, summary }
 * @returns {Promise<Buffer>}
 */
export async function generateReceiptExcel(voucherData) {
  const { master: m, details, summary } = voucherData;
  const wb = new ExcelJS.Workbook();

  wb.creator  = "HRMS – Accounting";
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Receipt Voucher", {
    pageSetup: {
      paperSize:   9,
      orientation: "portrait",
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
  });

  ws.columns = [
    { key: "A", width: 26 },
    { key: "B", width: 40 },
    { key: "C", width: 20 },
    { key: "D", width: 22 },
  ];

  let row;

  // ── Title ──────────────────────────────────────────────────────────────────
  row = ws.addRow(["RECEIPT VOUCHER", "", "", ""]);
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

  // ── Meta info ──────────────────────────────────────────────────────────────
  const supportingText = safe(m.SUPPORTING) ? `${safe(m.SUPPORTING)} Doc(s)` : "—";

  const metaRows = [
    ["Customer:",      safe((m.CUSTOMER_NAME)) || safe(m.CUSTOMER_ID), "Date:",       safe(m.TRANS_DATE)],
    ["Invoice No:",    safe(m.VOUCHERNO),                            "GL Date:",    safe(m.GL_ENTRY_DATE)],
    ["Voucher No:",    `RV-${safe(m.VOUCHERNO)}`,                   "",            ""],
    ["Receive Code:",  safe(m.CASH_ACCOUNT_NAME) || safe(m.CASHACCOUNT), "Supporting:", supportingText],
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
  row = ws.addRow(["ACCOUNT CODE", "PARTICULARS", "AMOUNT", ""]);
  ws.mergeCells(`C${row.number}:D${row.number}`);
  row.height = 22;
  row.getCell(1).style = thStyle();
  row.getCell(2).style = thStyle();
  row.getCell(3).style = { ...thStyle(), alignment: { ...thStyle().alignment, horizontal: "right" } };

  // ── Receipt: CREDIT rows ───────────────────────────────────────────────────
  const creditLines = details.filter((d) => Number(d.CREDIT || 0) > 0);

  creditLines.forEach((d, i) => {
    const bg           = i % 2 === 0 ? WHITE : LIGHT;
    const accountLabel = safe(d.ACCOUNT_NAME || d.CODEDESCRIPTION) || safe(d.CODE);
    const extraDesc    = safe(d.DESCRIPTION);
    const particulars  = extraDesc ? `${accountLabel}\n${extraDesc}` : accountLabel;

    row = ws.addRow([safe(d.CODE), particulars, fmt2(d.CREDIT), ""]);
    ws.mergeCells(`C${row.number}:D${row.number}`);
    row.height = 18;
    row.getCell(1).style = tdStyle(bg, "left");
    row.getCell(2).style = tdStyle(bg, "left");
    row.getCell(3).style = tdStyle(bg, "right");
    row.getCell(3).numFmt = "#,##0.00";
  });

  // ── Total ──────────────────────────────────────────────────────────────────
  const total = fmt2(summary.totalCredit || summary.totalDebit);
  row = ws.addRow(["", "Total Amount (USD)", total, ""]);
  ws.mergeCells(`C${row.number}:D${row.number}`);
  row.height = 22;
  row.getCell(1).style = totalStyle("left");
  row.getCell(2).style = { ...totalStyle("right"), font: { bold: true, size: 10.5 } };
  row.getCell(3).style = totalStyle("right");
  row.getCell(3).numFmt = "#,##0.00";

  // ── Spacer + Signatures ────────────────────────────────────────────────────
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);

  const sigLineStyle = { border: { bottom: { style: "medium", color: { argb: BLACK } } } };
  row = ws.addRow(["", "", "", ""]);
  row.height = 18;
  row.getCell(1).style = sigLineStyle;
  row.getCell(2).style = sigLineStyle;
  row.getCell(4).style = sigLineStyle;

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