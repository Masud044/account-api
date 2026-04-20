import { withConnection, oracledb } from "../../config/db.js";

const SQL_GET_ACTIVE_SUPPLIERS = `
  SELECT SUPPLIER_ID, SUPPLIER_NAME
  FROM   HCM.SUPPLIER_INFO
  WHERE  STATUS = 1
  ORDER  BY SUPPLIER_NAME ASC
`;

export async function getActiveSuppliers() {
  return withConnection(async (conn) => {
    const result = await conn.execute(SQL_GET_ACTIVE_SUPPLIERS, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows ?? [];
  });
}