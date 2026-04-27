// modules/journal-pdf-get/route.js
import { Router }           from "express";
import { downloadJournal }  from "../gl-report/controller.js";

const router = Router();

/**
 * GET /api/journal/download/:id?type=pdf
 * GET /api/journal/download/:id?type=excel
 */
router.get("/download/:id", downloadJournal);

export default router;