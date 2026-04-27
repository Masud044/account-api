// generators/pdfGenerator.js
import puppeteer from "puppeteer";

// ─── Number formatter ─────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const safe = (v) => (v == null ? "" : String(v).trim());

// ─── HTML Template ────────────────────────────────────────────────────────────
function buildHtml({ master, details, summary }) {
  const m = master;

  // Only debit lines go into the table (credit row is the payment account)
  const debitLines = details.filter((d) => Number(d.DEBIT || 0) > 0);

  const tableRows = debitLines
    .map(
      (d) => `
      <tr>
        <td class="col-code">${safe(d.CODE)}</td>
        <td class="col-particulars">
          ${safe(d.ACCOUNT_NAME || d.CODEDESCRIPTION) || safe(d.CODE)}
          ${safe(d.DESCRIPTION) ? `<span class="sub-desc"> – ${safe(d.DESCRIPTION)}</span>` : ""}
        </td>
        <td class="col-amount">${fmt(d.DEBIT)}</td>
      </tr>`
    )
    .join("");

  const supportingText = safe(m.SUPPORTING)
    ? `${safe(m.SUPPORTING)} Doc(s)`
    : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #111;
    background: #fff;
    padding: 30px 36px;
  }

  /* ── Top title block ──────────────────────────────────────────────── */
  .doc-title {
    text-align: center;
    margin-bottom: 2px;
  }
  .doc-title h1 {
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #111;
  }
  .doc-title .subtitle {
    font-size: 9pt;
    color: #555;
    margin-top: 2px;
    letter-spacing: 1px;
  }

  /* ── Dividers ─────────────────────────────────────────────────────── */
  .divider-thick {
    border: none;
    border-top: 2.5px solid #111;
    margin: 8px 0 4px;
  }
  .divider-thin {
    border: none;
    border-top: 1px solid #111;
    margin: 4px 0 8px;
  }

  /* ── Meta info grid ───────────────────────────────────────────────── */
  .meta-grid {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }
  .meta-grid td {
    padding: 3px 6px 3px 0;
    font-size: 10pt;
    vertical-align: top;
    white-space: nowrap;
  }
  .meta-grid .label {
    font-weight: 700;
    color: #111;
    padding-right: 4px;
  }
  .meta-grid .value {
    color: #222;
    padding-right: 24px;
  }

  /* ── Description block ────────────────────────────────────────────── */
  .desc-block {
    margin-bottom: 12px;
  }
  .desc-block .desc-label {
    font-weight: 700;
    font-size: 10pt;
    margin-bottom: 3px;
  }
  .desc-block .desc-value {
    font-size: 10pt;
    color: #222;
    padding-left: 4px;
  }

  /* ── Entry table ──────────────────────────────────────────────────── */
  .entry-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
  }
  .entry-table thead tr {
    background: #111;
    color: #fff;
  }
  .entry-table thead th {
    padding: 7px 10px;
    font-size: 9.5pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-align: left;
  }
  .entry-table thead th.col-amount {
    text-align: right;
  }
  .entry-table tbody tr {
    border-bottom: 1px solid #ddd;
  }
  .entry-table tbody tr:nth-child(even) {
    background: #f8f8f8;
  }
  .entry-table tbody td {
    padding: 7px 10px;
    font-size: 10pt;
    vertical-align: top;
  }
  .col-code        { width: 22%; }
  .col-particulars { width: 56%; }
  .col-amount      { width: 22%; text-align: right; }

  .sub-desc {
    font-size: 8.5pt;
    color: #555;
  }

  /* ── Total row ────────────────────────────────────────────────────── */
  .total-row {
    border-top: 2px solid #111;
    background: #fff !important;
  }
  .total-row td {
    padding: 8px 10px;
    font-weight: 700;
    font-size: 10.5pt;
  }
  .total-label { text-align: right; padding-right: 16px !important; }

  /* ── Signature footer ─────────────────────────────────────────────── */
  .sig-section {
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
  }
  .sig-box {
    width: 30%;
    text-align: center;
  }
  .sig-line {
    border-top: 1.5px solid #111;
    margin-bottom: 6px;
  }
  .sig-label {
    font-size: 9.5pt;
    font-weight: 700;
    color: #333;
  }
</style>
</head>
<body>

  <!-- Title -->
  <div class="doc-title">
    <h1>Payment Voucher</h1>
    <div class="subtitle">Internal Record</div>
  </div>

  <hr class="divider-thick"/>
  <hr class="divider-thin"/>

  <!-- Meta info -->
  <table class="meta-grid">
    <tbody>
      <tr>
        <td class="label">Supplier:</td>
        <td class="value">${safe(m.SUPPLIER_NAME) || safe(m.CUSTOMER_ID)}</td>
        <td class="label">Date:</td>
        <td class="value">${safe(m.TRANS_DATE)}</td>
      </tr>
      <tr>
        <td class="label">Invoice No:</td>
        <td class="value">${safe(m.VOUCHERNO)}</td>
        <td class="label">GL Date:</td>
        <td class="value">${safe(m.GL_ENTRY_DATE)}</td>
      </tr>
      <tr>
        <td class="label">Voucher No:</td>
        <td class="value">PV-${safe(m.VOUCHERNO)}</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td class="label">Payment Code:</td>
         <td class="value">${safe(m.CASH_ACCOUNT_NAME) || safe(m.CASHACCOUNT)}</td>
        <td class="label">Supporting:</td>
        <td class="value">${supportingText}</td>
      </tr>
    </tbody>
  </table>

  <!-- Description -->
  <div class="desc-block">
    <div class="desc-label">Description / Particulars:</div>
    <div class="desc-value">${safe(m.DESCRIPTION) || "—"}</div>
  </div>

  <!-- Entry table -->
  <table class="entry-table">
    <thead>
      <tr>
        <th class="col-code">Account Code</th>
        <th class="col-particulars">Particulars</th>
        <th class="col-amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || `<tr><td colspan="3" style="text-align:center;padding:12px;color:#888;">No entries found</td></tr>`}
      <!-- Total -->
      <tr class="total-row">
        <td colspan="2" class="total-label">Total Amount (USD)</td>
        <td class="col-amount">${fmt(summary.totalDebit || summary.totalCredit)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Signatures -->
  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Prepared By</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Checked By</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>
    </div>
  </div>

</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a PDF Buffer from voucher data.
 * @param {object} voucherData  – { master, details, summary }
 * @returns {Promise<Buffer>}
 */
export async function generatePDF(voucherData) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const html = buildHtml(voucherData);

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}