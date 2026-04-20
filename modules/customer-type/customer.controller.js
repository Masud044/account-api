import { getActiveCustomers } from "./customer.service.js";

/**
 * GET /api/customer
 * Returns all active customers — mirrors the original PHP response shape.
 *
 * Success:  { success: 1, count: N, data: [...] }
 * Failure:  { success: 0, error: "..." }
 */
export async function getAllCustomers(req, res) {
  try {
    const data = await getActiveCustomers();

    return res.status(200).json({
      success: true,
      count:   data.length,
      data,
    });
  } catch (err) {
    console.error("[customer.controller] getAllCustomers error:", err.message);

    return res.status(500).json({
      success: 0,
      error:   "Failed to retrieve customers.",
    });
  }
}