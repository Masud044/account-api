import { withConnection, oracledb } from "../../config/db.js";

export async function getVoucherReview(id) {
  return withConnection(async (connection) => {
    const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const masterResult = await connection.execute(
      "SELECT * FROM GLMASTER WHERE id = :id",
      { id: Number(id) },
      opts
    );
    const master = masterResult.rows?.[0] || null;

    const detailsResult = await connection.execute(
      "SELECT * FROM GLDETAILS WHERE glmasterid = :id ORDER BY id ASC",
      { id: Number(id) },
      opts
    );

    return { master, details: detailsResult.rows || [] };
  });
}