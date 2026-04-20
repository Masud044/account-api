import { withConnection, oracledb } from "../../config/db.js";

const SQL_GET_ACTIVE_CUSTOMERS = `
  SELECT CUSTOMER_ID, CUSTOMER_NAME
  FROM   CUSTOMER_INFO
  WHERE  STATUS = 1
  ORDER  BY CUSTOMER_NAME ASC
` ;

/**
 * Returns every active customer (STATUS = 1),
 * ordered alphabetically by name.
 *
 * @returns {Promise<Array<{CUSTOMER_ID: number, CUSTOMER_NAME: string}>>}
 */
export async function getActiveCustomers() {
  return withConnection(async (conn) => {
    const result = await conn.execute(SQL_GET_ACTIVE_CUSTOMERS, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return result.rows ?? [];
  });
}

