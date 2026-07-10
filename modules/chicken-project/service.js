import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE ────────────────────────────────────────────────────────────────
// data: { chickenNumber, fromDate, toDate, lot, description }
export const createChickenProject = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO CHICKEN_PROJECT (
        CHICKEN_NUMBER, FROM_DATE, TODATE, LOT, DESCRIPTION
      ) VALUES (
        :chickenNumber,
        TO_DATE(:fromDate, 'YYYY-MM-DD'),
        TO_DATE(:toDate, 'YYYY-MM-DD'),
        :lot, :description
      ) RETURNING ID INTO :outId`,
      {
        chickenNumber: data.chickenNumber ?? null,
        fromDate:      data.fromDate ?? null,
        toDate:        data.toDate ?? null,
        lot:            data.lot ?? null,
        description:    data.description ?? null,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    await conn.commit();
    return { id: result.outBinds.outId[0] };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── GET ALL ───────────────────────────────────────────────────────────────
export const getAllChickenProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID,
         CHICKEN_NUMBER,
         TO_CHAR(FROM_DATE, 'YYYY-MM-DD') AS FROM_DATE,
         TO_CHAR(TODATE,    'YYYY-MM-DD') AS TODATE,
         LOT,
         DESCRIPTION
       FROM CHICKEN_PROJECT
       ORDER BY ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE ────────────────────────────────────────────────────────────
export const getChickenProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID,
         CHICKEN_NUMBER,
         TO_CHAR(FROM_DATE, 'YYYY-MM-DD') AS FROM_DATE,
         TO_CHAR(TODATE,    'YYYY-MM-DD') AS TODATE,
         LOT,
         DESCRIPTION
       FROM CHICKEN_PROJECT
       WHERE ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ─── UPDATE ────────────────────────────────────────────────────────────────
export const updateChickenProject = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE CHICKEN_PROJECT
         SET CHICKEN_NUMBER = :chickenNumber,
             FROM_DATE       = TO_DATE(:fromDate, 'YYYY-MM-DD'),
             TODATE          = TO_DATE(:toDate, 'YYYY-MM-DD'),
             LOT             = :lot,
             DESCRIPTION     = :description
       WHERE ID = :id`,
      {
        chickenNumber: data.chickenNumber ?? null,
        fromDate:      data.fromDate ?? null,
        toDate:        data.toDate ?? null,
        lot:            data.lot ?? null,
        description:    data.description ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Chicken project not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── DELETE ────────────────────────────────────────────────────────────────
export const deleteChickenProject = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM CHICKEN_PROJECT WHERE ID = :id`,
      { id },
      { autoCommit: false }
    );
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};