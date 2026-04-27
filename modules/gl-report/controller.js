// modules/journal-pdf-get/controller.js
import { getJournalFullDetails }  from "../gl-report/service.js";
import { generateJournalPDF }     from "../gl-pdf-excel/pdf-generate.js";
import { generateJournalExcel }   from "../gl-pdf-excel/excel-generate.js";

/**
 * GET /api/journal/download/:id?type=pdf|excel
 */
export async function downloadJournal(req, res) {
  const { id }   = req.params;
  const { type } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: "Invalid journal ID." });
  }

  const fileType = (type || "").toLowerCase();
  if (!["pdf", "excel"].includes(fileType)) {
    return res.status(400).json({
      success: false,
      message: 'Query param "type" must be "pdf" or "excel".',
    });
  }

  try {
    const voucherData = await getJournalFullDetails(Number(id));
    const voucherNo   = voucherData.master.VOUCHERNO || `journal_${id}`;

    if (fileType === "pdf") {
      const buffer = await generateJournalPDF(voucherData);
      res.setHeader("Content-Type",        "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="journal_voucher_${voucherNo}.pdf"`);
      res.setHeader("Content-Length",      buffer.length);
      return res.end(buffer);
    }

    const buffer = await generateJournalExcel(voucherData);
    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="journal_voucher_${voucherNo}.xlsx"`);
    res.setHeader("Content-Length",      buffer.length);
    return res.end(buffer);

  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, message: err.message });
    }
    console.error("[downloadJournal] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate file.",
      detail:  err.message,
    });
  }
}