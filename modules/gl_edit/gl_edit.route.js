import { Router } from "express";
import { editGlEntry } from "./gl_edit.controller.js";

const router = Router();

// PUT /api/gl/edit
router.put("/", editGlEntry);

export default router;
