import { Router } from "express";
import { handleAdminUser } from "./controller.js";

const router = Router();
router.all("/", handleAdminUser);

export default router;
