
// import { withConnection, oracledb } from "../../config/db.js";

// function toMmDdYyyy(input) {
//   const [year, month, day] = String(input).split("-");
//   return `${month}-${day}-${year}`;
// }

// // export async function createGlEntry({
// //   trans_date,
// //   GL_ENTRY_DATE,
// //   receive_desc,
// //   supporting,
// //   details,
// //   entry_by,
// // }) {
// //   return withConnection(async (conn) => {
// //     try {
// //       // ── 1. Validate details ───────────────────────────────────────────
// //       if (!Array.isArray(details) || details.length === 0) {
// //         throw new Error("At least one detail row is required.");
// //       }

// //       // ── 2. Generate next voucher number (VOUCHER_TYPE = 3) ────────────
// //       const seqResult = await conn.execute(
// //         `SELECT SUBSTR(VOUCHERNO, -3, 3) AS V_NO
// //          FROM   GLMASTER
// //          WHERE  VOUCHER_TYPE = 3
// //          ORDER  BY ID DESC
// //          FETCH  FIRST 1 ROWS ONLY`,
// //         {},
// //         { outFormat: oracledb.OUT_FORMAT_OBJECT }
// //       );

// //       const lastVNo = seqResult.rows?.[0]?.V_NO
// //         ? parseInt(seqResult.rows[0].V_NO, 10)
// //         : 0;
// //       const newVNo    = String(lastVNo + 1).padStart(3, "0");
// //       const datePart  = trans_date.replace(/-/g, "").slice(0, 8); // YYYYMMDD
// //       const voucherNo = `${datePart}${newVNo}`;

// //       // ── 3. Format dates ───────────────────────────────────────────────
// //       const transDateFmt   = toMmDdYyyy(trans_date);
// //       const glEntryDateFmt = toMmDdYyyy(GL_ENTRY_DATE);
// //       const desc           = receive_desc  ?? "";
// //       const sup            = supporting    ?? "1";

// //       // ── 4. Insert GLMASTER ────────────────────────────────────────────
// //       const masterResult = await conn.execute(
// //         `INSERT INTO GLMASTER
// //            (TRANS_DATE, VOUCHER_TYPE, DESCRIPTION, SUPPORTING,
// //             VOUCHERNO,  GL_ENTRY_DATE, POSTED)
// //          VALUES
// //            (TO_DATE(:trans_date,    'MM-DD-YYYY'),
// //             3, :description, :supporting, :voucher_no,
// //             TO_DATE(:gl_entry_date, 'MM-DD-YYYY'), 0)
// //          RETURNING ID INTO :new_id`,
// //         {
// //           trans_date:    transDateFmt,
// //           description:   desc,
// //           supporting:    sup,
// //           voucher_no:    voucherNo,
// //           gl_entry_date: glEntryDateFmt,
// //           new_id:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
// //         },
// //         { autoCommit: false }
// //       );

// //       const masterID = masterResult.outBinds?.new_id?.[0];
// //       if (!masterID) throw new Error("Failed to retrieve new GLMASTER ID.");

// //       // ── 5. Insert GLDETAILS rows ──────────────────────────────────────
// //       const detailSql = `
// //         INSERT INTO GLDETAILS
// //           (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
// //         VALUES
// //           (:master_id, :code, :debit, :credit, :code_desc, :description)
// //       `;

// //       for (const d of details) {
// //         const { code, debit, credit, description: detDesc = "" } = d;

// //         if (code === undefined || debit === undefined || credit === undefined) {
// //           throw new Error("Each detail row must have code, debit, and credit.");
// //         }

// //         // Frontend sends  "ACCOUNT_ID##ACCOUNT_LABEL"
// //         const [cleanCode, codeDesc = ""] = String(code).split("##");

// //         await conn.execute(
// //           detailSql,
// //           {
// //             master_id:   masterID,
// //             code:        cleanCode.trim(),
// //             debit:       Number(debit)  || 0,
// //             credit:      Number(credit) || 0,
// //             code_desc:   codeDesc.trim(),
// //             description: detDesc,
// //           },
// //           { autoCommit: false }
// //         );
// //       }

// //       // ── 6. Commit ─────────────────────────────────────────────────────
// //       await conn.commit();
// //       return { masterId: masterID, voucherNo };

// //     } catch (err) {
// //       await conn.rollback();
// //       throw err;
// //     }
// //   });
// // }


