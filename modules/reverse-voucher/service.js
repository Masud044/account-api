// // import { withConnection, oracledb } from "../../config/db.js";
// // import { getPeriodStatusForDate } from "../ledger-period-calendar/service.js";

// // const LEDGER_TYPE_BY_VOUCHER = { 1: "AR", 2: "AP", 3: "GL" };

// // function toDateStr(value) {
// //   if (!value) return null;
// //   if (value instanceof Date) return value.toISOString().slice(0, 10);
// //   return String(value).slice(0, 10);
// // }

// // async function getNextVoucherNo(conn, voucherType, transDateStr) {
// //   const seqResult = await conn.execute(
// //     `SELECT SUBSTR(voucherno,-3,3) V_NO FROM GLMASTER
// //      WHERE voucher_type = :vtype ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
// //     { vtype: voucherType },
// //     { outFormat: oracledb.OUT_FORMAT_OBJECT }
// //   );
// //   const next = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, "0");

// //   if (Number(voucherType) === 3) {
// //     // Journal vouchers → YYYYMMDD prefix
// //     const datePart = transDateStr.replace(/-/g, "").slice(0, 8);
// //     return `${datePart}${next}`;
// //   }
// //   // Receipt / Payment → YYYYMM prefix
// //   const [year, month] = transDateStr.split("-");
// //   return `${year}${month}${next}`;
// // }

// // export async function reverseGlEntry(masterID, entry_by) {
// //   return withConnection(async (conn) => {
// //     try {
// //       // ── 1. Fetch original master ────────────────────────────────────
// //       const masterResult = await conn.execute(
// //         "SELECT * FROM GLMASTER WHERE id = :id",
// //         { id: masterID },
// //         { outFormat: oracledb.OUT_FORMAT_OBJECT }
// //       );
// //       const original = masterResult.rows[0];
// //       if (!original) {
// //         const err = new Error(`No voucher found for id = ${masterID}`);
// //         err.statusCode = 404;
// //         throw err;
// //       }

// //       if (String(original.TYPE).toUpperCase() === "REVERSE") {
// //         const err = new Error("This is already a reversal entry and cannot be reversed again.");
// //         err.statusCode = 400;
// //         throw err;
// //       }
// //       if (original.REF_REVERSE_ENTRY) {
// //         const err = new Error("This voucher has already been reversed.");
// //         err.statusCode = 400;
// //         throw err;
// //       }
// //       if (Number(original.POSTED) !== 1) {
// //         const err = new Error("Only approved (posted) vouchers can be reversed.");
// //         err.statusCode = 400;
// //         throw err;
// //       }

// //       // ── 2. Fetch original details ───────────────────────────────────
// //       const detailsResult = await conn.execute(
// //         "SELECT * FROM GLDETAILS WHERE glmasterID = :id ORDER BY id ASC",
// //         { id: masterID },
// //         { outFormat: oracledb.OUT_FORMAT_OBJECT }
// //       );
// //       const originalDetails = detailsResult.rows;

// //       // ── 3. Period lock check ────────────────────────────────────────
// //       const ledgerType = LEDGER_TYPE_BY_VOUCHER[Number(original.VOUCHER_TYPE)] || "GL";
// //       const glDateStr = toDateStr(original.GL_ENTRY_DATE);
// //       const periodStatus = await getPeriodStatusForDate(ledgerType, glDateStr);

// //       if (!periodStatus) {
// //         const err = new Error(`No ledger period is defined for ${ledgerType} date ${glDateStr}. Please set up the period calendar first.`);
// //         err.statusCode = 400;
// //         throw err;
// //       }
// //       if (periodStatus.STATUS === "CLOSED") {
// //         const err = new Error(`${ledgerType} period "${periodStatus.PERIOD_NAME}" is closed for posting.`);
// //         err.statusCode = 400;
// //         throw err;
// //       }

// //       // ── 4. New voucher number ───────────────────────────────────────
// //       const transDateStr = toDateStr(original.TRANS_DATE);
// //       const newVoucherNo = await getNextVoucherNo(conn, original.VOUCHER_TYPE, transDateStr);

