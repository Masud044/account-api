import { getConnection, oracledb } from '../../config/db.js';

const fail = (message, status) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

const assertName = (name) => {
  if (!name || !String(name).trim()) throw fail('Reason name is required.', 400);
};

// ═══════════════════ CHICKEN MORTALITY REASON (LOV) ═══════════════════
export const createMortalityReason = async (data) => {
  assertName(data.reasonName);
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO CHICKEN_MORTALITY_REASON (REASON_NAME)
       VALUES (:reasonName)
       RETURNING ID INTO :outId`,
      {
        reasonName: String(data.reasonName).trim(),
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    await conn.commit();
    return { id: result.outBinds.outId[0] };
  } catch (err) {
    await conn.rollback();
    if (err.errorNum === 1) throw fail('Reason name already exists.', 409);
    throw err;
  } finally {
    await conn.close();
  }
};

export const getAllMortalityReasons = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, REASON_NAME,
         TO_CHAR(CREATION_DATE, 'YYYY-MM-DD') AS CREATION_DATE
       FROM CHICKEN_MORTALITY_REASON
       ORDER BY REASON_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getMortalityReasonById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, REASON_NAME,
         TO_CHAR(CREATION_DATE, 'YYYY-MM-DD') AS CREATION_DATE
       FROM CHICKEN_MORTALITY_REASON
       WHERE ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateMortalityReason = async (id, data) => {
  assertName(data.reasonName);
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE CHICKEN_MORTALITY_REASON
         SET REASON_NAME = :reasonName
       WHERE ID = :id`,
      { reasonName: String(data.reasonName).trim(), id },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw fail('Mortality reason not found.', 404);
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    if (err.errorNum === 1) throw fail('Reason name already exists.', 409);
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteMortalityReason = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM CHICKEN_MORTALITY_REASON WHERE ID = :id`,
      { id },
      { autoCommit: false }
    );
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    if (err.errorNum === 2292) {
      throw fail('This reason is used in mortality records and cannot be deleted.', 409);
    }
    throw err;
  } finally {
    await conn.close();
  }
};