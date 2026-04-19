import { Router } from "express";
import { listAllUnpostedGl } from "./gl_all_unposted.controller.js";

const router = Router();

// GET /api/gl/all-unposted
router.get("/", listAllUnpostedGl);

export default router;
