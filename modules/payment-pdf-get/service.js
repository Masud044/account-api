// services/voucherDownloadService.js
import { withConnection, oracledb } from "../../config/db.js";

/**
 * Fetch full voucher details (master + line items) by GLMASTER.id
 * @param {number|string} id
 * @returns {{ master: object, details: object[], summary: { totalCredit, totalDebit } }}
 */
export async function getVoucherFullDetails(id) {
  return withConnection(async (connection) => {

    // ── Master ────────────────────────────────────────────────────────────────
    const masterResult = await connection.execute(
      `SELECT
         gm.ID,
         gm.VOUCHERNO,
        TO_CHAR(TRUNC(gm.TRANS_DATE),     'MM/DD/YYYY') AS TRANS_DATE,
         TO_CHAR(TRUNC(gm.GL_ENTRY_DATE),  'MM/DD/YYYY') AS GL_ENTRY_DATE,
         gm.DESCRIPTION,
         gm.SUPPORTING,
         gm.CASHACCOUNT,
         gm.CUSTOMER_ID,
         gm.POSTED,
         c.ACCOUNT_NAME  AS CASH_ACCOUNT_NAME,
         s.SUPPLIER_NAME AS SUPPLIER_NAME
       FROM   GLMASTER gm
     LEFT JOIN CHART_OF_ACCOUNT c
              ON  c.ACCOUNT_ID   = gm.CASHACCOUNT
              AND c.ACCOUNT_TYPE = 1
       LEFT JOIN SUPPLIER_INFO        s ON s.SUPPLIER_ID = gm.CUSTOMER_ID
       WHERE  gm.ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const master = masterResult.rows[0];
    console.log("TRANS_DATE after fix:", master.TRANS_DATE);
    if (!master) {
      const err = new Error(`Voucher with id=${id} not found`);
      err.status = 404;
      throw err;
    }

    // ── Details ───────────────────────────────────────────────────────────────
    const detailsResult = await connection.execute(
      `SELECT
         gd.ID,
         gd.CODE,
         gd.CREDIT,
         gd.DEBIT,
         gd.CODEDESCRIPTION,
         gd.DESCRIPTION,
         c.ACCOUNT_NAME
       FROM   GLDETAILS gd
       LEFT JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = gd.CODE
       WHERE  gd.GLMASTERID = :id
       ORDER BY gd.ID ASC`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const details      = detailsResult.rows;
    const totalCredit  = details.reduce((s, r) => s + Number(r.CREDIT || 0), 0);
    const totalDebit   = details.reduce((s, r) => s + Number(r.DEBIT  || 0), 0);

    return { master, details, summary: { totalCredit, totalDebit } };
  });
}