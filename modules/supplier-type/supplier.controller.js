import { getActiveSuppliers } from "./supplier.service.js";

/**
 * GET /api/supplier
 * Returns all active suppliers formatted like the original PHP response.
 */
export async function getAllSuppliers(req, res) {
  try {
    const data = await getActiveSuppliers();

    return res.status(200).json({
      success: true,
      count:   data.length,
      data,
    });
  } catch (err) {
    console.error("[supplier.controller] getAllSuppliers error:", err.message);

    return res.status(500).json({
      success: 0,
      error:   "Failed to retrieve suppliers.",
    });
  }
}