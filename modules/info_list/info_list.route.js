import { Router } from "express";
import { listInfo } from "./info_list.controller.js";

const router = Router();

// GET /api/info-list
router.get("/", listInfo);

export default router;
