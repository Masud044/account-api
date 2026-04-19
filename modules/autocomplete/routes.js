import { Router } from "express";
import { autocomplete } from "./controller.js";

const router = Router();
router.get("/", autocomplete);

export default router;
