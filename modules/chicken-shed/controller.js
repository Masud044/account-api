import {
  listSheds,
  getShedById,
  createShed,
  updateShed,
  deleteShed,
} from "./service.js";

const handleError = (res, err) => {
  const msg = String(err.message || "");

  if (msg.includes("ORA-00001")) {
    return res.status(409).json({ status: "error", message: "Shed code already exists" });
  }
  // Egg production e use hoye gele code bodlano / delete kora jabe na
  if (msg.includes("ORA-02292")) {
    return res.status(409).json({
      status: "error",
      message: "This shed is already used in egg production, so it cannot be changed or deleted",
    });
  }
  res.status(err.statusCode || 500).json({ status: "error", message: msg });
};

export const getSheds = async (req, res) => {
  try {
    const data = await listSheds();
    res.json({ status: "success", data });
  } catch (err) {
    handleError(res, err);
  }
};

export const getShed = async (req, res) => {
  try {
    const data = await getShedById(req.params.id);
    if (!data) {
      return res.status(404).json({ status: "error", message: "Shed not found" });
    }
    res.json({ status: "success", data });
  } catch (err) {
    handleError(res, err);
  }
};

export const addShed = async (req, res) => {
  try {
    const data = await createShed(req.body);
    res.status(201).json({ status: "success", message: "Shed created successfully", data });
  } catch (err) {
    handleError(res, err);
  }
};

export const editShed = async (req, res) => {
  try {
    const affected = await updateShed(req.params.id, req.body);
    if (!affected) {
      return res.status(404).json({ status: "error", message: "Shed not found" });
    }
    res.json({ status: "success", message: "Shed updated successfully" });
  } catch (err) {
    handleError(res, err);
  }
};

export const removeShed = async (req, res) => {
  try {
    const affected = await deleteShed(req.params.id);
    if (!affected) {
      return res.status(404).json({ status: "error", message: "Shed not found" });
    }
    res.json({ status: "success", message: "Shed deleted successfully" });
  } catch (err) {
    handleError(res, err);
  }
};