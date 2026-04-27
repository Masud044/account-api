// modules/cash-transfer-pdf-get/controller.js
import { getCashTransferFullDetails } from "../cash-report/service.js";
import { generateCashTransferPDF }    from "../cash-pdf-excel/pdf-generate.js";
import { generateCashTransferExcel }  from "../cash-pdf-excel/excel-generate.js";

/**
 * GET /api/cash-transfer/download/:id?type=pdf|excel
 */
export async function downloadCashTransfer(req, res) {
  const { id }   = req.params;
  const { type } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: "Invalid cash transfer ID." });
  }

  const fileType = (type || "").toLowerCase();
  if (!["pdf", "excel"].includes(fileType)) {
    return res.status(400).json({
      success: false,
      message: 'Query param "type" must be "pdf" or "excel".',
    });
  }

  try {
    const voucherData = await getCashTransferFullDetails(Number(id));
    const voucherNo   = voucherData.master.VOUCHERNO || `cash_transfer_${id}`;

    if (fileType === "pdf") {
      const buffer = await generateCashTransferPDF(voucherData);
      res.setHeader("Content-Type",        "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="cash_transfer_${voucherNo}.pdf"`);
      res.setHeader("Content-Length",      buffer.length);
      return res.end(buffer);
    }

    const buffer = await generateCashTransferExcel(voucherData);
    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="cash_transfer_${voucherNo}.xlsx"`);
    res.setHeader("Content-Length",      buffer.length);
    return res.end(buffer);

  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, message: err.message });
    }
    console.error("[downloadCashTransfer] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate file.",
      detail:  err.message,
    });
  }
}