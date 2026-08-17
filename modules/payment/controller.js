// import { deletePayment, insertPayment, searchPayment, updatePayment } from "./service.js";

// export async function handlePayment(req, res) {
//   try {
//     const action = String(req.body?.action || req.query?.action || "").toLowerCase();
//     if (action === "search") return res.json({ status: "success", ...(await searchPayment(req.body?.id || req.query?.id)) });
//     if (action === "insert") return res.json({ status: "success", message: "Inserted successfully", ...(await insertPayment(req.body)) });
//     if (action === "update") return res.json({ status: "success", message: "Updated successfully", ...(await updatePayment(req.body)) });
//     if (action === "delete") {
//       await deletePayment(req.body?.masterID);
//       return res.json({ status: "success", message: "Deleted successfully" });
//     }
//     return res.status(400).json({ status: "error", message: "Unknown action" });
//   } catch (error) {
//     return res.status(500).json({ status: "error", message: error.message });
//   }
// }


import { deletePayment, insertPayment, searchPayment, updatePayment } from "./service.js";

export async function handlePayment(req, res) {
  try {
    const action = String(req.body?.action || req.query?.action || "").toLowerCase();
    if (action === "search") return res.json({ status: "success", ...(await searchPayment(req.body?.id || req.query?.id)) });
    if (action === "insert") return res.json({ status: "success", message: "Inserted successfully", ...(await insertPayment(req.body)) });
    if (action === "update") return res.json({ status: "success", message: "Updated successfully", ...(await updatePayment(req.body)) });
    if (action === "delete") {
      await deletePayment(req.body?.masterID);
      return res.json({ status: "success", message: "Deleted successfully" });
    }
    return res.status(400).json({ status: "error", message: "Unknown action" });
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ status: "error", message: error.message });
  }
}