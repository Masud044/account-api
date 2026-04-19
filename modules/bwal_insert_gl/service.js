import { withConnection, oracledb } from "../../config/db.js";

export async function insertGlVoucher(data) {
  return withConnection(async (connection) => {
    try {
      const seqStmt = await connection.execute("SELECT GLMASTER_SEQ.NEXTVAL AS MID FROM dual", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const master_id = seqStmt.rows[0].MID;
      await connection.execute(
        `INSERT INTO GLMASTER (ID, VOUCHERNO, TRANS_DATE, VOUCHER_TYPE, ENTRY_BY, DESCRIPTION, REFERENCE_NO, SUPPORTING, CASHACCOUNT, POSTED, CUSTOMER_ID, AUTO_INVOICE, STATUS_PAY_RECIVE, UNIT_ID, ENTRY_DATE, UPDATE_BY, UPDATE_DATE, SUPPLIER_NAME, GL_ENTRY_DATE)
         VALUES (:master_id, :voucherno, TO_DATE(:trans_date, 'YYYY-MM-DD'), :voucher_type, :entry_by, :description, :reference_no, :supporting, :cashaccount, :posted, :customer_id, :auto_invoice, :status_pay_recive, :unit_id, SYSDATE, NULL, NULL, NULL, SYSDATE)`,
        { ...data, master_id },
        { autoCommit: false }
      );
      for (const detail of data.details || []) {
        await connection.execute(
          `INSERT INTO GLDETAILS (ID, GLMASTERID, CODE, DEBIT, CREDIT, UNIT_ID, ENTRY_DATE, ENTRY_BY, CODEDESCRIPTION, DEBIT_TAX, CREDIT_TAX, DESCRIPTION)
           VALUES (GLDETAILS_SEQ.NEXTVAL, :master_id, :code, :debit, :credit, :unit_id, SYSDATE, :entry_by, :codedescription, :debit_tax, :credit_tax, :description)`,
          { master_id, entry_by: data.entry_by, ...detail },
          { autoCommit: false }
        );
      }
      await connection.commit();
      return { master_id };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}
