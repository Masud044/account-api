import { withConnection } from "../../config/db.js";

export async function updateGlVoucher(data) {
  return withConnection(async (connection) => {
    try {
      await connection.execute(
        `UPDATE GLMASTER SET VOUCHERNO=:voucherno, TRANS_DATE=TO_DATE(:trans_date, 'YYYY-MM-DD'),
         VOUCHER_TYPE=:voucher_type, ENTRY_BY=:entry_by, DESCRIPTION=:description, REFERENCE_NO=:reference_no,
         SUPPORTING=:supporting, CASHACCOUNT=:cashaccount, POSTED=:posted, CUSTOMER_ID=:customer_id,
         AUTO_INVOICE=:auto_invoice, STATUS_PAY_RECIVE=:status_pay_recive, UNIT_ID=:unit_id, UPDATE_BY=:entry_by, UPDATE_DATE=SYSDATE
         WHERE ID=:master_id`,
        data,
        { autoCommit: false }
      );
      await connection.execute("DELETE FROM GLDETAILS WHERE GLMASTERID = :master_id", { master_id: data.master_id }, { autoCommit: false });
      for (const detail of data.details || []) {
        await connection.execute(
          `INSERT INTO GLDETAILS (GLMASTERID, CODE, DEBIT, CREDIT, UNIT_ID, ENTRY_DATE, ENTRY_BY, CODEDESCRIPTION, DEBIT_TAX, CREDIT_TAX, DESCRIPTION)
           VALUES (:master_id, :code, :debit, :credit, :unit_id, SYSDATE, :entry_by, :codedescription, :debit_tax, :credit_tax, :description)`,
          { master_id: data.master_id, entry_by: data.entry_by, ...detail },
          { autoCommit: false }
        );
      }
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}
