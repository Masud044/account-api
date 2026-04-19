import { Router } from "express";
import { listUnpostedReceipts } from "./receive_all_unposted.controller.js";

const router = Router();

// GET /api/receive/all-unposted
router.get("/", listUnpostedReceipts);

export default router;
