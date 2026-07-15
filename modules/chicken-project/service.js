import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ CHICKEN PROJECT (Header) ═══════════════════
export const createChickenProject = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO CHICKEN_PROJECT (
        CHICKEN_NUMBER, FROM_DATE, TODATE, LOT, DESCRIPTION, CREATION_BY
      ) VALUES (
        :chickenNumber,
        TO_DATE(:fromDate, 'YYYY-MM-DD'),
        TO_DATE(:toDate, 'YYYY-MM-DD'),
        :lot, :description, :creationBy
      ) RETURNING ID INTO :outId`,
      {
        chickenNumber: data.chickenNumber ?? null,
        fromDate: data.fromDate ?? null,
        toDate: data.toDate ?? null,
        lot: data.lot ?? null,
        description: data.description ?? null,
        creationBy: data.creationBy ?? null,
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

export const getAllChickenProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, CHICKEN_NUMBER,
         TO_CHAR(FROM_DATE, 'YYYY-MM-DD') AS FROM_DATE,
         TO_CHAR(TODATE,    'YYYY-MM-DD') AS TODATE,
         LOT, DESCRIPTION
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

export const getChickenProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, CHICKEN_NUMBER,
         TO_CHAR(FROM_DATE, 'YYYY-MM-DD') AS FROM_DATE,
         TO_CHAR(TODATE,    'YYYY-MM-DD') AS TODATE,
         LOT, DESCRIPTION
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

export const updateChickenProject = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE CHICKEN_PROJECT
         SET CHICKEN_NUMBER = :chickenNumber,
             FROM_DATE       = TO_DATE(:fromDate, 'YYYY-MM-DD'),
             TODATE          = TO_DATE(:toDate, 'YYYY-MM-DD'),
             LOT             = :lot,
             DESCRIPTION     = :description,
             UPDATE_BY       = :updateBy,
             UPDATE_DATE     = SYSDATE
       WHERE ID = :id`,
      {
        chickenNumber: data.chickenNumber ?? null,
        fromDate: data.fromDate ?? null,
        toDate: data.toDate ?? null,
        lot: data.lot ?? null,
        description: data.description ?? null,
        updateBy: data.updateBy ?? null,
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

// ═══════════════════ COUNTS (for tab badges) ═══════════════════
export const getChickenProjectCounts = async (hId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         (SELECT COUNT(*) FROM CHICKEN_PROJECT_DETAILS WHERE H_ID = :hId) AS DETAILS_COUNT,
         (SELECT COUNT(*) FROM CHICKEN_PROJECT_VACCINATION WHERE HID = :hId) AS VACCINATION_COUNT
       FROM DUAL`,
      { hId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

// ═══════════════════ CHICKEN PROJECT DETAILS ═══════════════════
export const createChickenProjectDetail = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO CHICKEN_PROJECT_DETAILS (
        H_ID, QTY, FROM_DATE, TO_DATE, DESCRIPTION
      ) VALUES (
        :hId, :qty,
        TO_DATE(:fromDate, 'YYYY-MM-DD'),
        TO_DATE(:toDate, 'YYYY-MM-DD'),
        :description
      ) RETURNING ID INTO :outId`,
      {
        hId: data.hId ?? null,
        qty: data.qty ?? null,
        fromDate: data.fromDate ?? null,
        toDate: data.toDate ?? null,
        description: data.description ?? null,
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

export const getDetailsByHeaderId = async (hId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, H_ID, QTY,
         TO_CHAR(FROM_DATE, 'YYYY-MM-DD') AS FROM_DATE,
         TO_CHAR(TO_DATE,   'YYYY-MM-DD') AS TO_DATE,
         DESCRIPTION
       FROM CHICKEN_PROJECT_DETAILS
       WHERE H_ID = :hId
       ORDER BY ID DESC`,
      { hId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateChickenProjectDetail = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE CHICKEN_PROJECT_DETAILS
         SET QTY         = :qty,
             FROM_DATE   = TO_DATE(:fromDate, 'YYYY-MM-DD'),
             TO_DATE     = TO_DATE(:toDate, 'YYYY-MM-DD'),
             DESCRIPTION = :description
       WHERE ID = :id`,
      {
        qty: data.qty ?? null,
        fromDate: data.fromDate ?? null,
        toDate: data.toDate ?? null,
        description: data.description ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Detail not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteChickenProjectDetail = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM CHICKEN_PROJECT_DETAILS WHERE ID = :id`,
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

// ═══════════════════ CHICKEN PROJECT VACCINATION ═══════════════════
export const createVaccination = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO CHICKEN_PROJECT_VACCINATION (
        HID, VACCIN_NAME, DOSES, VACCIN_DATE, NEXT_VACCIN_DATE
      ) VALUES (
        :hid, :vaccinName, :doses,
        TO_DATE(:vaccinDate, 'YYYY-MM-DD'),
        TO_DATE(:nextVaccinDate, 'YYYY-MM-DD')
      ) RETURNING ID INTO :outId`,
      {
        hid: data.hid ?? null,
        vaccinName: data.vaccinName ?? null,
        doses: data.doses ?? null,
        vaccinDate: data.vaccinDate ?? null,
        nextVaccinDate: data.nextVaccinDate ?? null,
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

export const getVaccinationByHeaderId = async (hid) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, HID, VACCIN_NAME, DOSES,
         TO_CHAR(VACCIN_DATE,      'YYYY-MM-DD') AS VACCIN_DATE,
         TO_CHAR(NEXT_VACCIN_DATE, 'YYYY-MM-DD') AS NEXT_VACCIN_DATE
       FROM CHICKEN_PROJECT_VACCINATION
       WHERE HID = :hid
       ORDER BY ID DESC`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateVaccination = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE CHICKEN_PROJECT_VACCINATION
         SET VACCIN_NAME      = :vaccinName,
             DOSES             = :doses,
             VACCIN_DATE       = TO_DATE(:vaccinDate, 'YYYY-MM-DD'),
             NEXT_VACCIN_DATE  = TO_DATE(:nextVaccinDate, 'YYYY-MM-DD')
       WHERE ID = :id`,
      {
        vaccinName: data.vaccinName ?? null,
        doses: data.doses ?? null,
        vaccinDate: data.vaccinDate ?? null,
        nextVaccinDate: data.nextVaccinDate ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Vaccination record not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteVaccination = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM CHICKEN_PROJECT_VACCINATION WHERE ID = :id`,
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