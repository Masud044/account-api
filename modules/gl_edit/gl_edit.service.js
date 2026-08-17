// // import { withConnection } from "../../config/db.js";

// // /**
// //  * Converts "YYYY-MM-DD" → "MM-DD-YYYY" for Oracle TO_DATE
// //  */
// // function toMmDdYyyy(input) {
// //   const [year, month, day] = String(input).split("-");
// //   return `${month}-${day}-${year}`;
// // }

// // export async function updateGlEntry({
// //   master_id,
// //   trans_date,
// //   gl_entry_date,
// //   receive_desc,
// //   supporting,
// //   details,
// // }) {
// //   return withConnection(async (conn) => {
// //     // --- 1. Update GLMASTER ---
// //     const masterSql = `
// //       UPDATE GLMASTER SET
// //         TRANS_DATE    = TO_DATE(:trans_date,    'MM-DD-YYYY'),
// //         DESCRIPTION   = :description,
// //         SUPPORTING    = :supporting,
// //         GL_ENTRY_DATE = TO_DATE(:gl_entry_date, 'MM-DD-YYYY')
// //       WHERE ID = :master_id
// //     `;

// //     await conn.execute(
// //       masterSql,
// //       {
// //         trans_date:    toMmDdYyyy(trans_date),
// //         description:   receive_desc ?? null,
// //         supporting:    supporting   ?? null,
// //         gl_entry_date: toMmDdYyyy(gl_entry_date),
// //         master_id:     Number(master_id),
// //       },
// //       { autoCommit: false }
// //     );

// //     // --- 2. Update each GLDETAILS row ---
// //     const detailSql = `
// //       UPDATE GLDETAILS
// //       SET DEBIT  = :debit,
// //           CREDIT = :credit
// //       WHERE GLMASTERID = :master_id
// //         AND ID          = :detail_id
// //     `;

// //     for (const d of details) {
// //       if (d.id === undefined || d.debit === undefined || d.credit === undefined) {
// //         throw new Error("Each detail row must have id, debit, and credit.");
// //       }

// //       await conn.execute(
// //         detailSql,
// //         {
// //           debit:     Number(d.debit),
// //           credit:    Number(d.credit),
// //           master_id: Number(master_id),
// //           detail_id: Number(d.id),
// //         },
// //         { autoCommit: false }
// //       );
// //     }

// //     // --- 3. Commit transaction ---
// //     await conn.commit();
// //     return { masterId: master_id };
// //   });
// // }


// import { withConnection, oracledb } from "../../config/db.js";

// function toMmDdYyyy(input) {
//   const [year, month, day] = String(input).split("-");
//   return `${month}-${day}-${year}`;
// }

// /**
//  * Rules:
//  *  - detail.id is a REAL Oracle GLDETAILS.ID  → UPDATE that row
//  *  - detail.id is null / float timestamp       → INSERT as new detail
//  *
//  * Frontend sends:  id: r.detail_id || r.id
//  *   • Existing rows loaded from DB  → detail_id = real integer DB ID  ✅ UPDATE
//  *   • New rows added during edit    → detail_id = null, id = Date.now() float ❌ INSERT
//  */
// // export async function updateGlEntry({
// //   master_id,
// //   trans_date,
// //   gl_entry_date,
// //   receive_desc,
// //   supporting,
// //   details,
// // }) {
// //   return withConnection(async (conn) => {
// //     try {
// //       // ── 1. Update GLMASTER ────────────────────────────────────────────
// //       await conn.execute(
// //         `UPDATE GLMASTER SET
// //            TRANS_DATE    = TO_DATE(:trans_date,    'MM-DD-YYYY'),
// //            DESCRIPTION   = :description,
// //            SUPPORTING    = :supporting,
// //            GL_ENTRY_DATE = TO_DATE(:gl_entry_date, 'MM-DD-YYYY')
// //          WHERE ID = :master_id`,
// //         {
// //           trans_date:    toMmDdYyyy(trans_date),
// //           description:   receive_desc ?? null,
// //           supporting:    supporting   ?? null,
// //           gl_entry_date: toMmDdYyyy(gl_entry_date),
// //           master_id:     Number(master_id),
// //         },
// //         { autoCommit: false }
// //       );

