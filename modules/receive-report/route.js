// modules/receipt-pdf-get/route.js
import { Router }           from "express";
import { downloadReceipt }  from "../receive-report/controller.js";

const router = Router();

/**
 * GET /api/receipt/download/:id?type=pdf
 * GET /api/receipt/download/:id?type=excel
 */
router.get("/download/:id", downloadReceipt);

export default router;