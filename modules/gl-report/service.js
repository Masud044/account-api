// modules/journal-pdf-get/service.js
import { withConnection, oracledb } from "../../config/db.js";

/**
 * Fetch full journal voucher details by GLMASTER.id
 *
 * Journal structure (voucher_type = 3):
 *   GLDETAILS rows can have DEBIT > 0 OR CREDIT > 0  (both shown in table)
 *   No CASHACCOUNT / supplier concept
 *
 * @param {number|string} id  – GLMASTER primary key
 * @returns {{ master, details, summary }}
 */
export async function getJournalFullDetails(id) {
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
      const err = new Error(`Journal with id=${id} not found`);
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

    const details      = detailsResult.rows;
    const totalDebit   = details.reduce((s, r) => s + Number(r.DEBIT  || 0), 0);
    const totalCredit  = details.reduce((s, r) => s + Number(r.CREDIT || 0), 0);

    return { master, details, summary: { totalDebit, totalCredit } };
  });
}