// //       // ── 5. Insert reversal GLMASTER ─────────────────────────────────
// //       const insertResult = await conn.execute(
// //         `INSERT INTO GLMASTER
// //           (trans_date, voucher_type, description, supporting, voucherno, cashaccount,
// //            customer_id, gl_entry_date, posted, inv_type, sale_invoice_no, po_number,
// //            entry_by, TYPE, REF_REVERSE_ENTRY)
// //          VALUES
// //           (:tdate, :vtype, :des, :sup, :vno, :cash, :cust, :gld, 1, :invtype, :saleinvno,
// //            :ponumber, :entryby, 'REVERSE', :refreverse)
// //          RETURNING ID INTO :new_id`,
// //         {
// //           tdate: original.TRANS_DATE,
// //           vtype: original.VOUCHER_TYPE,
// //           des: original.DESCRIPTION,
// //           sup: original.SUPPORTING,
// //           vno: newVoucherNo,
// //           cash: original.CASHACCOUNT,
// //           cust: original.CUSTOMER_ID,
// //           gld: original.GL_ENTRY_DATE,
// //           invtype: original.INV_TYPE ?? null,
// //           saleinvno: original.SALE_INVOICE_NO ?? null,
// //           ponumber: original.PO_NUMBER ?? null,
// //           entryby: entry_by ?? null,
// //           refreverse: masterID,
// //           new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
// //         },
// //         { autoCommit: false }
// //       );
// //       const newMasterID = insertResult.outBinds.new_id[0];

// //       // ── 6. Insert reversal GLDETAILS — debit/credit swapped ─────────
// //       for (const d of originalDetails) {
// //         await conn.execute(
// //           `INSERT INTO GLDETAILS (glmasterid, code, debit, credit, codedescription, description)
// //            VALUES (:mid, :code, :debit, :credit, :cdesc, :ds)`,
// //           {
// //             mid: newMasterID,
// //             code: d.CODE,
// //             debit: Number(d.CREDIT) || 0,
// //             credit: Number(d.DEBIT) || 0,
// //             cdesc: d.CODEDESCRIPTION || "",
// //             ds: d.DESCRIPTION || "",
// //           },
// //           { autoCommit: false }
// //         );
// //       }

// //       await conn.commit();
// //       return { originalID: masterID, masterID: newMasterID, voucherNo: newVoucherNo };
// //     } catch (error) {
// //       await conn.rollback();
// //       throw error;
// //     }
// //   });
// // }

// import { withConnection, oracledb } from "../../config/db.js";
// import { getPeriodStatusForDate } from "../ledger-period-calendar/service.js";

// const LEDGER_TYPE_BY_VOUCHER = { 1: "AR", 2: "AP", 3: "GL" };

// function toDateStr(value) {
//   if (!value) return null;
//   if (value instanceof Date) return value.toISOString().slice(0, 10);
//   return String(value).slice(0, 10);
// }

// async function getNextVoucherNo(conn, voucherType, transDateStr) {
//   const seqResult = await conn.execute(
//     `SELECT SUBSTR(voucherno,-3,3) V_NO FROM GLMASTER
//      WHERE voucher_type = :vtype ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
//     { vtype: voucherType },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const next = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, "0");

//   if (Number(voucherType) === 3) {
//     // Journal vouchers → YYYYMMDD prefix
//     const datePart = transDateStr.replace(/-/g, "").slice(0, 8);
//     return `${datePart}${next}`;
//   }
//   // Receipt / Payment → YYYYMM prefix
//   const [year, month] = transDateStr.split("-");
//   return `${year}${month}${next}`;
// }

// export async function reverseGlEntry(masterID, entry_by) {
//   return withConnection(async (conn) => {
//     try {
//       // ── 1. Fetch original master ────────────────────────────────────
//       const masterResult = await conn.execute(
//         "SELECT * FROM GLMASTER WHERE id = :id",
//         { id: masterID },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       const original = masterResult.rows[0];
//       if (!original) {
//         const err = new Error(`No voucher found for id = ${masterID}`);
//         err.statusCode = 404;
//         throw err;
//       }

//       // ── 2. Validation — only entries explicitly marked TYPE="REVERSE"
//       //      by the user (via create/edit form) are eligible to reverse ──
//       if (String(original.TYPE).toUpperCase() !== "REVERSE") {
//         const err = new Error('Only entries with Type = "Reverse" can be reversed.');
//         err.statusCode = 400;
//         throw err;
//       }
//       if (original.REF_REVERSE_ENTRY) {
//         const err = new Error("This voucher has already been reversed.");
//         err.statusCode = 400;
//         throw err;
//       }
//       if (Number(original.POSTED) !== 1) {
//         const err = new Error("Only approved (posted) vouchers can be reversed.");
//         err.statusCode = 400;
//         throw err;
//       }

