import { Router } from "express";
import { getAllCustomers } from "./customer.controller.js";

const router = Router();

// GET /api/customer  →  all active customers
router.get("/", getAllCustomers);

export default router;