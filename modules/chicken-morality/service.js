import { getConnection, oracledb } from '../../config/db.js';

const fail = (message, status) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

const assertMortality = (data, { isCreate }) => {
  if (isCreate && !data.detailId) throw fail('Detail is required.', 400);
  if (!data.mortalityDate) throw fail('Mortality date is required.', 400);
  if (!data.reasonId) throw fail('Mortality reason is required.', 400);
  const qty = Number(data.qty);
  if (!Number.isFinite(qty) || qty <= 0) throw fail('Quantity must be greater than 0.', 400);
};

const SELECT_BASE = `
  SELECT m.ID, m.DETAIL_ID, d.H_ID,
         TO_CHAR(m.MORTALITY_DATE, 'YYYY-MM-DD') AS MORTALITY_DATE,
         m.QTY, m.REASON_ID, r.REASON_NAME, m.REMARKS
  FROM CHICKEN_PROJECT_MORTALITY m
  JOIN CHICKEN_PROJECT_DETAILS d ON d.ID = m.DETAIL_ID
  JOIN CHICKEN_MORTALITY_REASON r ON r.ID = m.REASON_ID`;

// ═══════════════════ CHICKEN PROJECT MORTALITY ═══════════════════
export const createMortality = async (data) => {
  assertMortality(data, { isCreate: true });
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO CHICKEN_PROJECT_MORTALITY (
        DETAIL_ID, MORTALITY_DATE, QTY, REASON_ID, REMARKS
      ) VALUES (
        :detailId,
        TO_DATE(:mortalityDate, 'YYYY-MM-DD'),
        :qty, :reasonId, :remarks
      ) RETURNING ID INTO :outId`,
      {
        detailId: data.detailId,
        mortalityDate: data.mortalityDate,
        qty: Number(data.qty),
        reasonId: data.reasonId,
        remarks: data.remarks ?? null,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    await conn.commit();
    return { id: result.outBinds.outId[0] };
  } catch (err) {
    await conn.rollback();
    if (err.errorNum === 2291) throw fail('Invalid detail or mortality reason.', 400);
    throw err;
  } finally {
    await conn.close();
  }
};

export const getMortalitiesByDetailId = async (detailId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `${SELECT_BASE}
       WHERE m.DETAIL_ID = :detailId
       ORDER BY m.MORTALITY_DATE DESC, m.ID DESC`,
      { detailId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// Header (project) level: sob details er mortality ek sathe
export const getMortalitiesByHeaderId = async (hId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `${SELECT_BASE}
       WHERE d.H_ID = :hId
       ORDER BY m.MORTALITY_DATE DESC, m.ID DESC`,
      { hId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getMortalityById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `${SELECT_BASE}
       WHERE m.ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateMortality = async (id, data) => {
  assertMortality(data, { isCreate: false });
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE CHICKEN_PROJECT_MORTALITY
         SET MORTALITY_DATE = TO_DATE(:mortalityDate, 'YYYY-MM-DD'),
             QTY            = :qty,
             REASON_ID      = :reasonId,
             REMARKS        = :remarks
       WHERE ID = :id`,
      {
        mortalityDate: data.mortalityDate,
        qty: Number(data.qty),
        reasonId: data.reasonId,
        remarks: data.remarks ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw fail('Mortality record not found.', 404);
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    if (err.errorNum === 2291) throw fail('Invalid mortality reason.', 400);
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteMortality = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM CHICKEN_PROJECT_MORTALITY WHERE ID = :id`,
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