import { withConnection } from "../../config/db.js";

/**
 * Converts "YYYY-MM-DD" → "MM-DD-YYYY" for Oracle TO_DATE
 */
function toMmDdYyyy(input) {
  const [year, month, day] = String(input).split("-");
  return `${month}-${day}-${year}`;
}

export async function createGlEntry({ trans_date, GL_ENTRY_DATE, receive_desc, details }) {
  return withConnection(async (conn) => {
    // --- 1. Generate next voucher number (voucher_type = 3) ---
    const seqSql = `
      SELECT SUBSTR(VOUCHERNO, -3, 3) AS V_NO
      FROM GLMASTER
      WHERE VOUCHER_TYPE = 3
      ORDER BY ID DESC
      FETCH FIRST 1 ROWS ONLY
    `;
    const seqResult = await conn.execute(seqSql, {}, { outFormat: 4002 });
    const lastVNo = seqResult.rows?.[0]?.V_NO ? parseInt(seqResult.rows[0].V_NO) : 0;
    const newVNo = String(lastVNo + 1).padStart(3, "0");

    // --- 2. Build voucher number & format dates ---
    const datePart = trans_date.replace(/-/g, "").slice(0, 8); // YYYYMMDD
    const voucherNo = `${datePart}${newVNo}`;
    const transDateFmt = toMmDdYyyy(trans_date);
    const glEntryDateFmt = toMmDdYyyy(GL_ENTRY_DATE);
    const desc = receive_desc || "";

    // --- 3. Insert into GLMASTER ---
    const masterSql = `
      INSERT INTO GLMASTER
        (TRANS_DATE, VOUCHER_TYPE, DESCRIPTION, SUPPORTING, VOUCHERNO, GL_ENTRY_DATE, POSTED)
      VALUES
        (TO_DATE(:trans_date, 'MM-DD-YYYY'), 3, :description, '1', :voucher_no,
         TO_DATE(:gl_entry_date, 'MM-DD-YYYY'), 0)
    `;
    await conn.execute(
      masterSql,
      {
        trans_date: transDateFmt,
        description: desc,
        voucher_no: voucherNo,
        gl_entry_date: glEntryDateFmt,
      },
      { autoCommit: false }
    );

    // --- 4. Get the newly inserted master ID ---
    const idResult = await conn.execute(
      "SELECT MAX(ID) AS NEW_ID FROM GLMASTER",
      {},
      { outFormat: 4002 }
    );
    const masterID = idResult.rows?.[0]?.NEW_ID;
    if (!masterID) throw new Error("Failed to retrieve new GLMASTER ID.");

    // --- 5. Insert each detail row into GLDETAILS ---
    const detailSql = `
      INSERT INTO GLDETAILS
        (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
      VALUES
        (:master_id, :code, :debit, :credit, :code_desc, :description)
    `;

    for (const detail of details) {
      const { code, debit, credit, description: detDesc = "" } = detail;
      if (code === undefined || debit === undefined || credit === undefined) {
        throw new Error("Each detail row must have code, debit, and credit.");
      }

      // PHP used "##" separator to bundle account name alongside the code
      const [cleanCode, codeDesc = ""] = String(code).split("##");

      await conn.execute(
        detailSql,
        {
          master_id: masterID,
          code: cleanCode,
          debit: Number(debit),
          credit: Number(credit),
          code_desc: codeDesc,
          description: detDesc,
        },
        { autoCommit: false }
      );
    }

    // --- 6. Commit ---
    await conn.commit();
    return { masterId: masterID, voucherNo };
  });
}
