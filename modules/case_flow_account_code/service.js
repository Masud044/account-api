import { withConnection, oracledb } from "../../config/db.js";

export async function getCaseFlowAccountCode() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      "SELECT ACCOUNT_ID, ACCOUNT_NAME FROM chart_of_account WHERE account_type = 1",
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  });
}
