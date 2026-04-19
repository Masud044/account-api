import { Router } from "express";
import { listUnpostedPayments } from "./pay_all_unposted.controller.js";

const router = Router();

// GET /api/payment/all-unposted
router.get("/", listUnpostedPayments);

export default router;