//       // ── 3. Fetch original details ───────────────────────────────────
//       const detailsResult = await conn.execute(
//         "SELECT * FROM GLDETAILS WHERE glmasterID = :id ORDER BY id ASC",
//         { id: masterID },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       const originalDetails = detailsResult.rows;

//       // ── 4. Period lock check ────────────────────────────────────────
//       const ledgerType = LEDGER_TYPE_BY_VOUCHER[Number(original.VOUCHER_TYPE)] || "GL";
//       const glDateStr = toDateStr(original.GL_ENTRY_DATE);
//       const periodStatus = await getPeriodStatusForDate(ledgerType, glDateStr);

//       if (!periodStatus) {
//         const err = new Error(`No ledger period is defined for ${ledgerType} date ${glDateStr}. Please set up the period calendar first.`);
//         err.statusCode = 400;
//         throw err;
//       }
//       if (periodStatus.STATUS === "CLOSED") {
//         const err = new Error(`${ledgerType} period "${periodStatus.PERIOD_NAME}" is closed for posting.`);
//         err.statusCode = 400;
//         throw err;
//       }

//       // ── 5. New voucher number ───────────────────────────────────────
//       const transDateStr = toDateStr(original.TRANS_DATE);
//       const newVoucherNo = await getNextVoucherNo(conn, original.VOUCHER_TYPE, transDateStr);

//       // ── 6. Insert reversal GLMASTER (the new entry is ALSO marked
//       //      TYPE="REVERSE" so it's clearly identifiable as a reversal
//       //      record, and REF_REVERSE_ENTRY points back to the original) ─
//     //   const insertResult = await conn.execute(
//     //     `INSERT INTO GLMASTER
//     //       (trans_date, voucher_type, description, supporting, voucherno, cashaccount,
//     //        customer_id, gl_entry_date, posted, inv_type, sale_invoice_no, po_number,
//     //        entry_by, TYPE, REF_REVERSE_ENTRY)
//     //      VALUES
//     //       (:tdate, :vtype, :des, :sup, :vno, :cash, :cust, :gld, 1, :invtype, :saleinvno,
//     //        :ponumber, :entryby, 'REVERSE', :refreverse)
//     //      RETURNING ID INTO :new_id`,
//     //     {
//     //       tdate: original.TRANS_DATE,
//     //       vtype: original.VOUCHER_TYPE,
//     //       des: original.DESCRIPTION,
//     //       sup: original.SUPPORTING,
//     //       vno: newVoucherNo,
//     //       cash: original.CASHACCOUNT,
//     //       cust: original.CUSTOMER_ID,
//     //       gld: original.GL_ENTRY_DATE,
//     //       invtype: original.INV_TYPE ?? null,
//     //       saleinvno: original.SALE_INVOICE_NO ?? null,
//     //       ponumber: original.PO_NUMBER ?? null,
//     //       entryby: entry_by ?? null,
//     //       refreverse: masterID,
//     //       new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
//     //     },
//     //     { autoCommit: false }
//     //   );
//     const insertResult = await conn.execute(
//   `INSERT INTO GLMASTER
//     (trans_date, voucher_type, description, supporting, voucherno, cashaccount,
//      customer_id, gl_entry_date, posted, inv_type, sale_invoice_no, po_number,
//      entry_by, TYPE, REF_REVERSE_ENTRY)
//    VALUES
//     (TO_DATE(:tdate,'YYYY-MM-DD'), :vtype, :des, :sup, :vno, :cash, :cust,
//      TO_DATE(:gld,'YYYY-MM-DD'), 1, :invtype, :saleinvno,
//      :ponumber, :entryby, 'REVERSE', :refreverse)
//    RETURNING ID INTO :new_id`,
//   {
//     tdate: transDateStr,       // ← already computed above via toDateStr()
//     vtype: original.VOUCHER_TYPE,
//     des: original.DESCRIPTION,
//     sup: original.SUPPORTING,
//     vno: newVoucherNo,
//     cash: original.CASHACCOUNT,
//     cust: original.CUSTOMER_ID,
//     gld: glDateStr,            // ← already computed above via toDateStr()
//     invtype: original.INV_TYPE ?? null,
//     saleinvno: original.SALE_INVOICE_NO ?? null,
//     ponumber: original.PO_NUMBER ?? null,
//     entryby: entry_by ?? null,
//     refreverse: masterID,
//     new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
//   },
//   { autoCommit: false }
// );
//       const newMasterID = insertResult.outBinds.new_id[0];

