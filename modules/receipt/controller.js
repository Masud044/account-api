// import { deleteReceipt, insertReceipt, searchReceipt, updateReceipt } from "./service.js";

// export async function handleReceipt(req, res) {
//   try {
//     const action = String(req.body?.action || req.query?.action || "").toLowerCase();

//     if (action === "search") {
//       const data = await searchReceipt(req.body?.id || req.query?.id);
//       return res.json({ status: "success", ...data });
//     }
//     if (action === "insert") {
//       const data = await insertReceipt(req.body);
//       return res.json({ status: "success", message: "Inserted successfully", ...data });
//     }
//     if (action === "update") {
//       const data = await updateReceipt(req.body);
//       return res.json({ status: "success", message: "Updated successfully", ...data });
//     }
//     if (action === "delete") {
//       await deleteReceipt(req.body?.masterID);
//       return res.json({ status: "success", message: "Deleted successfully" });
//     }

//     return res.status(400).json({ status: "error", message: "Unknown action" });
//   } catch (error) {
//     return res.status(500).json({ status: "error", message: error.message });
//   }
// }


import { deleteReceipt, insertReceipt, searchReceipt, updateReceipt } from "./service.js";

export async function handleReceipt(req, res) {
  try {
    const action = String(req.body?.action || req.query?.action || "").toLowerCase();

    if (action === "search") {
      const data = await searchReceipt(req.body?.id || req.query?.id);
      return res.json({ status: "success", ...data });
    }
    if (action === "insert") {
      const data = await insertReceipt(req.body);
      return res.json({ status: "success", message: "Inserted successfully", ...data });
    }
    if (action === "update") {
      const data = await updateReceipt(req.body);
      return res.json({ status: "success", message: "Updated successfully", ...data });
    }
    if (action === "delete") {
      await deleteReceipt(req.body?.masterID);
      return res.json({ status: "success", message: "Deleted successfully" });
    }

    return res.status(400).json({ status: "error", message: "Unknown action" });
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ status: "error", message: error.message });
  }
}
