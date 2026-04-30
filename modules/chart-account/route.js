import { Router } from "express";
import {
  addChartAccountHandler,
  getAllChartAccountsHandler,
  getChartAccountByIdHandler,
  updateChartAccountHandler,
} from "../chart-account/controller.js";

const router = Router();

// GET  /api/chart-account           → all accounts (optional ?enabled=1 &lebel=2)
router.get("/", getAllChartAccountsHandler);

// GET  /api/chart-account/:id       → single account by primary key
router.get("/:id", getChartAccountByIdHandler);

// POST /api/chart-account/add       → create new account
router.post("/add", addChartAccountHandler);

// PUT  /api/chart-account/:id       → partial update
router.put("/:id", updateChartAccountHandler);

export default router;