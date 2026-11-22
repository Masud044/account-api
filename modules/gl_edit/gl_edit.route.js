// import { Router } from "express";
// import { editGlEntry } from "./gl_edit.controller.js";

// const router = Router();

// // PUT /api/gl/edit
// router.post("/", editGlEntry);

// export default router;

import { Router } from "express";
import { editGlEntry, removeGlEntry } from "./gl_edit.controller.js";

const router = Router();

// POST   /api/gl/edit        → update voucher
router.post("/", editGlEntry);

// DELETE /api/gl/edit/:id    → permanently delete voucher (+ lines + attachments)
router.delete("/:id", removeGlEntry);

export default router;