// export async function createGlEntry({
//   trans_date,
//   GL_ENTRY_DATE,
//   receive_desc,
//   supporting,
//   details,
//   entry_by, // <-- frontend theke
// }) {
//   return withConnection(async (conn) => {
//     try {
//       if (!Array.isArray(details) || details.length === 0) {
//         throw new Error("At least one detail row is required.");
//       }

//       const seqResult = await conn.execute(
//         `SELECT SUBSTR(VOUCHERNO, -3, 3) AS V_NO
//          FROM   GLMASTER
//          WHERE  VOUCHER_TYPE = 3
//          ORDER  BY ID DESC
//          FETCH  FIRST 1 ROWS ONLY`,
//         {},
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );

//       const lastVNo = seqResult.rows?.[0]?.V_NO
//         ? parseInt(seqResult.rows[0].V_NO, 10)
//         : 0;
//       const newVNo    = String(lastVNo + 1).padStart(3, "0");
//       const datePart  = trans_date.replace(/-/g, "").slice(0, 8);
//       const voucherNo = `${datePart}${newVNo}`;

//       const transDateFmt   = toMmDdYyyy(trans_date);
//       const glEntryDateFmt = toMmDdYyyy(GL_ENTRY_DATE);
//       const desc           = receive_desc  ?? "";
//       const sup            = supporting    ?? "1";

//       const masterResult = await conn.execute(
//         `INSERT INTO GLMASTER
//            (TRANS_DATE, VOUCHER_TYPE, DESCRIPTION, SUPPORTING,
//             VOUCHERNO,  GL_ENTRY_DATE, POSTED, ENTRY_BY)
//          VALUES
//            (TO_DATE(:trans_date,    'MM-DD-YYYY'),
//             3, :description, :supporting, :voucher_no,
//             TO_DATE(:gl_entry_date, 'MM-DD-YYYY'), 0,
//             :entry_by)
//          RETURNING ID INTO :new_id`,
//         {
//           trans_date:    transDateFmt,
//           description:   desc,
//           supporting:    sup,
//           voucher_no:    voucherNo,
//           gl_entry_date: glEntryDateFmt,
//           entry_by:      entry_by ?? null,
//           new_id:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
//         },
//         { autoCommit: false }
//       );

//       const masterID = masterResult.outBinds?.new_id?.[0];
//       if (!masterID) throw new Error("Failed to retrieve new GLMASTER ID.");

//       const detailSql = `
//         INSERT INTO GLDETAILS
//           (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
//         VALUES
//           (:master_id, :code, :debit, :credit, :code_desc, :description)
//       `;

//       for (const d of details) {
//         const { code, debit, credit, description: detDesc = "" } = d;

//         if (code === undefined || debit === undefined || credit === undefined) {
//           throw new Error("Each detail row must have code, debit, and credit.");
//         }

//         const [cleanCode, codeDesc = ""] = String(code).split("##");

//         await conn.execute(
//           detailSql,
//           {
//             master_id:   masterID,
//             code:        cleanCode.trim(),
//             debit:       Number(debit)  || 0,
//             credit:      Number(credit) || 0,
//             code_desc:   codeDesc.trim(),
//             description: detDesc,
//           },
//           { autoCommit: false }
//         );
//       }

//       await conn.commit();
//       return { masterId: masterID, voucherNo };

//     } catch (err) {
//       await conn.rollback();
//       throw err;
//     }
//   });
// }

import { withConnection, oracledb } from "../../config/db.js";
import { getPeriodStatusForDate } from "../ledger-period-calendar/service.js";
// import { getPeriodStatusForDate } from "../ledgerPeriodCalendar/service.js"; // ← path adjust koro tomar actual folder structure onujayi

function toMmDdYyyy(input) {
  const [year, month, day] = String(input).split("-");
  return `${month}-${day}-${year}`;
}

