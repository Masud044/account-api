import { Router } from "express";
import { handleReceipt } from "./controller.js";

const router = Router();
router.all("/", handleReceipt);

export default router;
