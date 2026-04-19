import { Router } from "express";
import { listCaseFlowAccountCode } from "./controller.js";

const router = Router();
router.get("/", listCaseFlowAccountCode);

export default router;
