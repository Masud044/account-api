// routes/voucherDownloadRoute.js
import { Router }           from "express";
import { downloadVoucher }  from "./controller.js";

const router = Router();

/**
 * GET /api/voucher/download/:id?type=pdf
 * GET /api/voucher/download/:id?type=excel
 */
router.get("/download/:id", downloadVoucher);

export default router;