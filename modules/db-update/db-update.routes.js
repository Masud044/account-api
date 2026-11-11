import express from "express";
import { login, checkRateLimit, requireDbUpdateToken } from "./db-update.middleware.js";
import { execute } from "./db-update.controller.js";

const router = express.Router();

router.post("/login", checkRateLimit, login);
router.post("/execute", requireDbUpdateToken, execute);

export default router;