// //       // ── 2. Fetch existing GLDETAILS IDs for this master ───────────────
// //       const existingResult = await conn.execute(
// //         `SELECT ID FROM GLDETAILS WHERE GLMASTERID = :master_id`,
// //         { master_id: Number(master_id) },
// //         { outFormat: oracledb.OUT_FORMAT_OBJECT }
// //       );
// //       const existingIds = new Set(
// //         (existingResult.rows || []).map((r) => Number(r.ID))
// //       );

// //       // ── 3. Process each detail row ────────────────────────────────────
// //       for (const d of details) {
// //         if (d.debit === undefined || d.credit === undefined) {
// //           throw new Error("Each detail row must have debit and credit.");
// //         }

// //         const parsedId = Number(d.id);

// //         // Is this a REAL DB id?  (integer and exists in DB)
// //         const isRealId =
// //           Number.isInteger(parsedId) && existingIds.has(parsedId);

// //         if (isRealId) {
// //           // ── UPDATE existing row ───────────────────────────────────────
// //           await conn.execute(
// //             `UPDATE GLDETAILS
// //              SET DEBIT  = :debit,
// //                  CREDIT = :credit
// //              WHERE GLMASTERID = :master_id
// //                AND ID          = :detail_id`,
// //             {
// //               debit:     Number(d.debit)  || 0,
// //               credit:    Number(d.credit) || 0,
// //               master_id: Number(master_id),
// //               detail_id: parsedId,
// //             },
// //             { autoCommit: false }
// //           );
// //         } else {
// //           // ── INSERT new row (added during edit) ────────────────────────
// //           if (!d.code) {
// //             throw new Error("New detail rows must include a code.");
// //           }
// //           const [cleanCode, codeDesc = ""] = String(d.code).split("##");

// //           await conn.execute(
// //             `INSERT INTO GLDETAILS
// //                (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
// //              VALUES
// //                (:master_id, :code, :debit, :credit, :code_desc, :description)`,
// //             {
// //               master_id:   Number(master_id),
// //               code:        cleanCode.trim(),
// //               debit:       Number(d.debit)  || 0,
// //               credit:      Number(d.credit) || 0,
// //               code_desc:   codeDesc.trim(),
// //               description: d.description ?? "",
// //             },
// //             { autoCommit: false }
// //           );
// //         }
// //       }

// //       // ── 4. Commit ─────────────────────────────────────────────────────
// //       await conn.commit();
// //       return { masterId: Number(master_id) };

// //     } catch (err) {
// //       await conn.rollback();
// //       throw err;
// //     }
// //   });
// // }


// export async function updateGlEntry({
//   master_id,
//   trans_date,
//   gl_entry_date,
//   receive_desc,
//   supporting,
//   details,
//   update_by, // <-- frontend theke
// }) {
//   return withConnection(async (conn) => {
//     try {
//       await conn.execute(
//         `UPDATE GLMASTER SET
//            TRANS_DATE    = TO_DATE(:trans_date,    'MM-DD-YYYY'),
//            DESCRIPTION   = :description,
//            SUPPORTING    = :supporting,
//            GL_ENTRY_DATE = TO_DATE(:gl_entry_date, 'MM-DD-YYYY'),
//            UPDATE_BY     = :update_by,
//            UPDATE_DATE   = SYSDATE
//          WHERE ID = :master_id`,
//         {
//           trans_date:    toMmDdYyyy(trans_date),
//           description:   receive_desc ?? null,
//           supporting:    supporting   ?? null,
//           gl_entry_date: toMmDdYyyy(gl_entry_date),
//           update_by:     update_by ?? null,
//           master_id:     Number(master_id),
//         },
//         { autoCommit: false }
//       );

//       const existingResult = await conn.execute(
//         `SELECT ID FROM GLDETAILS WHERE GLMASTERID = :master_id`,
//         { master_id: Number(master_id) },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       const existingIds = new Set(
//         (existingResult.rows || []).map((r) => Number(r.ID))
//       );

//       for (const d of details) {
//         if (d.debit === undefined || d.credit === undefined) {
//           throw new Error("Each detail row must have debit and credit.");
//         }

//         const parsedId = Number(d.id);
//         const isRealId =
//           Number.isInteger(parsedId) && existingIds.has(parsedId);

