import { withConnection , oracledb} from "../../config/db.js";

/**
 * Inserts a new chart-of-account record, assigns its parent, and
 * auto-generates a hierarchical account_id based on the parent's LEBEL.
 *
 * @param {object} body  - Parsed request body
 * @param {string} body.account_name
 * @param {string} [body.drop_1]    - ID of a level-1 parent account
 * @param {string} [body.drop_2]    - ID of a level-2 parent account
 * @param {string} [body.drop_3]    - ID of a level-3 parent account
 * @param {string} [body.lastLevel] - UI flag passed through to the record
 */
export async function addChartAccount(body) {
  const { account_name, drop_1, drop_2, drop_3, lastLevel } = body;

  // Determine which dropdown was supplied (priority: drop_3 > drop_2 > drop_1)
  const parentRowId = drop_3 || drop_2 || drop_1 || null;

  await withConnection(async (conn) => {
    // ── 1. Insert the new account (name only, rest filled in below) ──────────
    await conn.execute(
      `INSERT INTO chart_of_account (account_name, entry_date) VALUES (:account_name, SYSDATE)`,
      { account_name },
      { autoCommit: false }
    );

    // ── 2. Get the ID of the row we just inserted ────────────────────────────
    const maxIdResult = await conn.execute(
      `SELECT MAX(id) AS new_id FROM chart_of_account`,
      {},
     { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const newId = maxIdResult.rows[0].NEW_ID;

    // ── 3. If a parent was selected, look it up and set PARENT_ACCOUNT_ID ────
    if (parentRowId) {
      const parentResult = await conn.execute(
        `SELECT id, lebel, account_id, parent_account_id
           FROM chart_of_account
          WHERE id = :parentRowId`,
        { parentRowId },
       { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!parentResult.rows.length) {
        throw new Error(`Parent account with id ${parentRowId} not found.`);
      }

      const parent = parentResult.rows[0];
      const parentAccountId = parent.ACCOUNT_ID;
      const parentLebel     = parent.LEBEL;
      const parentId        = parent.ID;         // PK of the parent row

      // Update PARENT_ACCOUNT_ID on the new record
      await conn.execute(
        `UPDATE chart_of_account
            SET parent_account_id = :parentAccountId
          WHERE id = :newId`,
        { parentAccountId, newId },
        { autoCommit: false }
      );

      // ── 4. Generate account_id based on parent's LEBEL ───────────────────
      let acNo;

      if (parentLebel === 1) {
        // Level-1 parent → new child is level 2
        // account_id = first 1 char + next 2-digit sequence + '0000000'
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
        // Level-2 parent → new child is level 3
        // account_id = first 3 chars + next 3-digit sequence + '0000'
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
        // Level-3 parent → new child is level 4
        // account_id = first 6 chars + next 4-digit sequence
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

      // ── 5. Update the new record with computed values ─────────────────────
      await conn.execute(
        `UPDATE chart_of_account
            SET account_id        = :acNo,
                is_parent         = :parentId,
                lebel             = :newLebel,
                lastlevel         = :lastLevel
          WHERE id = :newId`,
        { acNo, parentId, newLebel, lastLevel: lastLevel || null, newId },
        { autoCommit: false }
      );
    }

    await conn.commit();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all chart-of-account rows ordered by account_id.
 * Optionally filter by ?enabled=1 or ?lebel=2 via query params.
 * //  ORDER BY account_id ASC NULLS LAST`,
 *
 * @param {object} filters
 * @param {string|number} [filters.enabled]  - 1 = active only
 * @param {string|number} [filters.lebel]    - filter by hierarchy level
 */
export async function getAllChartAccounts(filters = {}) {
  return withConnection(async (conn) => {
    const conditions = [];
    const binds = {};

    if (filters.enabled !== undefined) {
      conditions.push("enabled = :enabled");
      binds.enabled = Number(filters.enabled);
    }
    if (filters.lebel !== undefined) {
      conditions.push("lebel = :lebel");
      binds.lebel = Number(filters.lebel);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await conn.execute(
      `SELECT
         id,
         account_id,
         account_name,
         account_type,
         parent_account_id,
         is_parent,
         lebel,
         lastlevel,
         enabled,
         unit_id,
         amount,
         entry_by,
         entry_date,
         update_by,
         update_date
       FROM chart_of_account
       ${where}
      
      ORDER BY COALESCE(update_date, entry_date) DESC NULLS LAST`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single chart-of-account row by its primary key (ID).
 *
 * @param {number|string} id
 * @returns {object|null}
 */
export async function getChartAccountById(id) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `SELECT
         id,
         account_id,
         account_name,
         account_type,
         parent_account_id,
         is_parent,
         lebel,
         lastlevel,
         enabled,
         unit_id,
         amount,
         entry_by,
         entry_date,
         update_by,
         update_date
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

/**
 * Updates allowed fields on a chart-of-account record.
 * Only the fields present in `body` are updated (partial update).
 *
 * Updatable fields:
 *   account_name, account_type, parent_account_id, is_parent,
 *   lebel, lastlevel, enabled, unit_id, amount, update_by
 *
 * @param {number|string} id   - Primary key of the record to update
 * @param {object}        body - Fields to update
 */
export async function updateChartAccount(id, body) {
  const ALLOWED = [
    "account_name",
    "account_type",
    "parent_account_id",
    "is_parent",
    "lebel",
    "lastlevel",
    "enabled",
    "unit_id",
    "amount",
    "update_by",
  ];

  const setClauses = [];
  const binds = {};

  for (const field of ALLOWED) {
    if (body[field] !== undefined) {
      setClauses.push(`${field} = :${field}`);
      binds[field] = body[field];
    }
  }

  if (!setClauses.length) {
    throw new Error("No updatable fields provided.");
  }

  // Always stamp update_date
  setClauses.push("update_date = SYSDATE");
  binds.id = Number(id);

  await withConnection(async (conn) => {
    const result = await conn.execute(
      `UPDATE chart_of_account
          SET ${setClauses.join(", ")}
        WHERE id = :id`,
      binds,
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      throw new Error(`Chart account with id ${id} not found.`);
    }
  });
}