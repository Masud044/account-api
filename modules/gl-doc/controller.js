// import {
//   createGldoc,
//   getGldocs,
//   getGldocFile,
//   updateGldoc,
//   deleteGldoc,
// } from "./service.js";

// export async function handleGldoc(req, res) {
//   try {
//     // ── POST /api/gldoc ───────────────────────────────────────────────────────
//     if (req.method === "POST") {
//       const { GLMASTERID, CREATION_BY } = req.body || {};

//       if (!GLMASTERID) {
//         return res.status(400).json({
//           success: false,
//           message: "GLMASTERID is required.",
//         });
//       }

//       // File comes from multer as req.file
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           message: "No file uploaded. Send file as multipart/form-data field 'doc_file'.",
//         });
//       }

//       const rows = await createGldoc({
//         DOC_FILE:    req.file.buffer,   // Buffer from multer memoryStorage
//         CREATION_BY: CREATION_BY ?? null,
//         GLMASTERID:  Number(GLMASTERID),
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Document uploaded successfully.",
//         rowsAffected: rows,
//       });
//     }

//     // ── GET /api/gldoc ────────────────────────────────────────────────────────
//     // Query params: ?id=1  |  ?glmaster_id=5
//     if (req.method === "GET") {
//       const { id, glmaster_id } = req.query;

//       // Download raw file blob: GET /api/gldoc?id=1&file=true
//       if (id && req.query.file === "true") {
//         const doc = await getGldocFile(id);
//         if (!doc || !doc.buffer) {
//           return res.status(404).json({ success: false, message: "File not found." });
//         }
//         res.setHeader("Content-Type", "application/octet-stream");
//         res.setHeader("Content-Disposition", `attachment; filename="gldoc_${id}"`);
//         return res.send(doc.buffer);
//       }

//       const rows = await getGldocs({ id, glmasterId: glmaster_id });

//       if (id && !rows.length) {
//         return res.status(404).json({ success: false, message: "Document not found." });
//       }

//       return res.json({ success: true, data: rows });
//     }

//     // ── PUT /api/gldoc ────────────────────────────────────────────────────────
//     if (req.method === "PUT") {
//       const id = req.body?.ID || req.query.id;

//       if (!id) {
//         return res.status(400).json({
//           success: false,
//           message: "ID is required for update.",
//         });
//       }

//       const updateData = {
//         UPDATED_BY: req.body?.UPDATED_BY ?? null,
//         GLMASTERID: req.body?.GLMASTERID,
//       };

//       if (req.file) {
//         updateData.DOC_FILE = req.file.buffer;
//       }

//       const rows = await updateGldoc(id, updateData);

//       if (!rows) {
//         return res.status(404).json({
//           success: false,
//           message: "Document not found or no data changed.",
//         });
//       }

//       return res.json({ success: true, message: "Document updated successfully." });
//     }

//     // ── DELETE /api/gldoc ─────────────────────────────────────────────────────
//     if (req.method === "DELETE") {
//       const id = req.body?.ID || req.query.id;

//       if (!id) {
//         return res.status(400).json({
//           success: false,
//           message: "ID is required for deletion.",
//         });
//       }

//       const rows = await deleteGldoc(id);

//       if (!rows) {
//         return res.status(404).json({
//           success: false,
//           message: "Document not found.",
//         });
//       }

//       return res.json({ success: true, message: "Document deleted successfully." });
//     }

//     return res.status(405).json({ success: false, message: "Method not supported." });

//   } catch (err) {
//     console.error("[GLDOC] Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || "Internal server error.",
//     });
//   }
// }

import {
  createGldoc,
  getGldocs,
  getGldocFile,
  updateGldoc,
  deleteGldoc,
} from "./service.js";

// ── mime → file extension map (fallback when FILE_NAME has none) ─────────────
const EXT_BY_MIME = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

function buildDownloadName(doc) {
  if (doc.fileName) return doc.fileName;
  const ext = EXT_BY_MIME[doc.fileType] || "bin";
  return `gldoc_${doc.id}.${ext}`;
}

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
        DOC_FILE:    req.file.buffer,       // Buffer from multer memoryStorage
        FILE_TYPE:   req.file.mimetype,     // e.g. "application/pdf"
        FILE_NAME:   req.file.originalname, // e.g. "invoice-jan.pdf"
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

      // View/download raw file blob: GET /api/gldoc?id=1&file=true
      if (id && req.query.file === "true") {
        const doc = await getGldocFile(id);
        if (!doc || !doc.buffer) {
          return res.status(404).json({ success: false, message: "File not found." });
        }

        const contentType = doc.fileType || "application/octet-stream";
        const filename     = buildDownloadName(doc);

        res.setHeader("Content-Type", contentType);
        // "inline" lets the browser render PDFs/images in a new tab instead
        // of forcing a download every time. Add &download=true to force save.
        const disposition = req.query.download === "true" ? "attachment" : "inline";
        res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
        res.setHeader("Content-Length", doc.buffer.length);
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
        updateData.FILE_TYPE = req.file.mimetype;
        updateData.FILE_NAME = req.file.originalname;
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