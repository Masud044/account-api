import { withConnection } from "../../config/db.js";

export async function postVoucher(id) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      "UPDATE glmaster SET posted = 1 WHERE id = :id",
      { id: Number(id) },
      { autoCommit: true }
    );
    return result.rowsAffected || 0;
  });
}
