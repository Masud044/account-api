import { Router } from "express";
import { createReceive } from "./controller.js";

const router = Router();
router.post("/", createReceive);

export default router;
