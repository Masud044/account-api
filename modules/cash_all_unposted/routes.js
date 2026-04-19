import { Router } from "express";
import { getCashAllUnposted } from "./controller.js";

const router = Router();
router.get("/", getCashAllUnposted);

export default router;
