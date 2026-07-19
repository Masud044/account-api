// import { withConnection, oracledb } from "../../config/db.js";

// /**
//  * Inserts a new chart-of-account record, assigns its parent, and
//  * auto-generates a hierarchical account_id based on the parent's LEBEL.
//  */
// export async function addChartAccount(body) {
//   const { account_name, drop_1, drop_2, drop_3, lastLevel, enabled } = body;

//   // Priority: drop_3 > drop_2 > drop_1
//   const parentRowId = drop_3 || drop_2 || drop_1 || null;

//   await withConnection(async (conn) => {
//     // 1. Insert new account
//     await conn.execute(
//       `INSERT INTO chart_of_account (account_name, enabled, entry_date)
//        VALUES (:account_name, :enabled, SYSDATE)`,
//       { account_name, enabled: enabled ?? 1 },
//       { autoCommit: false }
//     );

//     // 2. Get ID of inserted row
//     const maxIdResult = await conn.execute(
//       `SELECT MAX(id) AS new_id FROM chart_of_account`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const newId = maxIdResult.rows[0].NEW_ID;

//     // 3. If a parent was supplied, resolve it and generate account_id
//     if (parentRowId) {
//       const parentResult = await conn.execute(
//         `SELECT id, lebel, account_id FROM chart_of_account WHERE id = :parentRowId`,
//         { parentRowId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );

//       if (!parentResult.rows.length) {
//         throw new Error(`Parent account with id ${parentRowId} not found.`);
//       }

//       const parent          = parentResult.rows[0];
//       const parentAccountId = parent.ACCOUNT_ID;
//       const parentLebel     = parent.LEBEL;
//       const parentId        = parent.ID;

//       // Set PARENT_ACCOUNT_ID
//       await conn.execute(
//         `UPDATE chart_of_account SET parent_account_id = :parentAccountId WHERE id = :newId`,
//         { parentAccountId, newId },
//         { autoCommit: false }
//       );

//       // 4. Generate account_id by level
//       let acNo;

//       if (parentLebel === 1) {
//         const seqResult = await conn.execute(
//           `SELECT MAX(TO_NUMBER(SUBSTR(account_id, 2, 2))) + 1 AS num
//              FROM chart_of_account
//             WHERE SUBSTR(account_id, 1, 1) = SUBSTR(:parentAccountId, 1, 1)`,
//           { parentAccountId },
//           { outFormat: oracledb.OUT_FORMAT_OBJECT }
//         );
//         const seq = String(seqResult.rows[0].NUM || 1).padStart(2, "0");
//         acNo = parentAccountId.substring(0, 1) + seq + "0000000";

//       } else if (parentLebel === 2) {
//         const seqResult = await conn.execute(
//           `SELECT MAX(TO_NUMBER(SUBSTR(account_id, 4, 3))) + 1 AS num
//              FROM chart_of_account
//             WHERE SUBSTR(account_id, 1, 3) = SUBSTR(:parentAccountId, 1, 3)`,
//           { parentAccountId },
//           { outFormat: oracledb.OUT_FORMAT_OBJECT }
//         );
//         const seq = String(seqResult.rows[0].NUM || 1).padStart(3, "0");
//         acNo = parentAccountId.substring(0, 3) + seq + "0000";

//       } else if (parentLebel === 3) {
//         const seqResult = await conn.execute(
//           `SELECT MAX(TO_NUMBER(SUBSTR(account_id, 7, 4))) + 1 AS num
//              FROM chart_of_account
//             WHERE SUBSTR(account_id, 1, 6) = SUBSTR(:parentAccountId, 1, 6)`,
//           { parentAccountId },
//           { outFormat: oracledb.OUT_FORMAT_OBJECT }
//         );
//         const seq = String(seqResult.rows[0].NUM || 1).padStart(4, "0");
//         acNo = parentAccountId.substring(0, 6) + seq;

//       } else {
//         throw new Error(`Unsupported parent LEBEL: ${parentLebel}`);
//       }