//       // ── 7. Insert reversal GLDETAILS — debit/credit swapped ─────────
//       for (const d of originalDetails) {
//         await conn.execute(
//           `INSERT INTO GLDETAILS (glmasterid, code, debit, credit, codedescription, description)
//            VALUES (:mid, :code, :debit, :credit, :cdesc, :ds)`,
//           {
//             mid: newMasterID,
//             code: d.CODE,
//             debit: Number(d.CREDIT) || 0,
//             credit: Number(d.DEBIT) || 0,
//             cdesc: d.CODEDESCRIPTION || "",
//             ds: d.DESCRIPTION || "",
//           },
//           { autoCommit: false }
//         );
//       }

//       // ── 8. Mark the ORIGINAL row as reversed — this is what stops the
//       //      icon from showing again and blocks double-reversal ────────
//       await conn.execute(
//         `UPDATE GLMASTER SET REF_REVERSE_ENTRY = :newId WHERE id = :id`,
//         { newId: newMasterID, id: masterID },
//         { autoCommit: false }
//       );

//       await conn.commit();
//       return { originalID: masterID, masterID: newMasterID, voucherNo: newVoucherNo };
//     } catch (error) {
//       await conn.rollback();
//       throw error;
//     }
//   });
// }

import { withConnection, oracledb } from "../../config/db.js";
import { getPeriodStatusForDate } from "../ledger-period-calendar/service.js";

const LEDGER_TYPE_BY_VOUCHER = { 1: "AR", 2: "AP", 3: "GL" };

