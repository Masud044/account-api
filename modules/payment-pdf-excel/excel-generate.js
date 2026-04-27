// generators/excelGenerator.js
import ExcelJS from "exceljs";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt2 = (n) => Number(Number(n || 0).toFixed(2));
const safe  = (v) => (v == null ? "" : String(v).trim());

// ─── Style presets ────────────────────────────────────────────────────────────
const PURPLE = "FF6D28D9";
const BLACK  = "FF111111";
const WHITE  = "FFFFFFFF";
const LIGHT  = "FFF3F0FB"; // very light purple for alternating rows
const GRAY   = "FFF0F0F0";

const border = (style = "thin") => ({
  top:    { style },
  left:   { style },
  bottom: { style },
  right:  { style },
});

const thStyle = (bgHex = BLACK) => ({
  font:      { bold: true, color: { argb: WHITE }, size: 10 },
  fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgHex } },
  alignment: { vertical: "middle", horizontal: "left", wrapText: true },
  border:    border(),
});

const tdStyle = (bg = "FFFFFFFF", align = "left") => ({
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

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Generate an Excel Buffer from voucher data.
 * @param {object} voucherData – { master, details, summary }
 * @returns {Promise<Buffer>}
 */
export async function generateExcel(voucherData) {
  const { master: m, details, summary } = voucherData;
  const wb = new ExcelJS.Workbook();

  wb.creator  = "HRMS – Accounting";
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Payment Voucher", {
    pageSetup: {
      paperSize:   9, // A4
      orientation: "portrait",
      margins:     { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
  });

  // ── Column widths ────────────────────────────────────────────────────────────
  ws.columns = [
    { key: "A", width: 26 }, // labels / account code
    { key: "B", width: 40 }, // values / particulars
    { key: "C", width: 20 }, // right-side label / amount
    { key: "D", width: 22 }, // right-side value
  ];

  let row;

  // ── Title row ─────────────────────────────────────────────────────────────
  row = ws.addRow(["PAYMENT VOUCHER", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  Object.assign(row.getCell(1), {
    style: {
      font:      { bold: true, size: 16, color: { argb: BLACK } },
      alignment: { horizontal: "center", vertical: "middle" },
    },
  });
  row.height = 32;

  // Subtitle
  row = ws.addRow(["Internal Record", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).style = {
    font:      { size: 9, italic: true, color: { argb: "FF666666" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  row.height = 16;

  // Thick separator (empty row styled with bottom border)
  row = ws.addRow(["", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).border = { bottom: { style: "medium", color: { argb: BLACK } } };
  row.height = 4;

  ws.addRow([]); // spacer

  // ── Meta info pairs ────────────────────────────────────────────────────────
  const supportingText = safe(m.SUPPORTING) ? `${safe(m.SUPPORTING)} Doc(s)` : "—";

  const metaRows = [
    ["Supplier:",     safe(m.SUPPLIER_NAME) || safe(m.CUSTOMER_ID), "Date:",        safe(m.TRANS_DATE)],
    ["Invoice No:",   safe(m.VOUCHERNO),                            "GL Date:",     safe(m.GL_ENTRY_DATE)],
    ["Voucher No:",   `PV-${safe(m.VOUCHERNO)}`,                    "",             ""],
    ["Payment Code:", safe(m.CASH_ACCOUNT_NAME) || safe(m.CASHACCOUNT),                          "Supporting:",  supportingText],
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

  ws.addRow([]); // spacer

  // ── Description ───────────────────────────────────────────────────────────
  row = ws.addRow(["Description / Particulars:", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).style = { font: { bold: true, size: 10 }, alignment: { vertical: "middle" } };
  row.height = 18;

  row = ws.addRow([safe(m.DESCRIPTION) || "—", "", "", ""]);
  ws.mergeCells(`A${row.number}:D${row.number}`);
  row.getCell(1).style = {
    font:      { size: 10 },
    alignment: { vertical: "middle", wrapText: true },
  };
  row.height = 18;

  ws.addRow([]); // spacer

  // ── Table header ──────────────────────────────────────────────────────────
  row = ws.addRow(["ACCOUNT CODE", "PARTICULARS", "AMOUNT", ""]);
  ws.mergeCells(`C${row.number}:D${row.number}`);
  row.height = 22;
  row.getCell(1).style = thStyle();
  row.getCell(2).style = thStyle();
  row.getCell(3).style = { ...thStyle(), alignment: { ...thStyle().alignment, horizontal: "right" } };

  // ── Data rows ──────────────────────────────────────────────────────────────
  const debitLines = details.filter((d) => Number(d.DEBIT || 0) > 0);

  debitLines.forEach((d, i) => {
    const bg = i % 2 === 0 ? WHITE : LIGHT;
    const particulars =
      [safe(d.ACCOUNT_NAME || d.CODEDESCRIPTION) || safe(d.CODE), safe(d.DESCRIPTION)]
        .filter(Boolean)
        .join(" – ");

    row = ws.addRow([safe(d.CODE), particulars, fmt2(d.DEBIT), ""]);
    ws.mergeCells(`C${row.number}:D${row.number}`);
    row.height = 18;
    row.getCell(1).style = tdStyle(bg, "left");
    row.getCell(2).style = tdStyle(bg, "left");
    row.getCell(3).style = tdStyle(bg, "right");

    // Format amount cell as number
    row.getCell(3).numFmt = '#,##0.00';
  });

  // ── Total row ─────────────────────────────────────────────────────────────
  const total = fmt2(summary.totalDebit || summary.totalCredit);
  row = ws.addRow(["", "Total Amount (USD)", total, ""]);
  ws.mergeCells(`C${row.number}:D${row.number}`);
  row.height = 22;
  row.getCell(1).style = totalStyle("left");
  row.getCell(2).style = { ...totalStyle("right"), font: { bold: true, size: 10.5 } };
  row.getCell(3).style = totalStyle("right");
  row.getCell(3).numFmt = '#,##0.00';

  // ── Spacer rows before signatures ─────────────────────────────────────────
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);

  // ── Signature row ─────────────────────────────────────────────────────────
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

  // ── Print area & freeze ────────────────────────────────────────────────────
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}