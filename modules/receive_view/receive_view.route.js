import { Router } from "express";
import { viewReceive } from "./receive_view.controller.js";

const router = Router();

// GET /api/receive/:id
router.get("/:id", viewReceive);

export default router;
