import { withConnection, oracledb } from "../../config/db.js";

export async function insertCashFlow(payload) {
  return withConnection(async (connection) => {
    try {
      const seq = await connection.execute(
        "SELECT SUBSTR(voucherno, -3, 3) v_no FROM glmaster WHERE voucher_type = 4 ORDER BY id DESC FETCH FIRST 1 ROWS ONLY",
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const cnt = String((Number(seq.rows[0]?.V_NO || 0) + 1)).padStart(3, "0");
      const [y, m] = String(payload.trans_date).split("-");
      const voucher = `${y}${m}${cnt}`;

      await connection.execute(
        `INSERT INTO glmaster (trans_date, voucher_type, description, voucherno, posted, GL_ENTRY_DATE, supporting)
         VALUES (TO_DATE(:trans_date, 'YYYY-MM-DD'), 4, :receive_desc, :voucherno, 0, TO_DATE(:gl_date, 'YYYY-MM-DD'), :supporting)`,
        { trans_date: payload.trans_date, receive_desc: payload.receive_desc, voucherno: voucher, gl_date: payload.GL_ENTRY_DATE || payload.trans_date, supporting: payload.supporting },
        { autoCommit: false }
      );
      const idRow = await connection.execute("SELECT MAX(id) ID FROM glmaster", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const masterID = idRow.rows[0].ID;
      await connection.execute("INSERT INTO gldetails (glmasterid, code, debit) VALUES (:id, :code, :amount)", { id: masterID, code: payload.toCode, amount: payload.amount }, { autoCommit: false });
      await connection.execute("INSERT INTO gldetails (glmasterid, code, credit) VALUES (:id, :code, :amount)", { id: masterID, code: payload.receive, amount: payload.amount }, { autoCommit: false });
      await connection.commit();
      return { masterID, voucher };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}
