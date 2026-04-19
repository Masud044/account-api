import { Router } from "express";
import { config, health } from "./controller.js";

const router = Router();
router.get("/health", health);
router.get("/config", config);

export default router;
