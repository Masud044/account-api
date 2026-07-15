import { getConnection, oracledb } from '../../config/db.js';

/* ════════════════════════════════════════════════════════════════════════
   COW_PROJECT
   ════════════════════════════════════════════════════════════════════════ */

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
        creationBy:   data.creationBy ?? null,
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

export const getAllCowProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NUMBER,
         TO_CHAR(PURCHASE_DATE, 'YYYY-MM-DD') AS PURCHASE_DATE,
         TO_CHAR(SELLING_DATE,  'YYYY-MM-DD') AS SELLING_DATE,
         PURCHASE_AMT, SELLING_AMT, WEIGHT, STATUS
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

export const getCowProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NUMBER,
         TO_CHAR(PURCHASE_DATE, 'YYYY-MM-DD') AS PURCHASE_DATE,
         TO_CHAR(SELLING_DATE,  'YYYY-MM-DD') AS SELLING_DATE,
         PURCHASE_AMT, SELLING_AMT, WEIGHT, STATUS
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
             UPDATE_BY     = :updateBy,
             UPDATE_DATE   = SYSDATE
       WHERE ID = :id`,
      {
        cowNumber:    data.cowNumber ?? null,
        purchaseDate: data.purchaseDate ?? null,
        sellingDate:  data.sellingDate ?? null,
        purchaseAmt:  data.purchaseAmt ?? null,
        sellingAmt:   data.sellingAmt ?? null,
        weight:       data.weight ?? null,
        updateBy:     data.updateBy ?? null,
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

/* ════════════════════════════════════════════════════════════════════════
   COW_PROJECT_MEDICIN
   ════════════════════════════════════════════════════════════════════════ */

export const createCowMedicine = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO COW_PROJECT_MEDICIN (
        COW_NO, VACCINE_NAME, VACCINE_DATE, NEXT_VACCINE_DATE, PRICE_WITH_DOCTOR
      ) VALUES (
        :cowNo, :vaccineName,
        TO_DATE(:vaccineDate, 'YYYY-MM-DD'),
        TO_DATE(:nextVaccineDate, 'YYYY-MM-DD'),
        :priceWithDoctor
      ) RETURNING ID INTO :outId`,
      {
        cowNo:           data.cowNo ?? null,
        vaccineName:     data.vaccineName ?? null,
        vaccineDate:     data.vaccineDate ?? null,
        nextVaccineDate: data.nextVaccineDate ?? null,
        priceWithDoctor: data.priceWithDoctor ?? null,
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

export const getAllCowMedicine = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NO, VACCINE_NAME,
         TO_CHAR(VACCINE_DATE, 'YYYY-MM-DD') AS VACCINE_DATE,
         TO_CHAR(NEXT_VACCINE_DATE, 'YYYY-MM-DD') AS NEXT_VACCINE_DATE,
         PRICE_WITH_DOCTOR
       FROM COW_PROJECT_MEDICIN
       ORDER BY ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getCowMedicineByCow = async (cowNo) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NO, VACCINE_NAME,
         TO_CHAR(VACCINE_DATE, 'YYYY-MM-DD') AS VACCINE_DATE,
         TO_CHAR(NEXT_VACCINE_DATE, 'YYYY-MM-DD') AS NEXT_VACCINE_DATE,
         PRICE_WITH_DOCTOR
       FROM COW_PROJECT_MEDICIN
       WHERE COW_NO = :cowNo
       ORDER BY VACCINE_DATE DESC`,
      { cowNo },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getCowMedicineById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NO, VACCINE_NAME,
         TO_CHAR(VACCINE_DATE, 'YYYY-MM-DD') AS VACCINE_DATE,
         TO_CHAR(NEXT_VACCINE_DATE, 'YYYY-MM-DD') AS NEXT_VACCINE_DATE,
         PRICE_WITH_DOCTOR
       FROM COW_PROJECT_MEDICIN
       WHERE ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateCowMedicine = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE COW_PROJECT_MEDICIN
         SET VACCINE_NAME      = :vaccineName,
             VACCINE_DATE      = TO_DATE(:vaccineDate, 'YYYY-MM-DD'),
             NEXT_VACCINE_DATE = TO_DATE(:nextVaccineDate, 'YYYY-MM-DD'),
             PRICE_WITH_DOCTOR = :priceWithDoctor
       WHERE ID = :id`,
      {
        vaccineName:     data.vaccineName ?? null,
        vaccineDate:     data.vaccineDate ?? null,
        nextVaccineDate: data.nextVaccineDate ?? null,
        priceWithDoctor: data.priceWithDoctor ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Vaccine record not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteCowMedicine = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM COW_PROJECT_MEDICIN WHERE ID = :id`,
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

/* ════════════════════════════════════════════════════════════════════════
   COW_PROJECT_WEIGHT
   ════════════════════════════════════════════════════════════════════════ */

// Helper: previous weight entry date for a cow, before a given date (excluding a given id on update)
const getPreviousWeightDate = async (conn, cowNo, weightDate, excludeId = null) => {
  const result = await conn.execute(
    `SELECT MAX(WEIGT_DATE) AS LAST_DATE
       FROM COW_PROJECT_WEIGHT
      WHERE COW_NO = :cowNo
        AND WEIGT_DATE < TO_DATE(:weightDate, 'YYYY-MM-DD')
        ${excludeId ? 'AND ID != :excludeId' : ''}`,
    excludeId
      ? { cowNo, weightDate, excludeId }
      : { cowNo, weightDate },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows[0]?.LAST_DATE ?? null;
};

export const createCowWeight = async (data) => {
  const conn = await getConnection();
  try {
    const lastDate = await getPreviousWeightDate(conn, data.cowNo, data.weightDate);
    const intervalDays = lastDate
      ? Math.round((new Date(data.weightDate) - new Date(lastDate)) / (1000 * 60 * 60 * 24))
      : null;

    const result = await conn.execute(
      `INSERT INTO COW_PROJECT_WEIGHT (
        COW_NO, WEIGT_DATE, WEIGHT, INTERVAL_DAYS
      ) VALUES (
        :cowNo, TO_DATE(:weightDate, 'YYYY-MM-DD'), :weight, :intervalDays
      ) RETURNING ID INTO :outId`,
      {
        cowNo:        data.cowNo ?? null,
        weightDate:   data.weightDate ?? null,
        weight:       data.weight ?? null,
        intervalDays,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    await conn.commit();
    return { id: result.outBinds.outId[0], intervalDays };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const getAllCowWeights = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NO,
         TO_CHAR(WEIGT_DATE, 'YYYY-MM-DD') AS WEIGT_DATE,
         WEIGHT, INTERVAL_DAYS
       FROM COW_PROJECT_WEIGHT
       ORDER BY ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getCowWeightsByCow = async (cowNo) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NO,
         TO_CHAR(WEIGT_DATE, 'YYYY-MM-DD') AS WEIGT_DATE,
         WEIGHT, INTERVAL_DAYS
       FROM COW_PROJECT_WEIGHT
       WHERE COW_NO = :cowNo
       ORDER BY WEIGT_DATE DESC`,
      { cowNo },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getCowWeightById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID, COW_NO,
         TO_CHAR(WEIGT_DATE, 'YYYY-MM-DD') AS WEIGT_DATE,
         WEIGHT, INTERVAL_DAYS
       FROM COW_PROJECT_WEIGHT
       WHERE ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateCowWeight = async (id, data) => {
  const conn = await getConnection();
  try {
    const lastDate = await getPreviousWeightDate(conn, data.cowNo, data.weightDate, id);
    const intervalDays = lastDate
      ? Math.round((new Date(data.weightDate) - new Date(lastDate)) / (1000 * 60 * 60 * 24))
      : null;

    const result = await conn.execute(
      `UPDATE COW_PROJECT_WEIGHT
         SET COW_NO        = :cowNo,
             WEIGT_DATE    = TO_DATE(:weightDate, 'YYYY-MM-DD'),
             WEIGHT        = :weight,
             INTERVAL_DAYS = :intervalDays
       WHERE ID = :id`,
      {
        cowNo:      data.cowNo ?? null,
        weightDate: data.weightDate ?? null,
        weight:     data.weight ?? null,
        intervalDays,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Weight record not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected, intervalDays };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteCowWeight = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM COW_PROJECT_WEIGHT WHERE ID = :id`,
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