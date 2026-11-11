import { Router } from "express";
import { balanceSheet } from "./controller.js";

const router = Router();

router.get("/", balanceSheet);

export default router;