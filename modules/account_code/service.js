import { withConnection, oracledb } from "../../config/db.js";

export async function getAccountCodeList() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      "SELECT ACCOUNT_ID, ACCOUNT_NAME FROM chart_of_account WHERE lastLevel=1 AND (substr(account_id,1,1)=5)",
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  });
}
