import { withConnection, toMmDdYyyy, currentMmDdYyyy, oracledb } from "../../config/db.js";

export async function searchReceipt(id) {
  return withConnection(async (connection) => {
    const masterResult = await connection.execute(
      "SELECT * FROM GLMASTER WHERE id = :id",
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const master = masterResult.rows[0];
    if (!master) throw new Error(`No master record found for id = ${id}`);

    const detailsResult = await connection.execute(
      "SELECT * FROM GLDETAILS WHERE glmasterID = :id ORDER BY id ASC",
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const details = detailsResult.rows.map((row) => ({
      id: row.ID,
      code: row.CODE,
      debit: row.DEBIT,
      credit: row.CREDIT,
      codedescription: row.CODEDESCRIPTION,
      description: row.DESCRIPTION
    }));
    const totalCredit = details.reduce((sum, row) => sum + Number(row.credit || 0), 0);
    return { master, details, summary: { totalCredit } };
  });
}

export async function insertReceipt(input) {
  return withConnection(async (connection) => {
    try {
      const seqResult = await connection.execute(
        `SELECT SUBSTR(voucherno,-3,3) V_NO FROM GLMASTER
         WHERE voucher_type=1 ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const next = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, "0");
      const [year, month] = String(input.trans_date).split("-");
      const voucherNo = `${year}${month}${next}`;

      await connection.execute(
        `INSERT INTO GLMASTER
        (trans_date, voucher_type, description, supporting, voucherno, cashaccount, customer_id, gl_entry_date, posted)
        VALUES(TO_DATE(:tdate,'MM-DD-YYYY'), 1, :des, :sup, :vno, :cash, :cust, TO_DATE(:gld,'MM-DD-YYYY'), 0)`,
        {
          tdate: toMmDdYyyy(input.trans_date),
          des: input.receive_desc,
          sup: input.supporting,
          vno: voucherNo,
          cash: input.receive,
          cust: input.supplierid,
          gld: toMmDdYyyy(input.gl_date)
        },
        { autoCommit: false }
      );

      const idResult = await connection.execute("SELECT MAX(id) ID FROM GLMASTER", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const masterID = idResult.rows[0].ID;

      await connection.execute(
        "INSERT INTO GLDETAILS (glmasterid, code, debit) VALUES(:mid, :code, :amt)",
        { mid: masterID, code: input.receive, amt: input.totalAmount },
        { autoCommit: false }
      );

      for (let i = 0; i < (input.accountID || []).length; i += 1) {
        if (!input.accountID[i]) continue;
        await connection.execute(
          "INSERT INTO GLDETAILS (glmasterid, code, credit, codedescription, description) VALUES(:mid, :code, :amt, :cdesc, :ds)",
          {
            mid: masterID,
            code: input.accountID[i],
            amt: input.amount2?.[i],
            cdesc: input.CODEDESCRIPTION?.[i] || "",
            ds: input.DESCRIPTION?.[i] || ""
          },
          { autoCommit: false }
        );
      }

      await connection.commit();
      return { masterID, voucherNo };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

export async function updateReceipt(input) {
  return withConnection(async (connection) => {
    try {
      const uDate = currentMmDdYyyy();
      await connection.execute(
        `UPDATE GLMASTER SET
          trans_date = TO_DATE(:td,'MM-DD-YYYY'),
          description = :des,
          supporting = :sup,
          customer_id = :cust,
          update_date = TO_DATE(:ud,'MM-DD-YYYY'),
          gl_entry_date = TO_DATE(:gd,'MM-DD-YYYY')
        WHERE id = :id`,
        {
          td: toMmDdYyyy(input.trans_date),
          des: input.receive_desc,
          sup: input.supporting,
          cust: input.supplierid,
          ud: uDate,
          gd: toMmDdYyyy(input.gl_date),
          id: input.masterID
        },
        { autoCommit: false }
      );

      for (let i = 0; i < (input.DEBIT_ID || []).length; i += 1) {
        await connection.execute(
          `UPDATE GLDETAILS SET
            debit = :amt, code = :acode, codedescription = :cdesc, description = :ds,
            update_date = TO_DATE(:ud,'MM-DD-YYYY')
          WHERE id = :id`,
          {
            amt: input.amount2?.[i],
            acode: input.acode?.[i] || "",
            cdesc: input.CODEDESCRIPTION?.[i] || "",
            ds: input.DESCRIPTION?.[i] || "",
            ud: uDate,
            id: input.DEBIT_ID[i]
          },
          { autoCommit: false }
        );
      }

      await connection.execute(
        `UPDATE GLDETAILS SET
          credit = :cr, code = :pcode, update_date = TO_DATE(:ud,'MM-DD-YYYY')
        WHERE id = :cid`,
        { cr: input.totalAmount, pcode: input.pcode, ud: uDate, cid: input.credit_id },
        { autoCommit: false }
      );

      await connection.commit();
      return { masterID: input.masterID };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

export async function deleteReceipt(masterID) {
  return withConnection(async (connection) => {
    try {
      await connection.execute("DELETE FROM GLDETAILS WHERE glmasterid = :id", { id: masterID }, { autoCommit: false });
      await connection.execute("DELETE FROM GLMASTER WHERE id = :id", { id: masterID }, { autoCommit: false });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}
