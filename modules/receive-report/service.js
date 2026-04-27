// modules/receipt-pdf-get/service.js
import { withConnection, oracledb } from "../../config/db.js";

/**
 * Fetch full receipt voucher details by GLMASTER.id
 *
 * Receipt structure (voucher_type = 1):
 *   GLDETAILS DEBIT  row  → cash/bank account (receive code)
 *   GLDETAILS CREDIT rows → income/account entries shown in the table
 *
 * @param {number|string} id  – GLMASTER primary key
 * @returns {{ master, details, summary }}
 */
export async function getReceiptFullDetails(id) {
  return withConnection(async (connection) => {

    // ── Master ────────────────────────────────────────────────────────────────
    const masterResult = await connection.execute(
      `SELECT
         gm.ID,
         gm.VOUCHERNO,

         /* TRUNC prevents timezone-driven date shift */
         TO_CHAR(TRUNC(gm.TRANS_DATE),    'MM/DD/YYYY') AS TRANS_DATE,
         TO_CHAR(TRUNC(gm.GL_ENTRY_DATE), 'MM/DD/YYYY') AS GL_ENTRY_DATE,

         gm.DESCRIPTION,
         gm.SUPPORTING,
         gm.CASHACCOUNT,
         gm.CUSTOMER_ID,
         gm.POSTED,

         /* Receive Code label: ACCOUNT_TYPE = 1 matches getReceiveCodes() query */
         c.ACCOUNT_NAME AS CASH_ACCOUNT_NAME,
          s.CUSTOMER_NAME AS CUSTOMER_NAME
       FROM   GLMASTER gm
       LEFT JOIN CHART_OF_ACCOUNT c
              ON  c.ACCOUNT_ID   = gm.CASHACCOUNT
              AND c.ACCOUNT_TYPE = 1
              LEFT JOIN CUSTOMER_INFO        s ON s.CUSTOMER_ID = gm.CUSTOMER_ID
     
       WHERE  gm.ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const master = masterResult.rows[0];
    if (!master) {
      const err = new Error(`Receipt with id=${id} not found`);
      err.status = 404;
      throw err;
    }

    // Supplier / Customer name fallback (no dedicated table assumed)
    master.SUPPLIER_NAME = master.CUSTOMER_ID ?? "";

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

    const details     = detailsResult.rows;
    const totalCredit = details.reduce((s, r) => s + Number(r.CREDIT || 0), 0);
    const totalDebit  = details.reduce((s, r) => s + Number(r.DEBIT  || 0), 0);

    return { master, details, summary: { totalCredit, totalDebit } };
  });
}