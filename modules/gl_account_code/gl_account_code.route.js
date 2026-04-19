import { Router } from "express";
import { listGlAccountCodes } from "./gl_account_code.controller.js";

const router = Router();

// GET /api/gl/account-code
router.get("/", listGlAccountCodes);

export default router;
