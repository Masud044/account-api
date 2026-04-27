// modules/receipt-pdf-get/controller.js
import { getReceiptFullDetails }  from "../receive-report/service.js";
import { generateReceiptPDF }     from "../receive-pdf-excel/pdf-generate.js";
import { generateReceiptExcel }   from "../receive-pdf-excel/excel-generate.js";

/**
 * GET /api/receipt/download/:id?type=pdf|excel
 */
export async function downloadReceipt(req, res) {
  const { id }   = req.params;
  const { type } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: "Invalid receipt ID." });
  }

  const fileType = (type || "").toLowerCase();
  if (!["pdf", "excel"].includes(fileType)) {
    return res.status(400).json({
      success: false,
      message: 'Query param "type" must be "pdf" or "excel".',
    });
  }

  try {
    const voucherData = await getReceiptFullDetails(Number(id));
    const voucherNo   = voucherData.master.VOUCHERNO || `receipt_${id}`;

    if (fileType === "pdf") {
      const buffer = await generateReceiptPDF(voucherData);
      res.setHeader("Content-Type",        "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="receipt_voucher_${voucherNo}.pdf"`);
      res.setHeader("Content-Length",      buffer.length);
      return res.end(buffer);
    }

    const buffer = await generateReceiptExcel(voucherData);
    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="receipt_voucher_${voucherNo}.xlsx"`);
    res.setHeader("Content-Length",      buffer.length);
    return res.end(buffer);

  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, message: err.message });
    }
    console.error("[downloadReceipt] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate file.",
      detail:  err.message,
    });
  }
}