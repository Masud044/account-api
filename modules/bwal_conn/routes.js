import { Router } from "express";
import { checkBwalConn } from "./controller.js";

const router = Router();
router.get("/health", checkBwalConn);

export default router;