//       const newLebel = parentLebel + 1;

//       // 5. Write account_id, level, parent ref
//       await conn.execute(
//         `UPDATE chart_of_account
//             SET account_id = :acNo,
//                 is_parent  = :parentId,
//                 lebel      = :newLebel,
//                 lastlevel  = :lastLevel
//           WHERE id = :newId`,
//         { acNo, parentId, newLebel, lastLevel: lastLevel || null, newId },
//         { autoCommit: false }
//       );
//     }

//     await conn.commit();
//   });
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // GET ALL — CONNECT BY hierarchy
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Returns the full hierarchy.
//  * IMPORTANT: ID is included so the frontend can use it as the dropdown value
//  * for drop_1 / drop_2 / drop_3 when creating or updating accounts.
//  */
// export async function getAllChartAccounts() {
//   return withConnection(async (conn) => {
//     const result = await conn.execute(
//       `SELECT
//          ID,                                                         -- row PK (needed by frontend)
//          ACCOUNT_ID,
//          LPAD(' ', (LEVEL - 1) * 4) || ACCOUNT_NAME  AS ACCOUNT_NAME,
//          PARENT_ACCOUNT_ID,
//          ENABLED,
//          LASTLEVEL,
//          LEVEL                                         AS LEBEL,
//          SYS_CONNECT_BY_PATH(ACCOUNT_NAME, ' > ')     AS FULL_PATH,
//          CONNECT_BY_ROOT ACCOUNT_NAME                  AS ROOT_ACCOUNT,
//          CONNECT_BY_ISLEAF                             AS IS_LEAF
//        FROM CHART_OF_ACCOUNT
//        START WITH PARENT_ACCOUNT_ID = 0
//        CONNECT BY PRIOR ACCOUNT_ID = PARENT_ACCOUNT_ID
//        ORDER SIBLINGS BY ACCOUNT_ID`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return result.rows;
//   });
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // GET BY ID
// // ─────────────────────────────────────────────────────────────────────────────

// export async function getChartAccountById(id) {
//   return withConnection(async (conn) => {
//     const result = await conn.execute(
//       `SELECT
//          id, account_id, account_name, account_type,
//          parent_account_id, is_parent, lebel, lastlevel,
//          enabled, unit_id, amount, entry_by, entry_date, update_by, update_date
//        FROM chart_of_account
//       WHERE id = :id`,
//       { id: Number(id) },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return result.rows[0] ?? null;
//   });
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // UPDATE
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Partial update — resolves parent from drop_X the same way addChartAccount does,
//  * then updates account fields accordingly.
//  */
// export async function updateChartAccount(id, body) {
//   const { drop_1, drop_2, drop_3, account_name, lastlevel, enabled } = body;
//   const parentRowId = drop_3 || drop_2 || drop_1 || null;

//   await withConnection(async (conn) => {
//     const setClauses = ["update_date = SYSDATE"];
//     const binds      = { id: Number(id) };

//     if (account_name !== undefined) {
//       setClauses.push("account_name = :account_name");
//       binds.account_name = account_name;
//     }
//     if (lastlevel !== undefined) {
//       setClauses.push("lastlevel = :lastlevel");
//       binds.lastlevel = lastlevel;
//     }
//     if (enabled !== undefined) {
//       setClauses.push("enabled = :enabled");
//       binds.enabled = enabled;
//     }

//     // Resolve new parent if a drop_X was supplied
//     if (parentRowId) {
//       const parentResult = await conn.execute(
//         `SELECT id, lebel, account_id FROM chart_of_account WHERE id = :parentRowId`,
//         { parentRowId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );

//       if (!parentResult.rows.length) {
//         throw new Error(`Parent account with id ${parentRowId} not found.`);
//       }

//       const parent          = parentResult.rows[0];
//       const parentAccountId = parent.ACCOUNT_ID;
//       const parentId        = parent.ID;
//       const newLebel        = parent.LEBEL + 1;

