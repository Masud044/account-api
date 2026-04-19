import { searchAutocomplete } from "./service.js";

export async function autocomplete(req, res) {
  try {
    res.json(await searchAutocomplete(req.query.term));
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}
