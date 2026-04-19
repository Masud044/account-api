import { getInfoList } from "./info_list.service.js";

export async function listInfo(req, res) {
  try {
    const data = await getInfoList();
    return res.status(200).json({
      success: true,
      message: "Unposted voucher list with balance check fetched.",
      ...data,
    });
  } catch (err) {
    console.error("[info_list] listInfo error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
