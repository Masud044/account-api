import { createAdminUser, deleteAdminUser, listAdminUser, updateAdminUser } from "./service.js";

export async function handleAdminUser(req, res) {
  try {
    if (req.method === "POST") {
      await createAdminUser(req.body);
      return res.status(201).json({ success: true, message: "Admin user created successfully." });
    }
    if (req.method === "GET") {
      const data = await listAdminUser(req.query.id);
      if (req.query.id && !data.length) return res.status(404).json({ success: false, message: "Admin user not found." });
      return res.json({ success: true, data });
    }
    if (req.method === "PUT") {
      if (!req.body?.ID) return res.status(400).json({ success: false, message: "ID is required for update in the request body." });
      const rows = await updateAdminUser(req.body);
      if (!rows) return res.status(404).json({ success: false, message: "Admin user ID not found or no data changed." });
      return res.json({ success: true, message: "Admin user updated successfully." });
    }
    if (req.method === "DELETE") {
      if (!req.query.id) return res.status(400).json({ success: false, message: "ID is required for deletion (in query string)." });
      const rows = await deleteAdminUser(req.query.id);
      if (!rows) return res.status(404).json({ success: false, message: "Admin user ID not found." });
      return res.json({ success: true, message: "Admin user deleted successfully." });
    }
    return res.status(405).json({ success: false, message: "Method not supported." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
