import {
  createGldoc,
  getGldocs,
  getGldocFile,
  updateGldoc,
  deleteGldoc,
} from "./service.js";

export async function handleGldoc(req, res) {
  try {
    // ── POST /api/gldoc ───────────────────────────────────────────────────────
    if (req.method === "POST") {
      const { GLMASTERID, CREATION_BY } = req.body || {};

      if (!GLMASTERID) {
        return res.status(400).json({
          success: false,
          message: "GLMASTERID is required.",
        });
      }

      // File comes from multer as req.file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded. Send file as multipart/form-data field 'doc_file'.",
        });
      }

      const rows = await createGldoc({
        DOC_FILE:    req.file.buffer,   // Buffer from multer memoryStorage
        CREATION_BY: CREATION_BY ?? null,
        GLMASTERID:  Number(GLMASTERID),
      });

      return res.status(201).json({
        success: true,
        message: "Document uploaded successfully.",
        rowsAffected: rows,
      });
    }

    // ── GET /api/gldoc ────────────────────────────────────────────────────────
    // Query params: ?id=1  |  ?glmaster_id=5
    if (req.method === "GET") {
      const { id, glmaster_id } = req.query;

      // Download raw file blob: GET /api/gldoc?id=1&file=true
      if (id && req.query.file === "true") {
        const doc = await getGldocFile(id);
        if (!doc || !doc.buffer) {
          return res.status(404).json({ success: false, message: "File not found." });
        }
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="gldoc_${id}"`);
        return res.send(doc.buffer);
      }

      const rows = await getGldocs({ id, glmasterId: glmaster_id });

      if (id && !rows.length) {
        return res.status(404).json({ success: false, message: "Document not found." });
      }

      return res.json({ success: true, data: rows });
    }

    // ── PUT /api/gldoc ────────────────────────────────────────────────────────
    if (req.method === "PUT") {
      const id = req.body?.ID || req.query.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID is required for update.",
        });
      }

      const updateData = {
        UPDATED_BY: req.body?.UPDATED_BY ?? null,
        GLMASTERID: req.body?.GLMASTERID,
      };

      if (req.file) {
        updateData.DOC_FILE = req.file.buffer;
      }

      const rows = await updateGldoc(id, updateData);

      if (!rows) {
        return res.status(404).json({
          success: false,
          message: "Document not found or no data changed.",
        });
      }

      return res.json({ success: true, message: "Document updated successfully." });
    }

    // ── DELETE /api/gldoc ─────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const id = req.body?.ID || req.query.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID is required for deletion.",
        });
      }

      const rows = await deleteGldoc(id);

      if (!rows) {
        return res.status(404).json({
          success: false,
          message: "Document not found.",
        });
      }

      return res.json({ success: true, message: "Document deleted successfully." });
    }

    return res.status(405).json({ success: false, message: "Method not supported." });

  } catch (err) {
    console.error("[GLDOC] Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error.",
    });
  }
}