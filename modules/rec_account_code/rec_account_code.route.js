import { Router } from "express";
import { listRecAccountCodes } from "./rec_account_code.controller.js";

const router = Router();

// GET /api/receive/account-code
router.get("/", listRecAccountCodes);

export default router;
