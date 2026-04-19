import { Router } from "express";
import { listReceiveCodes } from "./receive_code.controller.js";

const router = Router();

// GET /api/receive/code
router.get("/", listReceiveCodes);

export default router;
