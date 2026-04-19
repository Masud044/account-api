import { Router } from "express";
import { listCalendar } from "./controller.js";

const router = Router();
router.get("/", listCalendar);

export default router;
