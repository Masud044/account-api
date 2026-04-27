// modules/cash-transfer-pdf-get/pdfGenerator.js
import puppeteer from "puppeteer";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const safe = (v) => (v == null ? "" : String(v).trim());

// ─── HTML Template ────────────────────────────────────────────────────────────
function buildHtml({ master, debitRow, creditRow, summary }) {
  const m = master;

  const fromName = safe(creditRow.ACCOUNT_NAME || creditRow.CODEDESCRIPTION) || safe(creditRow.CODE);
  const toName   = safe(debitRow.ACCOUNT_NAME  || debitRow.CODEDESCRIPTION)  || safe(debitRow.CODE);
  const supportingText = safe(m.SUPPORTING) ? `${safe(m.SUPPORTING)} Doc(s)` : "—";

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

  .doc-title { text-align: center; margin-bottom: 2px; }
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

  .divider-thick { border: none; border-top: 2.5px solid #111; margin: 8px 0 4px; }
  .divider-thin  { border: none; border-top: 1px solid #111;   margin: 4px 0 8px; }

  /* ── Meta grid ── */
  .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .meta-grid td { padding: 3px 6px 3px 0; font-size: 10pt; vertical-align: top; white-space: nowrap; }
  .meta-grid .label { font-weight: 700; color: #111; padding-right: 4px; }
  .meta-grid .value { color: #222; padding-right: 24px; }

  /* ── Description ── */
  .desc-block { margin-bottom: 16px; }
  .desc-block .desc-label { font-weight: 700; font-size: 10pt; margin-bottom: 3px; }
  .desc-block .desc-value { font-size: 10pt; color: #222; padding-left: 4px; }

  /* ── Transfer box ── */
  .transfer-box {
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 20px;
  }
  .transfer-box .transfer-header {
    background: #111;
    color: #fff;
    padding: 7px 14px;
    font-size: 9.5pt;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .transfer-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid #eee;
  }
  .transfer-row:last-child { border-bottom: none; }
  .transfer-row:nth-child(even) { background: #f8f8f8; }

  .transfer-cell {
    padding: 10px 14px;
    font-size: 10pt;
    flex: 1;
  }
  .transfer-cell.label-cell {
    font-weight: 700;
    color: #444;
    flex: 0 0 160px;
    border-right: 1px solid #eee;
    background: #fafafa;
  }
  .transfer-cell.arrow-cell {
    flex: 0 0 36px;
    text-align: center;
    font-size: 14pt;
    color: #6d28d9;
    border-right: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Amount box ── */
  .amount-section {
    border-top: 2px solid #111;
    padding: 10px 14px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 20px;
    background: #f9f9f9;
  }
  .amount-label { font-weight: 700; font-size: 10.5pt; }
  .amount-value { font-weight: 700; font-size: 11pt; min-width: 100px; text-align: right; }

  /* ── Signatures ── */
  .sig-section {
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
  }
  .sig-box   { width: 30%; text-align: center; }
  .sig-line  { border-top: 1.5px solid #111; margin-bottom: 6px; }
  .sig-label { font-size: 9.5pt; font-weight: 700; color: #333; }
</style>
</head>
<body>

  <!-- Title -->
  <div class="doc-title">
    <h1>Cash Transfer Voucher</h1>
    <div class="subtitle">Internal Record</div>
  </div>

  <hr class="divider-thick"/>
  <hr class="divider-thin"/>

  <!-- Meta info -->
  <table class="meta-grid">
    <tbody>
      <tr>
        <td class="label">Voucher No:</td>
        <td class="value">CT-${safe(m.VOUCHERNO)}</td>
        <td class="label">Date:</td>
        <td class="value">${safe(m.TRANS_DATE)}</td>
      </tr>
      <tr>
        <td class="label">GL Date:</td>
        <td class="value">${safe(m.GL_ENTRY_DATE)}</td>
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

  <!-- Transfer details box -->
  <div class="transfer-box">
    <div class="transfer-header">Transfer Details</div>

    <!-- From Account -->
    <div class="transfer-row">
      <div class="transfer-cell label-cell">From Account</div>
      <div class="transfer-cell">
        <strong>${safe(creditRow.CODE)}</strong>
        ${fromName ? ` &nbsp;–&nbsp; ${fromName}` : ""}
      </div>
    </div>

    <!-- Arrow -->
    <div class="transfer-row" style="background:#fdf4ff;">
      <div class="transfer-cell label-cell" style="background:#fdf4ff;"></div>
      <div class="transfer-cell" style="text-align:center; font-size:16pt; color:#6d28d9; padding:6px;">&#8595;</div>
    </div>

    <!-- To Account -->
    <div class="transfer-row">
      <div class="transfer-cell label-cell">To Account</div>
      <div class="transfer-cell">
        <strong>${safe(debitRow.CODE)}</strong>
        ${toName ? ` &nbsp;–&nbsp; ${toName}` : ""}
      </div>
    </div>
  </div>

  <!-- Amount -->
  <div class="amount-section">
    <span class="amount-label">Transfer Amount (USD)</span>
    <span class="amount-value">${fmt(summary.amount)}</span>
  </div>

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
export async function generateCashTransferPDF(voucherData) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
    ],
  });

  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(buildHtml(voucherData), { waitUntil: "load", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 300));

    const pdfBuffer = await page.pdf({
      format:          "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    return pdfBuffer;
  } finally {
    if (page) await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}