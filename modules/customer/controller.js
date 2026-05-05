import { createCustomer, getCustomers, updateCustomer, deleteCustomer } from "./service.js";

export async function handleCustomer(req, res) {
 // controller.js
if (req.method === "POST") {
  if (!req.body?.CUSTOMER_NAME) {
    return res.status(400).json({
      success: false,
      message: "Missing required field: CUSTOMER_NAME."
    });
  }
  await createCustomer(req.body);
  return res.status(201).json({ success: true, message: "Customer inserted successfully." });
}
  if (req.method === "GET") {
    const rows = await getCustomers(req.query.customer_id);
    if (req.query.customer_id && !rows.length) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    return res.json({ success: true, data: rows });
  }
 if (req.method === "PUT") {
  if (!req.body?.CUSTOMER_ID) {
    return res.status(400).json({ success: false, message: "CUSTOMER_ID is required for update." });
  }
  // ❌ এই check টা সরাও
  // if (req.body.UPDATE_BY === undefined || req.body.UPDATE_BY === null) { ... }

  const rows = await updateCustomer(req.body);
  if (!rows) return res.status(404).json({ success: false, message: "Customer ID not found or no data changed." });
  return res.json({ success: true, message: "Customer updated successfully." });
}
 // controller.js - DELETE fix
if (req.method === "DELETE") {
  const customerId = req.body?.CUSTOMER_ID || req.query.customer_id; // ✅
  if (!customerId) {
    return res.status(400).json({ success: false, message: "CUSTOMER_ID is required." });
  }
  const rows = await deleteCustomer(customerId);
  if (!rows) return res.status(404).json({ success: false, message: "Customer not found." });
  return res.json({ success: true, message: "Customer deleted successfully." });
}
  return res.status(405).json({ success: false, message: "Method not supported." });
}
