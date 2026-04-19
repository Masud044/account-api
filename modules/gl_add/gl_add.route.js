import { Router } from "express";
import { addGlEntry } from "./gl_add.controller.js";

const router = Router();

// POST /api/gl
router.post("/", addGlEntry);

export default router;
