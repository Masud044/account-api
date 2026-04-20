import { Router } from "express";
import { getAllSuppliers } from "./supplier.controller.js";

const router = Router();

// GET /api/supplier  →  all active suppliers
router.get("/", getAllSuppliers);

export default router;