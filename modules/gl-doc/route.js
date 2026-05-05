import express from "express";
import multer  from "multer";
import { handleGldoc } from "./controller.js";

const router = express.Router();

// Multer — store file in memory as Buffer (goes straight into Oracle BLOB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    // Allow common document & image types
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed.`));
    }
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET  /api/gldoc              → all docs (no blob)
// GET  /api/gldoc?id=1         → single doc meta
// GET  /api/gldoc?glmaster_id=5 → all docs for a voucher
// GET  /api/gldoc?id=1&file=true → download raw file
router.get("/", handleGldoc);

// POST /api/gldoc  (multipart/form-data)
// fields: doc_file (file), GLMASTERID, CREATION_BY
router.post("/", upload.single("doc_file"), (err, req, res, next) => {
  // multer error handler (file size / type)
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
}, handleGldoc);

// PUT /api/gldoc  (multipart/form-data or JSON)
// fields: ID (required), doc_file (optional), GLMASTERID, UPDATED_BY
router.put("/", upload.single("doc_file"), (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
}, handleGldoc);

// DELETE /api/gldoc?id=1  or  body: { ID }
router.delete("/", handleGldoc);

export default router;