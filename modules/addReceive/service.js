import { withConnection, toMmDdYyyy, oracledb } from "../../config/db.js";

export async function addReceiveVoucher(payload) {
  return withConnection(async (connection) => {
    try {
      const seq = await connection.execute(
        "SELECT substr(voucherNo, -3, 3) V_NO FROM glmaster WHERE voucher_type = 1 ORDER BY id DESC FETCH FIRST 1 ROWS ONLY",
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const padded = String((Number(seq.rows[0]?.V_NO || 0) + 1)).padStart(3, "0");
      const [year, month] = String(payload.trans_date).split("-");
      const voucherNo = `${year}${month}${padded}`;

      await connection.execute(
        `INSERT INTO glmaster (trans_date, voucher_type, description, supporting, voucherNo, cashAccount, CUSTOMER_ID, GL_ENTRY_DATE, posted)
         VALUES (TO_DATE(:trans_date, 'MM-DD-YYYY'), 1, :description, :supporting, :voucherNo, :cashAccount, :customer_id, TO_DATE(:gl_date, 'MM-DD-YYYY'), 0)`,
        { trans_date: toMmDdYyyy(payload.trans_date), description: payload.receive_desc, supporting: payload.supporting, voucherNo, cashAccount: payload.receive, customer_id: payload.supplierid, gl_date: toMmDdYyyy(payload.gl_date) },
        { autoCommit: false }
      );
      const idResult = await connection.execute("SELECT MAX(id) CURRVAL FROM glmaster", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const masterID = idResult.rows[0].CURRVAL;
      await connection.execute("INSERT INTO gldetails (glmasterID, code, debit) VALUES (:masterID, :code, :amount)", { masterID, code: payload.receive, amount: payload.totalAmount }, { autoCommit: false });
      for (let i = 0; i < (payload.accountID || []).length; i += 1) {
        const code = payload.accountID[i];
        if (!code) continue;
        await connection.execute("INSERT INTO gldetails (glmasterID, code, credit) VALUES (:masterID, :code, :amount)", { masterID, code, amount: payload.amount2?.[i] || 0 }, { autoCommit: false });
      }
      await connection.commit();
      return { masterID, voucherNo };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}
