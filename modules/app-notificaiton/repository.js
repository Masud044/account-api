import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE (single) ────────────────────────────────────────────────────────
// data: { userId, title, message, type, refTable, refId }
export const insertNotification = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO APP_NOTIFICATIONS (
        USER_ID, TITLE, MESSAGE, TYPE, REF_TABLE, REF_ID
      ) VALUES (
        :userId, :title, :message, :type, :refTable, :refId
      ) RETURNING NOTIFICATION_ID INTO :outId`,
      {
        userId:   data.userId,
        title:    data.title,
        message:  data.message ?? null,
        type:     data.type ?? 'GENERAL',
        refTable: data.refTable ?? null,
        refId:    data.refId ?? null,
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

// ─── CREATE (bulk — many recipients, one event) ─────────────────────────────
// data: { userIds: [], title, message, type, refTable, refId }
export const insertNotificationBulk = async (data) => {
  const conn = await getConnection();
  try {
    const userIds = Array.isArray(data.userIds) ? data.userIds : [];
    for (const userId of userIds) {
      await conn.execute(
        `INSERT INTO APP_NOTIFICATIONS (
          USER_ID, TITLE, MESSAGE, TYPE, REF_TABLE, REF_ID
        ) VALUES (
          :userId, :title, :message, :type, :refTable, :refId
        )`,
        {
          userId,
          title:    data.title,
          message:  data.message ?? null,
          type:     data.type ?? 'GENERAL',
          refTable: data.refTable ?? null,
          refId:    data.refId ?? null,
        },
        { autoCommit: false }
      );
    }

    await conn.commit();
    return { count: userIds.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── GET LIST (per user, latest first) ──────────────────────────────────────
export const getNotificationsByUser = async (userId, limit = 20) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         NOTIFICATION_ID,
         USER_ID,
         TITLE,
         MESSAGE,
         TYPE,
         REF_TABLE,
         REF_ID,
         IS_READ,
        TO_CHAR(CREATED_AT + INTERVAL '6' HOUR, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
       FROM APP_NOTIFICATIONS
       WHERE USER_ID = :userId
       ORDER BY CREATED_AT DESC
       FETCH FIRST :limit ROWS ONLY`,
      { userId, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET UNREAD COUNT ────────────────────────────────────────────────────────
export const getUnreadCount = async (userId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COUNT(*) AS UNREAD_COUNT
       FROM APP_NOTIFICATIONS
       WHERE USER_ID = :userId AND IS_READ = 'N'`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0]?.UNREAD_COUNT ?? 0;
  } finally {
    await conn.close();
  }
};

// ─── MARK ONE AS READ ────────────────────────────────────────────────────────
export const markAsRead = async (notificationId, userId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE APP_NOTIFICATIONS
         SET IS_READ = 'Y'
       WHERE NOTIFICATION_ID = :notificationId
         AND USER_ID = :userId`,
      { notificationId, userId },
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

// ─── MARK ALL AS READ (per user) ─────────────────────────────────────────────
export const markAllAsRead = async (userId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE APP_NOTIFICATIONS
         SET IS_READ = 'Y'
       WHERE USER_ID = :userId
         AND IS_READ = 'N'`,
      { userId },
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

// ─── DELETE ──────────────────────────────────────────────────────────────────
export const deleteNotification = async (notificationId, userId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM APP_NOTIFICATIONS
       WHERE NOTIFICATION_ID = :notificationId
         AND USER_ID = :userId`,
      { notificationId, userId },
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