import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ FARM CALENDAR (Header) ═══════════════════
export const createFarmCalendar = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_CALENDAR_H (
        CALENDAR_YEAR, FARM_NAME, DESCRIPTION, CREATED_BY
      ) VALUES (
        :calendarYear, :farmName, :description, :createdBy
      ) RETURNING CALENDAR_ID INTO :outId`,
      {
        calendarYear: data.calendarYear ?? null,
        farmName:     data.farmName ?? null,
        description:  data.description ?? null,
        createdBy:    data.createdBy ?? null,
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

export const getAllFarmCalendars = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         CALENDAR_ID,
         CALENDAR_YEAR,
         FARM_NAME,
         STATUS,
         DESCRIPTION,
         CREATED_BY,
         TO_CHAR(CREATED_DATE, 'YYYY-MM-DD') AS CREATED_DATE
       FROM FARM_CALENDAR_H
       ORDER BY CALENDAR_ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getFarmCalendarById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         CALENDAR_ID,
         CALENDAR_YEAR,
         FARM_NAME,
         STATUS,
         DESCRIPTION,
         CREATED_BY,
         TO_CHAR(CREATED_DATE, 'YYYY-MM-DD') AS CREATED_DATE
       FROM FARM_CALENDAR_H
       WHERE CALENDAR_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateFarmCalendar = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_CALENDAR_H
         SET CALENDAR_YEAR = :calendarYear,
             FARM_NAME     = :farmName,
             STATUS        = :status,
             DESCRIPTION   = :description
       WHERE CALENDAR_ID = :id`,
      {
        calendarYear: data.calendarYear ?? null,
        farmName:     data.farmName ?? null,
        status:       data.status ?? 'ACTIVE',
        description:  data.description ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Farm calendar not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFarmCalendar = async (id) => {
  const conn = await getConnection();
  try {
    // cascade: activity log -> details -> kpi targets -> header
    await conn.execute(
      `DELETE FROM FARM_ACTIVITY_LOG
       WHERE DETAIL_ID IN (SELECT DETAIL_ID FROM FARM_CALENDAR_D WHERE CALENDAR_ID = :id)`,
      { id },
      { autoCommit: false }
    );
    await conn.execute(`DELETE FROM FARM_CALENDAR_D WHERE CALENDAR_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM FARM_KPI_TARGET WHERE CALENDAR_ID = :id`, { id }, { autoCommit: false });
    const result = await conn.execute(`DELETE FROM FARM_CALENDAR_H WHERE CALENDAR_ID = :id`, { id }, { autoCommit: false });
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
export const getFarmCalendarCounts = async (calendarId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         (SELECT COUNT(*) FROM FARM_CALENDAR_D  WHERE CALENDAR_ID = :calendarId) AS DETAILS_COUNT,
         (SELECT COUNT(*) FROM FARM_KPI_TARGET  WHERE CALENDAR_ID = :calendarId) AS KPI_COUNT
       FROM DUAL`,
      { calendarId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

// ═══════════════════ FARM CALENDAR DETAILS (Activities) ═══════════════════
export const createFarmCalendarDetail = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_CALENDAR_D (
        CALENDAR_ID, ACTIVITY_MONTH, START_DATE, END_DATE, RESPONSIBLE_PERSON,
        ACTIVITY_DESC, ACTIVITY_NAME, FARM_TYPE, FREQUENCY, REMARKS
      ) VALUES (
        :calendarId, :activityMonth, TO_DATE(:startDate,'YYYY-MM-DD'), TO_DATE(:endDate,'YYYY-MM-DD'),
        :responsiblePerson, :activityDesc, :activityName, :farmType, :frequency, :remarks
      ) RETURNING DETAIL_ID INTO :outId`,
      {
        calendarId:        data.calendarId ?? null,
        activityMonth:     data.activityMonth ?? null,
        startDate:         data.startDate ?? null,
        endDate:           data.endDate ?? null,
        responsiblePerson: data.responsiblePerson ?? null,
        activityDesc:      data.activityDesc ?? null,
        activityName:      data.activityName ?? null,
        farmType:          data.farmType ?? null,
        frequency:         data.frequency ?? null,
        remarks:           data.remarks ?? null,
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

export const getDetailsByCalendarId = async (calendarId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         DETAIL_ID, CALENDAR_ID, ACTIVITY_MONTH,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE,   'YYYY-MM-DD') AS END_DATE,
         RESPONSIBLE_PERSON, ACTIVITY_DESC, STATUS, ACTIVITY_NAME, FARM_TYPE, FREQUENCY, REMARKS
       FROM FARM_CALENDAR_D
       WHERE CALENDAR_ID = :calendarId
       ORDER BY DETAIL_ID`,
      { calendarId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateFarmCalendarDetail = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_CALENDAR_D
         SET ACTIVITY_MONTH     = :activityMonth,
             START_DATE         = TO_DATE(:startDate,'YYYY-MM-DD'),
             END_DATE           = TO_DATE(:endDate,'YYYY-MM-DD'),
             RESPONSIBLE_PERSON = :responsiblePerson,
             ACTIVITY_DESC      = :activityDesc,
             STATUS             = :status,
             ACTIVITY_NAME      = :activityName,
             FARM_TYPE          = :farmType,
             FREQUENCY          = :frequency,
             REMARKS            = :remarks
       WHERE DETAIL_ID = :id`,
      {
        activityMonth:     data.activityMonth ?? null,
        startDate:         data.startDate ?? null,
        endDate:           data.endDate ?? null,
        responsiblePerson: data.responsiblePerson ?? null,
        activityDesc:      data.activityDesc ?? null,
        status:            data.status ?? 'PLANNED',
        activityName:      data.activityName ?? null,
        farmType:          data.farmType ?? null,
        frequency:         data.frequency ?? null,
        remarks:           data.remarks ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Activity detail not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFarmCalendarDetail = async (id) => {
  const conn = await getConnection();
  try {
    await conn.execute(`DELETE FROM FARM_ACTIVITY_LOG WHERE DETAIL_ID = :id`, { id }, { autoCommit: false });
    const result = await conn.execute(`DELETE FROM FARM_CALENDAR_D WHERE DETAIL_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ FARM KPI TARGETS ═══════════════════
export const createKpiTarget = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_KPI_TARGET (
        CALENDAR_ID, FARM_TYPE, KPI_NAME, TARGET_VALUE, UNIT, ACTUAL_VALUE, REMARKS
      ) VALUES (
        :calendarId, :farmType, :kpiName, :targetValue, :unit, :actualValue, :remarks
      ) RETURNING KPI_ID INTO :outId`,
      {
        calendarId:  data.calendarId ?? null,
        farmType:    data.farmType ?? null,
        kpiName:     data.kpiName ?? null,
        targetValue: data.targetValue ?? null,
        unit:        data.unit ?? null,
        actualValue: data.actualValue ?? null,
        remarks:     data.remarks ?? null,
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

export const getKpiTargetsByCalendarId = async (calendarId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         KPI_ID, CALENDAR_ID, FARM_TYPE, KPI_NAME, TARGET_VALUE, UNIT, ACTUAL_VALUE, REMARKS
       FROM FARM_KPI_TARGET
       WHERE CALENDAR_ID = :calendarId
       ORDER BY KPI_ID`,
      { calendarId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateKpiTarget = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_KPI_TARGET
         SET FARM_TYPE    = :farmType,
             KPI_NAME     = :kpiName,
             TARGET_VALUE = :targetValue,
             UNIT         = :unit,
             ACTUAL_VALUE = :actualValue,
             REMARKS      = :remarks
       WHERE KPI_ID = :id`,
      {
        farmType:    data.farmType ?? null,
        kpiName:     data.kpiName ?? null,
        targetValue: data.targetValue ?? null,
        unit:        data.unit ?? null,
        actualValue: data.actualValue ?? null,
        remarks:     data.remarks ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('KPI target not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteKpiTarget = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM FARM_KPI_TARGET WHERE KPI_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};