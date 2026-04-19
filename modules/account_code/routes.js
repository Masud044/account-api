import { Router } from "express";
import { listAccountCode } from "./controller.js";

const router = Router();
router.get("/", listAccountCode);

export default router;
