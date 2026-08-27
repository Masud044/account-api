import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ FISCAL YEAR ═══════════════════
export const createFiscalYear = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FISCAL_YEAR (
        YEAR_CODE, START_DATE, END_DATE, STATUS
      ) VALUES (
        :yearCode, TO_DATE(:startDate,'YYYY-MM-DD'), TO_DATE(:endDate,'YYYY-MM-DD'), :status
      ) RETURNING FISCAL_YEAR_ID INTO :outId`,
      {
        yearCode:  data.yearCode ?? null,
        startDate: data.startDate ?? null,
        endDate:   data.endDate ?? null,
        status:    data.status ?? 'OPEN',
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

export const getAllFiscalYears = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         FISCAL_YEAR_ID,
         YEAR_CODE,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
         STATUS,
         TO_CHAR(CREATED_AT, 'YYYY-MM-DD') AS CREATED_AT
       FROM FISCAL_YEAR
       ORDER BY START_DATE DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getFiscalYearById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         FISCAL_YEAR_ID,
         YEAR_CODE,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
         STATUS
       FROM FISCAL_YEAR
       WHERE FISCAL_YEAR_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateFiscalYearStatus = async (id, status) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FISCAL_YEAR
         SET STATUS = :status
       WHERE FISCAL_YEAR_ID = :id`,
      { status, id },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Fiscal year not found.');
    await conn.commit();
    return { id, status, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PERIOD TYPE (reference / lookup) ═══════════════════
export const getAllPeriodTypes = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT PERIOD_TYPE_ID, TYPE_CODE, TYPE_NAME, PERIODS_PER_YEAR, DESCRIPTION
       FROM PERIOD_TYPE
       ORDER BY PERIOD_TYPE_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ LEDGER MODULE (reference / lookup) ═══════════════════
export const getAllModules = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT MODULE_ID, MODULE_CODE, MODULE_NAME
       FROM LEDGER_MODULE
       ORDER BY MODULE_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ LEDGER PERIOD ═══════════════════
export const createLedgerPeriod = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO LEDGER_PERIOD (
        FISCAL_YEAR_ID, PERIOD_TYPE_ID, PERIOD_NO, PERIOD_NAME, START_DATE, END_DATE
      ) VALUES (
        :fiscalYearId, :periodTypeId, :periodNo, :periodName,
        TO_DATE(:startDate,'YYYY-MM-DD'), TO_DATE(:endDate,'YYYY-MM-DD')
      ) RETURNING PERIOD_ID INTO :outId`,
      {
        fiscalYearId: data.fiscalYearId ?? null,
        periodTypeId: data.periodTypeId ?? null,
        periodNo:     data.periodNo ?? null,
        periodName:   data.periodName ?? null,
        startDate:    data.startDate ?? null,
        endDate:      data.endDate ?? null,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    // TRG_LP_AFTER_INSERT fires here and seeds PERIOD_MODULE_STATUS for every LEDGER_MODULE row
    await conn.commit();
    return { id: result.outBinds.outId[0] };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const getLedgerPeriodsByFiscalYear = async (fiscalYearId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         PERIOD_ID,
         FISCAL_YEAR_ID,
         PERIOD_TYPE_ID,
         PERIOD_NO,
         PERIOD_NAME,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE
       FROM LEDGER_PERIOD
       WHERE FISCAL_YEAR_ID = :fiscalYearId
       ORDER BY PERIOD_NO`,
      { fiscalYearId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// Calendar view: periods + per-module OPEN/CLOSED breakdown + derived overall
// status — shaped to match the mockup's periodCard()/overallStatus() directly.
export const getCalendarByFiscalYear = async (fiscalYearId) => {
  const conn = await getConnection();
  try {
    const periodsResult = await conn.execute(
      `SELECT
         PERIOD_ID,
         PERIOD_TYPE_ID,
         PERIOD_NO,
         PERIOD_NAME,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE
       FROM LEDGER_PERIOD
       WHERE FISCAL_YEAR_ID = :fiscalYearId
       ORDER BY PERIOD_NO`,
      { fiscalYearId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const statusResult = await conn.execute(
      `SELECT PMS.PERIOD_ID, M.MODULE_CODE, PMS.STATUS
       FROM PERIOD_MODULE_STATUS PMS
       JOIN LEDGER_MODULE M  ON M.MODULE_ID = PMS.MODULE_ID
       JOIN LEDGER_PERIOD LP ON LP.PERIOD_ID = PMS.PERIOD_ID
       WHERE LP.FISCAL_YEAR_ID = :fiscalYearId`,
      { fiscalYearId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const statusByPeriod = {};
    statusResult.rows.forEach((row) => {
      if (!statusByPeriod[row.PERIOD_ID]) statusByPeriod[row.PERIOD_ID] = {};
      statusByPeriod[row.PERIOD_ID][row.MODULE_CODE] = row.STATUS.toLowerCase();
    });

    return periodsResult.rows.map((p) => {
      const modules = statusByPeriod[p.PERIOD_ID] ?? {};
      const values = Object.values(modules);
      let overallStatus = 'mixed';
      if (values.length > 0 && values.every((v) => v === 'open')) overallStatus = 'open';
      else if (values.length > 0 && values.every((v) => v === 'closed')) overallStatus = 'closed';

      return {
        periodId: p.PERIOD_ID,
        periodTypeId: p.PERIOD_TYPE_ID,
        no: p.PERIOD_NO,
        name: p.PERIOD_NAME,
        start: p.START_DATE,
        end: p.END_DATE,
        adjustment: p.PERIOD_NO === 13,
        modules,
        overallStatus,
      };
    });
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PERIOD MODULE STATUS ═══════════════════
export const togglePeriodModuleStatus = async (periodId, moduleId, status, changedBy) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE PERIOD_MODULE_STATUS
         SET STATUS = :status,
             CHANGED_BY = :changedBy,
             CHANGED_AT = SYSTIMESTAMP
       WHERE PERIOD_ID = :periodId
         AND MODULE_ID = :moduleId`,
      { status, changedBy: changedBy ?? null, periodId, moduleId },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Period/module status row not found.');
    await conn.commit();
    return { periodId, moduleId, status, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const getPeriodStatusSummary = async (periodId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT LP.PERIOD_ID, LP.PERIOD_NAME,
              CASE
                WHEN COUNT(*) = SUM(CASE WHEN PMS.STATUS = 'OPEN'   THEN 1 ELSE 0 END) THEN 'Fully Open'
                WHEN COUNT(*) = SUM(CASE WHEN PMS.STATUS = 'CLOSED' THEN 1 ELSE 0 END) THEN 'Fully Closed'
                ELSE 'Partially Closed'
              END AS OVERALL_STATUS
       FROM LEDGER_PERIOD LP
       JOIN PERIOD_MODULE_STATUS PMS ON PMS.PERIOD_ID = LP.PERIOD_ID
       WHERE LP.PERIOD_ID = :periodId
       GROUP BY LP.PERIOD_ID, LP.PERIOD_NAME`,
      { periodId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};


// ═══════════════════ LEDGER PERIOD (update) ═══════════════════
export const updateLedgerPeriod = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE LEDGER_PERIOD
         SET PERIOD_TYPE_ID = :periodTypeId,
             PERIOD_NO      = :periodNo,
             PERIOD_NAME    = :periodName,
             START_DATE     = TO_DATE(:startDate,'YYYY-MM-DD'),
             END_DATE       = TO_DATE(:endDate,'YYYY-MM-DD')
       WHERE PERIOD_ID = :id`,
      {
        periodTypeId: data.periodTypeId ?? null,
        periodNo:     data.periodNo ?? null,
        periodName:   data.periodName ?? null,
        startDate:    data.startDate ?? null,
        endDate:      data.endDate ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Ledger period not found.');
    await conn.commit();
    return { id, ...data, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PERIOD TYPE (create / update) ═══════════════════
export const createPeriodType = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO PERIOD_TYPE (
        TYPE_CODE, TYPE_NAME, PERIODS_PER_YEAR, DESCRIPTION
      ) VALUES (
        :typeCode, :typeName, :periodsPerYear, :description
      ) RETURNING PERIOD_TYPE_ID INTO :outId`,
      {
        typeCode:       data.typeCode ?? null,
        typeName:       data.typeName ?? null,
        periodsPerYear: data.periodsPerYear ?? null,
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

export const updatePeriodType = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE PERIOD_TYPE
         SET TYPE_CODE       = :typeCode,
             TYPE_NAME       = :typeName,
             PERIODS_PER_YEAR = :periodsPerYear,
             DESCRIPTION     = :description
       WHERE PERIOD_TYPE_ID = :id`,
      {
        typeCode:       data.typeCode ?? null,
        typeName:       data.typeName ?? null,
        periodsPerYear: data.periodsPerYear ?? null,
        description:    data.description ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Period type not found.');
    await conn.commit();
    return { id, ...data, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PERIOD STATUS CHECK (for posting control) ═══════════════════
// export const getPeriodStatusForDate = async (moduleCode, date) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT LP.PERIOD_ID, LP.PERIOD_NAME, PMS.STATUS
//        FROM LEDGER_PERIOD LP
//        JOIN PERIOD_MODULE_STATUS PMS ON PMS.PERIOD_ID = LP.PERIOD_ID
//        JOIN LEDGER_MODULE LM        ON LM.MODULE_ID = PMS.MODULE_ID
//        WHERE LM.MODULE_CODE = :moduleCode
//          AND TO_DATE(:checkDate, 'YYYY-MM-DD') BETWEEN LP.START_DATE AND LP.END_DATE`,
//       { moduleCode, checkDate: date },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };
export const getPeriodStatusForDate = async (moduleCode, date) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `SELECT
         LP.PERIOD_ID,
         LP.PERIOD_NAME,
         PMS.STATUS
       FROM LEDGER_PERIOD LP
       JOIN PERIOD_MODULE_STATUS PMS
         ON PMS.PERIOD_ID = LP.PERIOD_ID
       JOIN LEDGER_MODULE LM
         ON LM.MODULE_ID = PMS.MODULE_ID
       WHERE LM.MODULE_CODE = :moduleCode
         AND TO_DATE(:checkDate, 'YYYY-MM-DD')
             BETWEEN TRUNC(LP.START_DATE)
             AND TRUNC(LP.END_DATE)`,
      {
        moduleCode,
        checkDate: String(date).slice(0, 10),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};