import { Router } from "express";
import { viewGlEntry } from "./gl_view.controller.js";

const router = Router();

// GET /api/gl/view/:id
router.get("/:id", viewGlEntry);

export default router;
