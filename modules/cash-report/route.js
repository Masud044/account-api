// modules/cash-transfer-pdf-get/route.js
import { Router }                from "express";
import { downloadCashTransfer }  from "../cash-report/controller.js";

const router = Router();

/**
 * GET /api/cash-transfer/download/:id?type=pdf
 * GET /api/cash-transfer/download/:id?type=excel
 */
router.get("/download/:id", downloadCashTransfer);

export default router;