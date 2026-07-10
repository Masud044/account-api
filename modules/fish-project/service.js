import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE ────────────────────────────────────────────────────────────────
// data: { lot, fishNumber, fishType }
export const createFishProject = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FISH_PROJECT (
        LOT, FISH_NUMBER, FISH_TYPE
      ) VALUES (
        :lot, :fishNumber, :fishType
      ) RETURNING ID INTO :outId`,
      {
        lot:        data.lot ?? null,
        fishNumber: data.fishNumber ?? null,
        fishType:   data.fishType ?? null,
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
export const getAllFishProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID,
         LOT,
         FISH_NUMBER,
         FISH_TYPE
       FROM FISH_PROJECT
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
export const getFishProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID,
         LOT,
         FISH_NUMBER,
         FISH_TYPE
       FROM FISH_PROJECT
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
export const updateFishProject = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FISH_PROJECT
         SET LOT         = :lot,
             FISH_NUMBER = :fishNumber,
             FISH_TYPE   = :fishType
       WHERE ID = :id`,
      {
        lot:        data.lot ?? null,
        fishNumber: data.fishNumber ?? null,
        fishType:   data.fishType ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Fish project not found.');
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
export const deleteFishProject = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM FISH_PROJECT WHERE ID = :id`,
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