//       setClauses.push("parent_account_id = :parentAccountId");
//       setClauses.push("is_parent = :parentId");
//       setClauses.push("lebel = :newLebel");
//       binds.parentAccountId = parentAccountId;
//       binds.parentId        = parentId;
//       binds.newLebel        = newLebel;
//     }

//     if (setClauses.length === 1) {
//       // only update_date — nothing meaningful to update
//       throw new Error("No updatable fields provided.");
//     }

//     const result = await conn.execute(
//       `UPDATE chart_of_account SET ${setClauses.join(", ")} WHERE id = :id`,
//       binds,
//       { autoCommit: true }
//     );

//     if (result.rowsAffected === 0) {
//       throw new Error(`Chart account with id ${id} not found.`);
//     }
//   });
// }

import { withConnection, oracledb } from "../../config/db.js";

/**
 * Inserts a new chart-of-account record, assigns its parent, and
 * auto-generates a hierarchical account_id based on the parent's LEBEL.
 */
export async function addChartAccount(body) {
  const { account_name, drop_1, drop_2, drop_3, lastLevel, enabled, entry_by } = body;

  // Priority: drop_3 > drop_2 > drop_1
  const parentRowId = drop_3 || drop_2 || drop_1 || null;

  await withConnection(async (conn) => {
    // 1. Insert new account
    await conn.execute(
      `INSERT INTO chart_of_account (account_name, enabled, entry_date, entry_by)
       VALUES (:account_name, :enabled, SYSDATE, :entry_by)`,
      { account_name, enabled: enabled ?? 1, entry_by: entry_by ?? null },
      { autoCommit: false }
    );

    // 2. Get ID of inserted row
    const maxIdResult = await conn.execute(
      `SELECT MAX(id) AS new_id FROM chart_of_account`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const newId = maxIdResult.rows[0].NEW_ID;

    // 3. If a parent was supplied, resolve it and generate account_id
    if (parentRowId) {
      const parentResult = await conn.execute(
        `SELECT id, lebel, account_id FROM chart_of_account WHERE id = :parentRowId`,
        { parentRowId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!parentResult.rows.length) {
        throw new Error(`Parent account with id ${parentRowId} not found.`);
      }

      const parent          = parentResult.rows[0];
      const parentAccountId = parent.ACCOUNT_ID;
      const parentLebel     = parent.LEBEL;
      const parentId        = parent.ID;

      // Set PARENT_ACCOUNT_ID
      await conn.execute(
        `UPDATE chart_of_account SET parent_account_id = :parentAccountId WHERE id = :newId`,
        { parentAccountId, newId },
        { autoCommit: false }
      );

      // 4. Generate account_id by level
      let acNo;

      if (parentLebel === 1) {
        const seqResult = await conn.execute(
          `SELECT MAX(TO_NUMBER(SUBSTR(account_id, 2, 2))) + 1 AS num
             FROM chart_of_account
            WHERE SUBSTR(account_id, 1, 1) = SUBSTR(:parentAccountId, 1, 1)`,
          { parentAccountId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const seq = String(seqResult.rows[0].NUM || 1).padStart(2, "0");
        acNo = parentAccountId.substring(0, 1) + seq + "0000000";

      } else if (parentLebel === 2) {
        const seqResult = await conn.execute(
          `SELECT MAX(TO_NUMBER(SUBSTR(account_id, 4, 3))) + 1 AS num
             FROM chart_of_account
            WHERE SUBSTR(account_id, 1, 3) = SUBSTR(:parentAccountId, 1, 3)`,
          { parentAccountId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const seq = String(seqResult.rows[0].NUM || 1).padStart(3, "0");
        acNo = parentAccountId.substring(0, 3) + seq + "0000";

      } else if (parentLebel === 3) {
        const seqResult = await conn.execute(
          `SELECT MAX(TO_NUMBER(SUBSTR(account_id, 7, 4))) + 1 AS num
             FROM chart_of_account
            WHERE SUBSTR(account_id, 1, 6) = SUBSTR(:parentAccountId, 1, 6)`,
          { parentAccountId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const seq = String(seqResult.rows[0].NUM || 1).padStart(4, "0");
        acNo = parentAccountId.substring(0, 6) + seq;

      } else {
        throw new Error(`Unsupported parent LEBEL: ${parentLebel}`);
      }

      const newLebel = parentLebel + 1;

      // 5. Write account_id, level, parent ref
      await conn.execute(
        `UPDATE chart_of_account
            SET account_id = :acNo,
                is_parent  = :parentId,
                lebel      = :newLebel,
                lastlevel  = :lastLevel
          WHERE id = :newId`,
        { acNo, parentId, newLebel, lastLevel: lastLevel || null, newId },
        { autoCommit: false }
      );
    }

    await conn.commit();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL — CONNECT BY hierarchy
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllChartAccounts() {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `SELECT
         ID,
         ACCOUNT_ID,
         LPAD(' ', (LEVEL - 1) * 4) || ACCOUNT_NAME  AS ACCOUNT_NAME,
         PARENT_ACCOUNT_ID,
         ENABLED,
         LASTLEVEL,
         LEVEL                                         AS LEBEL,
         SYS_CONNECT_BY_PATH(ACCOUNT_NAME, ' > ')     AS FULL_PATH,
         CONNECT_BY_ROOT ACCOUNT_NAME                  AS ROOT_ACCOUNT,
         CONNECT_BY_ISLEAF                             AS IS_LEAF
       FROM CHART_OF_ACCOUNT
       START WITH PARENT_ACCOUNT_ID = 0
       CONNECT BY PRIOR ACCOUNT_ID = PARENT_ACCOUNT_ID
       ORDER SIBLINGS BY ACCOUNT_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getChartAccountById(id) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `SELECT
         id, account_id, account_name, account_type,
         parent_account_id, is_parent, lebel, lastlevel,
         enabled, unit_id, amount, entry_by, entry_date, update_by, update_date
       FROM chart_of_account
      WHERE id = :id`,
      { id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows[0] ?? null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateChartAccount(id, body) {
  const { drop_1, drop_2, drop_3, account_name, lastlevel, enabled, update_by } = body;
  const parentRowId = drop_3 || drop_2 || drop_1 || null;

  await withConnection(async (conn) => {
    const setClauses = ["update_date = SYSDATE", "update_by = :update_by"];
    const binds      = { id: Number(id), update_by: update_by ?? null };

    if (account_name !== undefined) {
      setClauses.push("account_name = :account_name");
      binds.account_name = account_name;
    }
    if (lastlevel !== undefined) {
      setClauses.push("lastlevel = :lastlevel");
      binds.lastlevel = lastlevel;
    }
    if (enabled !== undefined) {
      setClauses.push("enabled = :enabled");
      binds.enabled = enabled;
    }

    // Resolve new parent if a drop_X was supplied
    if (parentRowId) {
      const parentResult = await conn.execute(
        `SELECT id, lebel, account_id FROM chart_of_account WHERE id = :parentRowId`,
        { parentRowId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!parentResult.rows.length) {
        throw new Error(`Parent account with id ${parentRowId} not found.`);
      }

      const parent          = parentResult.rows[0];
      const parentAccountId = parent.ACCOUNT_ID;
      const parentId        = parent.ID;
      const newLebel        = parent.LEBEL + 1;

      setClauses.push("parent_account_id = :parentAccountId");
      setClauses.push("is_parent = :parentId");
      setClauses.push("lebel = :newLebel");
      binds.parentAccountId = parentAccountId;
      binds.parentId        = parentId;
      binds.newLebel        = newLebel;
    }

    if (setClauses.length === 2) {
      // only update_date + update_by — nothing meaningful to update
      throw new Error("No updatable fields provided.");
    }

    const result = await conn.execute(
      `UPDATE chart_of_account SET ${setClauses.join(", ")} WHERE id = :id`,
      binds,
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      throw new Error(`Chart account with id ${id} not found.`);
    }
  });
}