import { withConnection, toMmDdYyyy, currentMmDdYyyy, oracledb } from "../../config/db.js";
import { getPeriodStatusForDate } from "../ledger-period-calendar/service.js";

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

  const periodStatus = await getPeriodStatusForDate("AR", input.gl_date);

  if (!periodStatus) {
    const err = new Error(`No ledger period is defined for AR date ${input.gl_date}. Please set up the period calendar first.`);
    err.statusCode = 400;
    throw err;
  }
  if (periodStatus.STATUS === "CLOSED") {
    const err = new Error(`AR period "${periodStatus.PERIOD_NAME}" is closed for posting. Choose a date within an open period.`);
    err.statusCode = 400;
    throw err;
  }
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

      // await connection.execute(
      //   `INSERT INTO GLMASTER
      //   (trans_date, voucher_type, description, supporting, voucherno, cashaccount, customer_id, gl_entry_date, posted,inv_type)
      //   VALUES(TO_DATE(:tdate,'MM-DD-YYYY'), 1, :des, :sup, :vno, :cash, :cust, TO_DATE(:gld,'MM-DD-YYYY'), 0, :invtype)`,
      //   {
      //     tdate: toMmDdYyyy(input.trans_date),
      //     des: input.receive_desc,
      //     sup: input.supporting,
      //     vno: voucherNo,
      //     cash: input.receive,
      //     cust: input.supplierid,
      //     gld: toMmDdYyyy(input.gl_date),
      //     invtype: input.inv_type ?? null,  
      //   },
      //   { autoCommit: false }
      // );

//     await connection.execute(
//   `INSERT INTO GLMASTER
//   (trans_date, voucher_type, description, supporting, voucherno, cashaccount, customer_id, gl_entry_date, posted, inv_type, sale_invoice_no, entry_by)
//   VALUES(TO_DATE(:tdate,'MM-DD-YYYY'), 1, :des, :sup, :vno, :cash, :cust, TO_DATE(:gld,'MM-DD-YYYY'), 0, :invtype, :saleinvno, :entryby)`,
//   {
//     tdate: toMmDdYyyy(input.trans_date),
//     des: input.receive_desc,
//     sup: input.supporting,
//     vno: voucherNo,
//     cash: input.receive,
//     cust: input.supplierid,
//     gld: toMmDdYyyy(input.gl_date),
//     invtype: input.inv_type ?? null,
//     saleinvno: input.sale_invoice_no ?? null,
//     entryby: input.entry_by ?? null,
//   },
//   { autoCommit: false }
// );
      