export async function createGlEntry({
  trans_date,
  GL_ENTRY_DATE,
  receive_desc,
  supporting,
  details,
  entry_by,
}) {
  // ── 0. Period lock check (BEFORE opening any DB transaction) ─────────
  const periodStatus = await getPeriodStatusForDate("GL", GL_ENTRY_DATE);

  if (!periodStatus) {
    const err = new Error(`No ledger period is defined for GL date ${GL_ENTRY_DATE}. Please set up the period calendar first.`);
    err.statusCode = 400;
    throw err;
  }
  if (periodStatus.STATUS === "CLOSED") {
    const err = new Error(`GL period "${periodStatus.PERIOD_NAME}" is closed for posting. Choose a date within an open period.`);
    err.statusCode = 400;
    throw err;
  }

  return withConnection(async (conn) => {
    try {
      if (!Array.isArray(details) || details.length === 0) {
        throw new Error("At least one detail row is required.");
      }

      const seqResult = await conn.execute(
        `SELECT SUBSTR(VOUCHERNO, -3, 3) AS V_NO
         FROM   GLMASTER
         WHERE  VOUCHER_TYPE = 3
         ORDER  BY ID DESC
         FETCH  FIRST 1 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const lastVNo = seqResult.rows?.[0]?.V_NO
        ? parseInt(seqResult.rows[0].V_NO, 10)
        : 0;
      const newVNo    = String(lastVNo + 1).padStart(3, "0");
      const datePart  = trans_date.replace(/-/g, "").slice(0, 8);
      const voucherNo = `${datePart}${newVNo}`;

      const transDateFmt   = toMmDdYyyy(trans_date);
      const glEntryDateFmt = toMmDdYyyy(GL_ENTRY_DATE);
      const desc           = receive_desc  ?? "";
      const sup            = supporting    ?? "1";

      // const masterResult = await conn.execute(
      //   `INSERT INTO GLMASTER
      //      (TRANS_DATE, VOUCHER_TYPE, DESCRIPTION, SUPPORTING,
      //       VOUCHERNO,  GL_ENTRY_DATE, POSTED, ENTRY_BY)
      //    VALUES
      //      (TO_DATE(:trans_date,    'MM-DD-YYYY'),
      //       3, :description, :supporting, :voucher_no,
      //       TO_DATE(:gl_entry_date, 'MM-DD-YYYY'), 0,
      //       :entry_by)
      //    RETURNING ID INTO :new_id`,
      //   {
      //     trans_date:    transDateFmt,
      //     description:   desc,
      //     supporting:    sup,
      //     voucher_no:    voucherNo,
      //     gl_entry_date: glEntryDateFmt,
      //     entry_by:      entry_by ?? null,
      //     new_id:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      //   },
      //   { autoCommit: false }
      // );

     const masterResult = await conn.execute(
  `INSERT INTO GLMASTER
     (TRANS_DATE, VOUCHER_TYPE, DESCRIPTION, SUPPORTING,
      VOUCHERNO,  GL_ENTRY_DATE, POSTED, ENTRY_BY, TYPE, REF_REVERSE_ENTRY)
   VALUES
     (TO_DATE(:trans_date,    'MM-DD-YYYY'),
      3, :description, :supporting, :voucher_no,
      TO_DATE(:gl_entry_date, 'MM-DD-YYYY'), 0,
      :entry_by, :type, :refreverse)
   RETURNING ID INTO :new_id`,
  {
    trans_date:    transDateFmt,
    description:   desc,
    supporting:    sup,
    voucher_no:    voucherNo,
    gl_entry_date: glEntryDateFmt,
    entry_by:      entry_by ?? null,
    type:          type ?? "MANUAL",
    refreverse:    ref_reverse_entry ?? null,
    new_id:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  },
  { autoCommit: false }
);
     
      const masterID = masterResult.outBinds?.new_id?.[0];
      if (!masterID) throw new Error("Failed to retrieve new GLMASTER ID.");

      const detailSql = `
        INSERT INTO GLDETAILS
          (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
        VALUES
          (:master_id, :code, :debit, :credit, :code_desc, :description)
      `;

      for (const d of details) {
        const { code, debit, credit, description: detDesc = "" } = d;

        if (code === undefined || debit === undefined || credit === undefined) {
          throw new Error("Each detail row must have code, debit, and credit.");
        }

        const [cleanCode, codeDesc = ""] = String(code).split("##");

        await conn.execute(
          detailSql,
          {
            master_id:   masterID,
            code:        cleanCode.trim(),
            debit:       Number(debit)  || 0,
            credit:      Number(credit) || 0,
            code_desc:   codeDesc.trim(),
            description: detDesc,
          },
          { autoCommit: false }
        );
      }

      await conn.commit();
      return { masterId: masterID, voucherNo };

    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}