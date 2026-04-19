import { withConnection } from "../../config/db.js";

/**
 * Converts "YYYY-MM-DD" → "MM-DD-YYYY" for Oracle TO_DATE
 */
function toMmDdYyyy(input) {
  const [year, month, day] = String(input).split("-");
  return `${month}-${day}-${year}`;
}

export async function updateGlEntry({
  master_id,
  trans_date,
  gl_entry_date,
  receive_desc,
  supporting,
  details,
}) {
  return withConnection(async (conn) => {
    // --- 1. Update GLMASTER ---
    const masterSql = `
      UPDATE GLMASTER SET
        TRANS_DATE    = TO_DATE(:trans_date,    'MM-DD-YYYY'),
        DESCRIPTION   = :description,
        SUPPORTING    = :supporting,
        GL_ENTRY_DATE = TO_DATE(:gl_entry_date, 'MM-DD-YYYY')
      WHERE ID = :master_id
    `;

    await conn.execute(
      masterSql,
      {
        trans_date:    toMmDdYyyy(trans_date),
        description:   receive_desc ?? null,
        supporting:    supporting   ?? null,
        gl_entry_date: toMmDdYyyy(gl_entry_date),
        master_id:     Number(master_id),
      },
      { autoCommit: false }
    );

    // --- 2. Update each GLDETAILS row ---
    const detailSql = `
      UPDATE GLDETAILS
      SET DEBIT  = :debit,
          CREDIT = :credit
      WHERE GLMASTERID = :master_id
        AND ID          = :detail_id
    `;

    for (const d of details) {
      if (d.id === undefined || d.debit === undefined || d.credit === undefined) {
        throw new Error("Each detail row must have id, debit, and credit.");
      }

      await conn.execute(
        detailSql,
        {
          debit:     Number(d.debit),
          credit:    Number(d.credit),
          master_id: Number(master_id),
          detail_id: Number(d.id),
        },
        { autoCommit: false }
      );
    }

    // --- 3. Commit transaction ---
    await conn.commit();
    return { masterId: master_id };
  });
}