await connection.execute(
  `INSERT INTO GLMASTER
  (trans_date, voucher_type, description, supporting, voucherno, cashaccount, customer_id, gl_entry_date, posted, inv_type, sale_invoice_no, entry_by, TYPE, REF_REVERSE_ENTRY)
  VALUES(TO_DATE(:tdate,'MM-DD-YYYY'), 1, :des, :sup, :vno, :cash, :cust, TO_DATE(:gld,'MM-DD-YYYY'), 0, :invtype, :saleinvno, :entryby, :type, :refreverse)`,
  {
    tdate: toMmDdYyyy(input.trans_date),
    des: input.receive_desc,
    sup: input.supporting,
    vno: voucherNo,
    cash: input.receive,
    cust: input.supplierid,
    gld: toMmDdYyyy(input.gl_date),
    invtype: input.inv_type ?? null,
    saleinvno: input.sale_invoice_no ?? null,
    entryby: input.entry_by ?? null,
    type: input.type ?? "MANUAL",
    refreverse: input.ref_reverse_entry ?? null,
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

// export async function updateReceipt(input) {
//   return withConnection(async (connection) => {
//     try {
//       const uDate = currentMmDdYyyy();
//       await connection.execute(
//         `UPDATE GLMASTER SET
//           trans_date = TO_DATE(:td,'MM-DD-YYYY'),
//           description = :des,
//           supporting = :sup,
//           customer_id = :cust,
//           update_date = TO_DATE(:ud,'MM-DD-YYYY'),
//           gl_entry_date = TO_DATE(:gd,'MM-DD-YYYY')
//         WHERE id = :id`,
//         {
//           td: toMmDdYyyy(input.trans_date),
//           des: input.receive_desc,
//           sup: input.supporting,
//           cust: input.supplierid,
//           ud: uDate,
//           gd: toMmDdYyyy(input.gl_date),
//           id: input.masterID
//         },
//         { autoCommit: false }
//       );

//       for (let i = 0; i < (input.DEBIT_ID || []).length; i += 1) {
//         await connection.execute(
//           `UPDATE GLDETAILS SET
//             debit = :amt, code = :acode, codedescription = :cdesc, description = :ds,
//             update_date = TO_DATE(:ud,'MM-DD-YYYY')
//           WHERE id = :id`,
//           {
//             amt: input.amount2?.[i],
//             acode: input.acode?.[i] || "",
//             cdesc: input.CODEDESCRIPTION?.[i] || "",
//             ds: input.DESCRIPTION?.[i] || "",
//             ud: uDate,
//             id: input.DEBIT_ID[i]
//           },
//           { autoCommit: false }
//         );
//       }

//       await connection.execute(
//         `UPDATE GLDETAILS SET
//           credit = :cr, code = :pcode, update_date = TO_DATE(:ud,'MM-DD-YYYY')
//         WHERE id = :cid`,
//         { cr: input.totalAmount, pcode: input.pcode, ud: uDate, cid: input.credit_id },
//         { autoCommit: false }
//       );

//       await connection.commit();
//       return { masterID: input.masterID };
//     } catch (error) {
//       await connection.rollback();
//       throw error;
//     }
//   });
// }



export async function updateReceipt(input) {


  const periodStatus = await getPeriodStatusForDate("AR", input.gl_date);

  if (!periodStatus) {
    const err = new Error(`No ledger period is defined for AR date ${input.gl_date}. Please set up the period calendar first.`);
    err.statusCode = 400;
    throw err;
  }
  if (periodStatus.STATUS === "CLOSED") {
    const err = new Error(`AR period "${periodStatus.PERIOD_NAME}" is closed for posting. Choose a date within an open period.`);
    err.statusCode = 400;
    throw err;
  }
  return withConnection(async (connection) => {
    try {
      const uDate = currentMmDdYyyy();

      // ── 1. Update GLMASTER ─────────────────────────────────────────
      // await connection.execute(
      //   `UPDATE GLMASTER SET
      //     trans_date    = TO_DATE(:td, 'MM-DD-YYYY'),
      //     description   = :des,
      //     supporting    = :sup,
      //     customer_id   = :cust,
      //     update_date   = TO_DATE(:ud, 'MM-DD-YYYY'),
      //     gl_entry_date = TO_DATE(:gd, 'MM-DD-YYYY'),
      //      inv_type      = :invtype 
      //   WHERE id = :id`,
      //   {
      //     td:   toMmDdYyyy(input.trans_date),
      //     des:  input.receive_desc,
      //     sup:  input.supporting,
      //     cust: input.supplierid,
      //     ud:   uDate,
      //     gd:   toMmDdYyyy(input.gl_date),
      //     id:   input.masterID,
      //     invtype: input.inv_type ?? null,
      //   },
      //   { autoCommit: false }
      // );

// await connection.execute(
//   `UPDATE GLMASTER SET
//     trans_date    = TO_DATE(:td, 'MM-DD-YYYY'),
//     description   = :des,
//     supporting    = :sup,
//     customer_id   = :cust,
//     gl_entry_date = TO_DATE(:gd, 'MM-DD-YYYY'),
//     inv_type      = :invtype,
//     sale_invoice_no = :saleinvno,
//     cashaccount   = :pcode,          -- 👈 eituku add korun
//     update_by     = :updateby,
//     UPDATE_DATE   = SYSDATE
//   WHERE id = :id`,
//   {
//     td:   toMmDdYyyy(input.trans_date),
//     des:  input.receive_desc,
//     sup:  input.supporting,
//     cust: input.supplierid,
//     gd:   toMmDdYyyy(input.gl_date),
//     id:   input.masterID,
//     invtype: input.inv_type ?? null,
//     saleinvno: input.sale_invoice_no ?? null,
//     pcode: input.pcode,              // 👈 eituku add korun
//     updateby: input.update_by ?? null,
//   },
//   { autoCommit: false }
// );

await connection.execute(
  `UPDATE GLMASTER SET
    trans_date    = TO_DATE(:td, 'MM-DD-YYYY'),
    description   = :des,
    supporting    = :sup,
    customer_id   = :cust,
    gl_entry_date = TO_DATE(:gd, 'MM-DD-YYYY'),
    inv_type      = :invtype,
    sale_invoice_no = :saleinvno,
    cashaccount   = :pcode,
    update_by     = :updateby,
    UPDATE_DATE   = SYSDATE,
    TYPE          = :type
    
  WHERE id = :id`,
  {
    td:   toMmDdYyyy(input.trans_date),
    des:  input.receive_desc,
    sup:  input.supporting,
    cust: input.supplierid,
    gd:   toMmDdYyyy(input.gl_date),
    id:   input.masterID,
    invtype: input.inv_type ?? null,
    saleinvno: input.sale_invoice_no ?? null,
    pcode: input.pcode,
    updateby: input.update_by ?? null,
    type: input.type ?? "MANUAL",
   
  },
  { autoCommit: false }
);
      // ── 2. Update CREDIT rows (account rows) ───────────────────────
      for (let i = 0; i < (input.DEBIT_ID || []).length; i++) {
        const rowId = input.DEBIT_ID[i];

        if (rowId && Number.isInteger(Number(rowId))) {
          // Existing row → UPDATE
        await connection.execute(
  `UPDATE GLDETAILS SET
    credit          = :amt,
    debit           = 0,
    code            = :acode,
    codedescription = :cdesc,
    description     = :ds,
    update_by       = :updateby,
    UPDATE_DATE     = SYSDATE
  WHERE id = :id`,
  {
    amt:   input.amount2?.[i]          || 0,
    acode: input.acode?.[i]            || "",
    cdesc: input.CODEDESCRIPTION?.[i]  || "",
    ds:    input.DESCRIPTION?.[i]      || "",
    updateby: input.update_by ?? null,
    id:    Number(rowId),
  },
  { autoCommit: false }
);
        } else {
          // New row added during edit → INSERT
          await connection.execute(
            `INSERT INTO GLDETAILS
              (glmasterid, code, credit, debit, codedescription, description)
             VALUES
              (:mid, :code, :amt, 0, :cdesc, :ds)`,
            {
              mid:   input.masterID,
              code:  input.acode?.[i]            || "",
              amt:   input.amount2?.[i]          || 0,
              cdesc: input.CODEDESCRIPTION?.[i]  || "",
              ds:    input.DESCRIPTION?.[i]      || "",
            },
            { autoCommit: false }
          );
        }
      }

      // ── 3. Update DEBIT row (payment code row) ─────────────────────
      // ✅ debit = totalAmount (not credit!)
    await connection.execute(
  `UPDATE GLDETAILS SET
    debit       = :dr,
    credit      = 0,
    code        = :pcode,
    update_by   = :updateby,
    UPDATE_DATE = SYSDATE
  WHERE id = :cid`,
  {
    dr:    input.totalAmount,
    pcode: input.pcode,
    updateby: input.update_by ?? null,
    cid:   input.credit_id,
  },
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
