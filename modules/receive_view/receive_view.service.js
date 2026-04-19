import { withConnection } from "../../config/db.js";

export async function getReceiveById(id) {
  return withConnection(async (conn) => {
    // --- 1. Fetch GLMASTER record ---
    const masterResult = await conn.execute(
      "SELECT * FROM GLMASTER WHERE ID = :id",
      { id: Number(id) },
      { outFormat: 4002 }
    );

    const master = masterResult.rows?.[0];
    if (!master) return null;

    // --- 2. Fetch GLDETAILS joined with CHART_OF_ACCOUNT ---
    const detailResult = await conn.execute(
      `SELECT GD.*, COA.ACCOUNT_NAME
       FROM GLDETAILS GD
       JOIN CHART_OF_ACCOUNT COA ON GD.CODE = COA.ACCOUNT_ID
       WHERE GD.GLMASTERID = :id
       ORDER BY GD.ID ASC`,
      { id: Number(id) },
      { outFormat: 4002 }
    );

    const details = detailResult.rows || [];

    return {
      gl_master:    master,
      gl_details:   details,
      record_count: details.length,
    };
  });
}
