import { Router } from "express";
import { handlePayment } from "./controller.js";

const router = Router();
router.all("/", handlePayment);

export default router;
