import { Router } from "express";
import { getReview } from "./controller.js";

const router = Router();

router.get("/voucher-review/:id", getReview);

export default router;