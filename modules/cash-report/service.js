// modules/cash-transfer-pdf-get/service.js
import { withConnection, oracledb } from "../../config/db.js";

/**
 * Fetch full cash transfer voucher details by GLMASTER.id
 *
 * Cash Transfer structure (voucher_type = 4):
 *   GLDETAILS DEBIT  row  → destination account (toCode)
 *   GLDETAILS CREDIT row  → source account (receive/from)
 *   Always exactly 2 rows, no supplier/customer
 *
 * @param {number|string} id  – GLMASTER primary key
 * @returns {{ master, debitRow, creditRow, summary }}
 */
export async function getCashTransferFullDetails(id) {
  return withConnection(async (connection) => {

    // ── Master ────────────────────────────────────────────────────────────────
    const masterResult = await connection.execute(
      `SELECT
         gm.ID,
         gm.VOUCHERNO,
         TO_CHAR(TRUNC(gm.TRANS_DATE),    'MM/DD/YYYY') AS TRANS_DATE,
         TO_CHAR(TRUNC(gm.GL_ENTRY_DATE), 'MM/DD/YYYY') AS GL_ENTRY_DATE,
         gm.DESCRIPTION,
         gm.SUPPORTING,
         gm.VOUCHER_TYPE,
         gm.POSTED
       FROM GLMASTER gm
       WHERE gm.ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const master = masterResult.rows[0];
    if (!master) {
      const err = new Error(`Cash Transfer with id=${id} not found`);
      err.status = 404;
      throw err;
    }

    // ── Details ───────────────────────────────────────────────────────────────
    const detailsResult = await connection.execute(
      `SELECT
         gd.ID,
         gd.CODE,
         gd.DEBIT,
         gd.CREDIT,
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

    const details    = detailsResult.rows;
    const debitRow   = details.find((d) => Number(d.DEBIT  || 0) > 0) || {};
    const creditRow  = details.find((d) => Number(d.CREDIT || 0) > 0) || {};
    const amount     = Number(debitRow.DEBIT || creditRow.CREDIT || 0);

    return { master, details, debitRow, creditRow, summary: { amount } };
  });
}