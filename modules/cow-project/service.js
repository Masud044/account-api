import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE ────────────────────────────────────────────────────────────────
// data: { cowNumber, purchaseDate, sellingDate, purchaseAmt, sellingAmt, weight, status }
export const createCowProject = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO COW_PROJECT (
        COW_NUMBER, PURCHASE_DATE, SELLING_DATE, PURCHASE_AMT, SELLING_AMT, WEIGHT, STATUS, CREATION_BY
      ) VALUES (
        :cowNumber,
        TO_DATE(:purchaseDate, 'YYYY-MM-DD'),
        TO_DATE(:sellingDate, 'YYYY-MM-DD'),
        :purchaseAmt, :sellingAmt, :weight,
        1, :creationBy
      ) RETURNING ID INTO :outId`,
      {
        cowNumber:    data.cowNumber ?? null,
        purchaseDate: data.purchaseDate ?? null,
        sellingDate:  data.sellingDate ?? null,
        purchaseAmt:  data.purchaseAmt ?? null,
        sellingAmt:   data.sellingAmt ?? null,
        weight:       data.weight ?? null,
        creationBy:    data.creationBy ?? null,
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
export const getAllCowProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID,
         COW_NUMBER,
         TO_CHAR(PURCHASE_DATE, 'YYYY-MM-DD') AS PURCHASE_DATE,
         TO_CHAR(SELLING_DATE,  'YYYY-MM-DD') AS SELLING_DATE,
         PURCHASE_AMT,
         SELLING_AMT,
         WEIGHT,
         STATUS
       FROM COW_PROJECT
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
export const getCowProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID,
         COW_NUMBER,
         TO_CHAR(PURCHASE_DATE, 'YYYY-MM-DD') AS PURCHASE_DATE,
         TO_CHAR(SELLING_DATE,  'YYYY-MM-DD') AS SELLING_DATE,
         PURCHASE_AMT,
         SELLING_AMT,
         WEIGHT,
         STATUS
       FROM COW_PROJECT
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
export const updateCowProject = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE COW_PROJECT
         SET COW_NUMBER    = :cowNumber,
             PURCHASE_DATE = TO_DATE(:purchaseDate, 'YYYY-MM-DD'),
             SELLING_DATE  = TO_DATE(:sellingDate, 'YYYY-MM-DD'),
             PURCHASE_AMT  = :purchaseAmt,
             SELLING_AMT   = :sellingAmt,
             WEIGHT        = :weight,
             STATUS        = 1,
             UPDATE_BY   = :updateBy,
             UPDATE_DATE  = SYSDATE
       WHERE ID = :id`,
      {
        cowNumber:    data.cowNumber ?? null,
        purchaseDate: data.purchaseDate ?? null,
        sellingDate:  data.sellingDate ?? null,
        purchaseAmt:  data.purchaseAmt ?? null,
        sellingAmt:   data.sellingAmt ?? null,
        weight:       data.weight ?? null,
        updateBy:      data.updateBy?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Cow project not found.');
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
export const deleteCowProject = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM COW_PROJECT WHERE ID = :id`,
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