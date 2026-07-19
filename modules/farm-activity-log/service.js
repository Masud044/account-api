import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE ────────────────────────────────────────────────────────────────
export const createActivityLog = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_ACTIVITY_LOG (
        DETAIL_ID, ACTIVITY_DATE, ACTUAL_QTY, ACTUAL_COST, ACTUAL_REVENUE,
        COMPLETED_BY, COMMENTS, COMPLETION_STATUS, UNIT
      ) VALUES (
        :detailId, TO_DATE(:activityDate,'YYYY-MM-DD'), :actualQty, :actualCost, :actualRevenue,
        :completedBy, :comments, :completionStatus, :unit
      ) RETURNING LOG_ID INTO :outId`,
      {
        detailId:         data.detailId ?? null,
        activityDate:     data.activityDate ?? null,
        actualQty:        data.actualQty ?? null,
        actualCost:       data.actualCost ?? null,
        actualRevenue:    data.actualRevenue ?? null,
        completedBy:      data.completedBy ?? null,
        comments:         data.comments ?? null,
        completionStatus: data.completionStatus ?? null,
        unit:             data.unit ?? null,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: true }
    );
    return { id: result.outBinds.outId[0] };
  } finally {
    await conn.close();
  }
};

// ─── GET ALL BY DETAIL_ID ──────────────────────────────────────────────────
export const getActivityLogsByDetailId = async (detailId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         LOG_ID,
         DETAIL_ID,
         TO_CHAR(ACTIVITY_DATE, 'YYYY-MM-DD') AS ACTIVITY_DATE,
         TO_CHAR(CREATED_DATE, 'YYYY-MM-DD')  AS CREATED_DATE,
         ACTUAL_QTY,
         ACTUAL_COST,
         ACTUAL_REVENUE,
         COMPLETED_BY,
         COMMENTS,
         COMPLETION_STATUS,
         UNIT
       FROM FARM_ACTIVITY_LOG
       WHERE DETAIL_ID = :detailId
       ORDER BY LOG_ID DESC`,
      { detailId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE ─────────────────────────────────────────────────────────────
export const getActivityLogById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         LOG_ID,
         DETAIL_ID,
         TO_CHAR(ACTIVITY_DATE, 'YYYY-MM-DD') AS ACTIVITY_DATE,
         TO_CHAR(CREATED_DATE, 'YYYY-MM-DD')  AS CREATED_DATE,
         ACTUAL_QTY,
         ACTUAL_COST,
         ACTUAL_REVENUE,
         COMPLETED_BY,
         COMMENTS,
         COMPLETION_STATUS,
         UNIT
       FROM FARM_ACTIVITY_LOG
       WHERE LOG_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};


// ─── GET ALL (shob activity log, no filter) ────────────────────────────────
export const getAllActivityLogs = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         LOG_ID,
         DETAIL_ID,
         TO_CHAR(ACTIVITY_DATE, 'YYYY-MM-DD') AS ACTIVITY_DATE,
         TO_CHAR(CREATED_DATE, 'YYYY-MM-DD')  AS CREATED_DATE,
         ACTUAL_QTY,
         ACTUAL_COST,
         ACTUAL_REVENUE,
         COMPLETED_BY,
         COMMENTS,
         COMPLETION_STATUS,
         UNIT
       FROM FARM_ACTIVITY_LOG
       ORDER BY LOG_ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── UPDATE ──────────────────────────────────────────────────────────────
export const updateActivityLog = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_ACTIVITY_LOG
         SET ACTIVITY_DATE     = TO_DATE(:activityDate,'YYYY-MM-DD'),
             ACTUAL_QTY        = :actualQty,
             ACTUAL_COST       = :actualCost,
             ACTUAL_REVENUE    = :actualRevenue,
             COMPLETED_BY      = :completedBy,
             COMMENTS          = :comments,
             COMPLETION_STATUS = :completionStatus,
             UNIT              = :unit
       WHERE LOG_ID = :id`,
      {
        activityDate:     data.activityDate ?? null,
        actualQty:        data.actualQty ?? null,
        actualCost:       data.actualCost ?? null,
        actualRevenue:    data.actualRevenue ?? null,
        completedBy:      data.completedBy ?? null,
        comments:         data.comments ?? null,
        completionStatus: data.completionStatus ?? null,
        unit:             data.unit ?? null,
        id,
      },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw new Error('Activity log not found.');
    return { id, rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── DELETE ──────────────────────────────────────────────────────────────
export const deleteActivityLog = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM FARM_ACTIVITY_LOG WHERE LOG_ID = :id`,
      { id },
      { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};