//         if (isRealId) {
//           await conn.execute(
//             `UPDATE GLDETAILS
//              SET DEBIT  = :debit,
//                  CREDIT = :credit
//              WHERE GLMASTERID = :master_id
//                AND ID          = :detail_id`,
//             {
//               debit:     Number(d.debit)  || 0,
//               credit:    Number(d.credit) || 0,
//               master_id: Number(master_id),
//               detail_id: parsedId,
//             },
//             { autoCommit: false }
//           );
//         } else {
//           if (!d.code) {
//             throw new Error("New detail rows must include a code.");
//           }
//           const [cleanCode, codeDesc = ""] = String(d.code).split("##");

//           await conn.execute(
//             `INSERT INTO GLDETAILS
//                (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
//              VALUES
//                (:master_id, :code, :debit, :credit, :code_desc, :description)`,
//             {
//               master_id:   Number(master_id),
//               code:        cleanCode.trim(),
//               debit:       Number(d.debit)  || 0,
//               credit:      Number(d.credit) || 0,
//               code_desc:   codeDesc.trim(),
//               description: d.description ?? "",
//             },
//             { autoCommit: false }
//           );
//         }
//       }

//       await conn.commit();
//       return { masterId: Number(master_id) };

//     } catch (err) {
//       await conn.rollback();
//       throw err;
//     }
//   });
// }


import { withConnection, oracledb } from "../../config/db.js";
import { getPeriodStatusForDate } from "../ledger-period-calendar/service.js";


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
  update_by,
}) {
  // ── 0. Period lock check ──────────────────────────────────────────────
  const periodStatus = await getPeriodStatusForDate("GL", gl_entry_date);

  if (!periodStatus) {
    const err = new Error(`No ledger period is defined for GL date ${gl_entry_date}. Please set up the period calendar first.`);
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
      await conn.execute(
        `UPDATE GLMASTER SET
           TRANS_DATE    = TO_DATE(:trans_date,    'MM-DD-YYYY'),
           DESCRIPTION   = :description,
           SUPPORTING    = :supporting,
           GL_ENTRY_DATE = TO_DATE(:gl_entry_date, 'MM-DD-YYYY'),
           UPDATE_BY     = :update_by,
           UPDATE_DATE   = SYSDATE
         WHERE ID = :master_id`,
        {
          trans_date:    toMmDdYyyy(trans_date),
          description:   receive_desc ?? null,
          supporting:    supporting   ?? null,
          gl_entry_date: toMmDdYyyy(gl_entry_date),
          update_by:     update_by ?? null,
          master_id:     Number(master_id),
        },
        { autoCommit: false }
      );

      const existingResult = await conn.execute(
        `SELECT ID FROM GLDETAILS WHERE GLMASTERID = :master_id`,
        { master_id: Number(master_id) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const existingIds = new Set(
        (existingResult.rows || []).map((r) => Number(r.ID))
      );

      for (const d of details) {
        if (d.debit === undefined || d.credit === undefined) {
          throw new Error("Each detail row must have debit and credit.");
        }

        const parsedId = Number(d.id);
        const isRealId =
          Number.isInteger(parsedId) && existingIds.has(parsedId);

        if (isRealId) {
          await conn.execute(
            `UPDATE GLDETAILS
             SET DEBIT  = :debit,
                 CREDIT = :credit
             WHERE GLMASTERID = :master_id
               AND ID          = :detail_id`,
            {
              debit:     Number(d.debit)  || 0,
              credit:    Number(d.credit) || 0,
              master_id: Number(master_id),
              detail_id: parsedId,
            },
            { autoCommit: false }
          );
        } else {
          if (!d.code) {
            throw new Error("New detail rows must include a code.");
          }
          const [cleanCode, codeDesc = ""] = String(d.code).split("##");

          await conn.execute(
            `INSERT INTO GLDETAILS
               (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
             VALUES
               (:master_id, :code, :debit, :credit, :code_desc, :description)`,
            {
              master_id:   Number(master_id),
              code:        cleanCode.trim(),
              debit:       Number(d.debit)  || 0,
              credit:      Number(d.credit) || 0,
              code_desc:   codeDesc.trim(),
              description: d.description ?? "",
            },
            { autoCommit: false }
          );
        }
      }

      await conn.commit();
      return { masterId: Number(master_id) };

    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}