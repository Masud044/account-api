// controllers/voucherDownloadController.js
import { getVoucherFullDetails } from "./service.js";
import { generatePDF }           from "../payment-pdf-excel/pdf-generate.js";
import { generateExcel }         from "../payment-pdf-excel/excel-generate.js";

/**
 * GET /api/voucher/download/:id?type=pdf|excel
 *
 * Downloads a payment voucher as PDF or Excel.
 */
export async function downloadVoucher(req, res) {
  const { id }   = req.params;
  const { type } = req.query; // "pdf" | "excel"

  // ── Validate inputs ────────────────────────────────────────────────────────
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: "Invalid voucher ID." });
  }

  const fileType = (type || "").toLowerCase();
  if (!["pdf", "excel"].includes(fileType)) {
    return res
      .status(400)
      .json({ success: false, message: 'Query param "type" must be "pdf" or "excel".' });
  }

  try {
    // ── Fetch data ───────────────────────────────────────────────────────────
    const voucherData = await getVoucherFullDetails(Number(id));
    const voucherNo   = voucherData.master.VOUCHERNO || `voucher_${id}`;

    // ── Generate & stream file ───────────────────────────────────────────────
    if (fileType === "pdf") {
      const pdfBuffer = await generatePDF(voucherData);

      res.setHeader("Content-Type",        "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payment_voucher_${voucherNo}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      return res.end(pdfBuffer);
    }

    // Excel
    const excelBuffer = await generateExcel(voucherData);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payment_voucher_${voucherNo}.xlsx"`
    );
    res.setHeader("Content-Length", excelBuffer.length);
    return res.end(excelBuffer);

  } catch (err) {
    // 404 thrown by service when voucher is not found
    if (err.status === 404) {
      return res.status(404).json({ success: false, message: err.message });
    }

    console.error("[downloadVoucher] Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate file. Please try again." });
  }
}