async function getNextVoucherNo(conn, voucherType, transDateStr) {
  const seqResult = await conn.execute(
    `SELECT SUBSTR(voucherno,-3,3) V_NO FROM GLMASTER
     WHERE voucher_type = :vtype ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
    { vtype: voucherType },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const next = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, "0");

  if (Number(voucherType) === 3) {
    // Journal vouchers → YYYYMMDD prefix
    const datePart = transDateStr.replace(/-/g, "").slice(0, 8);
    return `${datePart}${next}`;
  }
  // Receipt / Payment → YYYYMM prefix
  const [year, month] = transDateStr.split("-");
  return `${year}${month}${next}`;
}

export async function reverseGlEntry(masterID, entry_by) {
  return withConnection(async (conn) => {
    try {
      // ── 1. Fetch original master — dates explicitly converted to ISO
      //      strings via TO_CHAR at the SQL level, so this never depends
      //      on the session's NLS_DATE_FORMAT (which caused ORA-01841
      //      when the raw DATE-as-string came back as e.g. "27-AUG-26"
      //      instead of "2026-08-27"). ─────────────────────────────────
      const masterResult = await conn.execute(
        `SELECT m.*,
           TO_CHAR(m.TRANS_DATE, 'YYYY-MM-DD') AS TRANS_DATE_ISO,
           TO_CHAR(m.GL_ENTRY_DATE, 'YYYY-MM-DD') AS GL_ENTRY_DATE_ISO
         FROM GLMASTER m
         WHERE m.id = :id`,
        { id: masterID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const original = masterResult.rows[0];
      if (!original) {
        const err = new Error(`No voucher found for id = ${masterID}`);
        err.statusCode = 404;
        throw err;
      }

      // ── 2. Validation — only entries explicitly marked TYPE="REVERSE"
      //      by the user (via create/edit form) are eligible to reverse ──
      if (String(original.TYPE).toUpperCase() !== "REVERSE") {
        const err = new Error('Only entries with Type = "Reverse" can be reversed.');
        err.statusCode = 400;
        throw err;
      }
      if (original.REF_REVERSE_ENTRY) {
        const err = new Error("This voucher has already been reversed.");
        err.statusCode = 400;
        throw err;
      }
      if (Number(original.POSTED) !== 1) {
        const err = new Error("Only approved (posted) vouchers can be reversed.");
        err.statusCode = 400;
        throw err;
      }

      // ── 3. Fetch original details ───────────────────────────────────
      const detailsResult = await conn.execute(
        "SELECT * FROM GLDETAILS WHERE glmasterID = :id ORDER BY id ASC",
        { id: masterID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const originalDetails = detailsResult.rows;

      // ── 4. Period lock check — use the ISO date fetched via TO_CHAR ──
      const ledgerType = LEDGER_TYPE_BY_VOUCHER[Number(original.VOUCHER_TYPE)] || "GL";
      const glDateStr = original.GL_ENTRY_DATE_ISO;
      const periodStatus = await getPeriodStatusForDate(ledgerType, glDateStr);

      if (!periodStatus) {
        const err = new Error(`No ledger period is defined for ${ledgerType} date ${glDateStr}. Please set up the period calendar first.`);
        err.statusCode = 400;
        throw err;
      }
      if (periodStatus.STATUS === "CLOSED") {
        const err = new Error(`${ledgerType} period "${periodStatus.PERIOD_NAME}" is closed for posting.`);
        err.statusCode = 400;
        throw err;
      }

      // ── 5. New voucher number — use the ISO date fetched via TO_CHAR ─
      const transDateStr = original.TRANS_DATE_ISO;
      const newVoucherNo = await getNextVoucherNo(conn, original.VOUCHER_TYPE, transDateStr);

      // ── 6. Insert reversal GLMASTER (the new entry is ALSO marked
      //      TYPE="REVERSE" so it's clearly identifiable as a reversal
      //      record, and REF_REVERSE_ENTRY points back to the original).
      //      Dates are bound as ISO strings and converted with an
      //      explicit TO_DATE(...,'YYYY-MM-DD') mask — no ambiguity. ───
      const insertResult = await conn.execute(
        `INSERT INTO GLMASTER
          (trans_date, voucher_type, description, supporting, voucherno, cashaccount,
           customer_id, gl_entry_date, posted, inv_type, sale_invoice_no, po_number,
           entry_by, TYPE, REF_REVERSE_ENTRY)
         VALUES
          (TO_DATE(:tdate,'YYYY-MM-DD'), :vtype, :des, :sup, :vno, :cash, :cust,
           TO_DATE(:gld,'YYYY-MM-DD'), 0, :invtype, :saleinvno,
           :ponumber, :entryby, 'REVERSE', :refreverse)
         RETURNING ID INTO :new_id`,
        {
          tdate: transDateStr,
          vtype: original.VOUCHER_TYPE,
          des: original.DESCRIPTION,
          sup: original.SUPPORTING,
          vno: newVoucherNo,
          cash: original.CASHACCOUNT,
          cust: original.CUSTOMER_ID,
          gld: glDateStr,
          invtype: original.INV_TYPE ?? null,
          saleinvno: original.SALE_INVOICE_NO ?? null,
          ponumber: original.PO_NUMBER ?? null,
          entryby: entry_by ?? null,
          refreverse: masterID,
          new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: false }
      );
      const newMasterID = insertResult.outBinds.new_id[0];

      // ── 7. Insert reversal GLDETAILS — debit/credit swapped ─────────
      for (const d of originalDetails) {
        await conn.execute(
          `INSERT INTO GLDETAILS (glmasterid, code, debit, credit, codedescription, description)
           VALUES (:mid, :code, :debit, :credit, :cdesc, :ds)`,
          {
            mid: newMasterID,
            code: d.CODE,
            debit: Number(d.CREDIT) || 0,
            credit: Number(d.DEBIT) || 0,
            cdesc: d.CODEDESCRIPTION || "",
            ds: d.DESCRIPTION || "",
          },
          { autoCommit: false }
        );
      }

      // ── 8. Mark the ORIGINAL row as reversed — this is what stops the
      //      icon from showing again and blocks double-reversal ────────
      await conn.execute(
        `UPDATE GLMASTER SET REF_REVERSE_ENTRY = :newId WHERE id = :id`,
        { newId: newMasterID, id: masterID },
        { autoCommit: false }
      );

      await conn.commit();
      return { originalID: masterID, masterID: newMasterID, voucherNo: newVoucherNo };
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  });
}