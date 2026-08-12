// import { getConnection, oracledb } from '../../config/db.js';

// // ═══════════════════════════════════════════════════════════════════════════
// // ACTION ITEMS
// // ═══════════════════════════════════════════════════════════════════════════

// export const getActionItems = async (meetingId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          ai.ACTION_ITEM_ID,
//          ai.MEETING_ID,
//          ai.AGENDA_ITEM_ID,
//          a.TOPIC AS AGENDA_TOPIC,
//          ai.DESCRIPTION,
//          ai.ASSIGNED_TO,
//          e1.FIRST_NAME || ' ' || e1.LAST_NAME AS ASSIGNED_TO_NAME,
//          ai.ASSIGNED_BY,
//          e2.FIRST_NAME || ' ' || e2.LAST_NAME AS ASSIGNED_BY_NAME,
//          ai.PRIORITY,
//          ai.STATUS,
//          TO_CHAR(ai.DUE_DATE, 'YYYY-MM-DD') AS DUE_DATE,
//          TO_CHAR(ai.COMPLETED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS COMPLETED_AT,
//          TO_CHAR(ai.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT
//        FROM ACTION_ITEMS ai
//        LEFT JOIN AGENDA_ITEMS a ON a.AGENDA_ITEM_ID = ai.AGENDA_ITEM_ID
//        LEFT JOIN EMPLOYEES e1   ON e1.EMPLOYEE_ID = ai.ASSIGNED_TO
//        LEFT JOIN EMPLOYEES e2   ON e2.EMPLOYEE_ID = ai.ASSIGNED_BY
//        WHERE ai.MEETING_ID = :meetingId
//        ORDER BY ai.ACTION_ITEM_ID DESC`,
//       { meetingId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getActionItemById = async (meetingId, actionItemId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          ai.ACTION_ITEM_ID,
//          ai.MEETING_ID,
//          ai.AGENDA_ITEM_ID,
//          a.TOPIC AS AGENDA_TOPIC,
//          ai.DESCRIPTION,
//          ai.ASSIGNED_TO,
//          e1.FIRST_NAME || ' ' || e1.LAST_NAME AS ASSIGNED_TO_NAME,
//          ai.ASSIGNED_BY,
//          ai.PRIORITY,
//          ai.STATUS,
//          TO_CHAR(ai.DUE_DATE, 'YYYY-MM-DD') AS DUE_DATE,
//          TO_CHAR(ai.COMPLETED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS COMPLETED_AT
//        FROM ACTION_ITEMS ai
//        LEFT JOIN AGENDA_ITEMS a ON a.AGENDA_ITEM_ID = ai.AGENDA_ITEM_ID
//        LEFT JOIN EMPLOYEES e1   ON e1.EMPLOYEE_ID = ai.ASSIGNED_TO
//        WHERE ai.ACTION_ITEM_ID = :actionItemId AND ai.MEETING_ID = :meetingId`,
//       { actionItemId, meetingId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };

// export const createActionItem = async (meetingId, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO ACTION_ITEMS (
//         MEETING_ID, AGENDA_ITEM_ID, DESCRIPTION, ASSIGNED_TO, ASSIGNED_BY,
//         PRIORITY, STATUS, DUE_DATE
//       ) VALUES (
//         :meetingId, :agendaItemId, :description, :assignedTo, :assignedBy,
//         :priority, :status, TO_DATE(:dueDate, 'YYYY-MM-DD')
//       ) RETURNING ACTION_ITEM_ID INTO :outId`,
//       {
//         meetingId,
//         agendaItemId: data.agendaItemId ?? null,
//         description:  data.description,
//         assignedTo:   data.assignedTo,
//         assignedBy:   data.assignedBy ?? null,
//         priority:     data.priority ?? 'MEDIUM',
//         status:       'OPEN',
//         dueDate:      data.dueDate ?? null,
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateActionItem = async (meetingId, actionItemId, data) => {
//   const conn = await getConnection();
//   try {
//     const isCompleting = data.status === 'DONE';
//     const result = await conn.execute(
//       `UPDATE ACTION_ITEMS
//          SET DESCRIPTION    = :description,
//              AGENDA_ITEM_ID = :agendaItemId,
//              ASSIGNED_TO    = :assignedTo,
//              PRIORITY       = :priority,
//              STATUS         = :status,
//              DUE_DATE       = TO_DATE(:dueDate, 'YYYY-MM-DD'),
//              COMPLETED_AT   = CASE WHEN :isCompleting = 1 THEN SYSTIMESTAMP ELSE COMPLETED_AT END
//        WHERE ACTION_ITEM_ID = :actionItemId AND MEETING_ID = :meetingId`,
//       {
//         description:  data.description,
//         agendaItemId: data.agendaItemId ?? null,
//         assignedTo:   data.assignedTo,
//         priority:     data.priority ?? 'MEDIUM',
//         status:       data.status ?? 'OPEN',
//         dueDate:      data.dueDate ?? null,
//         isCompleting: isCompleting ? 1 : 0,
//         actionItemId,
//         meetingId,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Action item not found.');
//     await conn.commit();
//     return { id: actionItemId, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // Lightweight status-only update — used for quick inline status change in the UI
// // (e.g. dragging a card between OPEN / IN_PROGRESS / DONE columns).
// export const updateActionItemStatus = async (meetingId, actionItemId, status) => {
//   const conn = await getConnection();
//   try {
//     const isCompleting = status === 'DONE';
//     const result = await conn.execute(
//       `UPDATE ACTION_ITEMS
//          SET STATUS       = :status,
//              COMPLETED_AT = CASE WHEN :isCompleting = 1 THEN SYSTIMESTAMP ELSE NULL END
//        WHERE ACTION_ITEM_ID = :actionItemId AND MEETING_ID = :meetingId`,
//       { status, isCompleting: isCompleting ? 1 : 0, actionItemId, meetingId },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Action item not found.');
//     await conn.commit();
//     return { id: actionItemId, status };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteActionItem = async (meetingId, actionItemId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `DELETE FROM ACTION_ITEMS WHERE ACTION_ITEM_ID = :actionItemId AND MEETING_ID = :meetingId`,
//       { actionItemId, meetingId },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Action item not found.');
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // ATTACHMENTS  (disk storage — FILE_PATH holds the on-disk relative path)
// // ═══════════════════════════════════════════════════════════════════════════

// export const getAttachments = async (meetingId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          att.ATTACHMENT_ID,
//          att.MEETING_ID,
//          att.AGENDA_ITEM_ID,
//          a.TOPIC AS AGENDA_TOPIC,
//          att.FILE_NAME,
//          att.FILE_PATH,
//          att.UPLOADED_BY,
//          e.FIRST_NAME || ' ' || e.LAST_NAME AS UPLOADED_BY_NAME,
//          TO_CHAR(att.UPLOADED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS UPLOADED_AT
//        FROM ATTACHMENTS att
//        LEFT JOIN AGENDA_ITEMS a ON a.AGENDA_ITEM_ID = att.AGENDA_ITEM_ID
//        LEFT JOIN EMPLOYEES e    ON e.EMPLOYEE_ID = att.UPLOADED_BY
//        WHERE att.MEETING_ID = :meetingId
//        ORDER BY att.ATTACHMENT_ID DESC`,
//       { meetingId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// // data: { agendaItemId, fileName, filePath, uploadedBy }
// // filePath is the relative on-disk path already written by multer diskStorage
// // (e.g. 'uploads/agenda-attachments/1699999999-abc123.pdf')
// export const createAttachment = async (meetingId, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO ATTACHMENTS (MEETING_ID, AGENDA_ITEM_ID, FILE_NAME, FILE_PATH, UPLOADED_BY)
//        VALUES (:meetingId, :agendaItemId, :fileName, :filePath, :uploadedBy)
//        RETURNING ATTACHMENT_ID INTO :outId`,
//       {
//         meetingId,
//         agendaItemId: data.agendaItemId ?? null,
//         fileName:     data.fileName,
//         filePath:     data.filePath,
//         uploadedBy:   data.uploadedBy,
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0], filePath: data.filePath };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // Fetch a single attachment's metadata — used by the download route to
// // locate the file on disk and set the correct response filename.
// export const getAttachmentById = async (meetingId, attachmentId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT ATTACHMENT_ID, FILE_NAME, FILE_PATH
//        FROM ATTACHMENTS
//        WHERE ATTACHMENT_ID = :attachmentId AND MEETING_ID = :meetingId`,
//       { attachmentId, meetingId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };

// // Deletes the DB row and returns the FILE_PATH so the controller can also
// // remove the physical file from disk.
// export const deleteAttachment = async (meetingId, attachmentId) => {
//   const conn = await getConnection();
//   try {
//     const lookup = await conn.execute(
//       `SELECT FILE_PATH FROM ATTACHMENTS WHERE ATTACHMENT_ID = :attachmentId AND MEETING_ID = :meetingId`,
//       { attachmentId, meetingId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const filePath = lookup.rows[0]?.FILE_PATH ?? null;
//     if (filePath === null) throw new Error('Attachment not found.');

//     const result = await conn.execute(
//       `DELETE FROM ATTACHMENTS WHERE ATTACHMENT_ID = :attachmentId AND MEETING_ID = :meetingId`,
//       { attachmentId, meetingId },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected, filePath };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // NOTIFICATIONS
// // ═══════════════════════════════════════════════════════════════════════════

// export const getNotifications = async (meetingId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          n.NOTIFICATION_ID,
//          n.MEETING_ID,
//          n.EMPLOYEE_ID,
//          e.FIRST_NAME || ' ' || e.LAST_NAME AS EMPLOYEE_NAME,
//          n.NOTIFICATION_TYPE,
//          n.MESSAGE,
//          TO_CHAR(n.SEND_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS SEND_AT,
//          n.IS_SENT,
//          TO_CHAR(n.SENT_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS SENT_AT
//        FROM NOTIFICATIONS n
//        JOIN EMPLOYEES e ON e.EMPLOYEE_ID = n.EMPLOYEE_ID
//        WHERE n.MEETING_ID = :meetingId
//        ORDER BY n.NOTIFICATION_ID DESC`,
//       { meetingId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// // data: { employeeIds: [1,2,3], notificationType, message, sendAt }
// // Bulk insert — one notification row per recipient employee.
// export const createNotification = async (meetingId, data) => {
//   const conn = await getConnection();
//   try {
//     const employeeIds = Array.isArray(data.employeeIds) ? data.employeeIds : [];
//     if (employeeIds.length === 0) throw new Error('At least one recipient is required.');

//     const binds = employeeIds.map((employeeId) => ({
//       meetingId,
//       employeeId,
//       notificationType: data.notificationType ?? 'REMINDER',
//       message:          data.message ?? null,
//       sendAt:           data.sendAt ? new Date(data.sendAt) : new Date(),
//     }));

//     await conn.executeMany(
//       `INSERT INTO NOTIFICATIONS (MEETING_ID, EMPLOYEE_ID, NOTIFICATION_TYPE, MESSAGE, SEND_AT)
//        VALUES (:meetingId, :employeeId, :notificationType, :message, :sendAt)`,
//       binds,
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { count: binds.length };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // Marks a notification as sent — called by whatever dispatch job/cron
// // actually sends the email/push, right after a successful send.
// export const markNotificationSent = async (meetingId, notificationId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE NOTIFICATIONS
//          SET IS_SENT = 'Y', SENT_AT = SYSTIMESTAMP
//        WHERE NOTIFICATION_ID = :notificationId AND MEETING_ID = :meetingId`,
//       { notificationId, meetingId },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Notification not found.');
//     await conn.commit();
//     return { id: notificationId, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteNotification = async (meetingId, notificationId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `DELETE FROM NOTIFICATIONS WHERE NOTIFICATION_ID = :notificationId AND MEETING_ID = :meetingId`,
//       { notificationId, meetingId },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Notification not found.');
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION ITEMS
// STATUS check constraint (DB): IN ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')
// ═══════════════════════════════════════════════════════════════════════════

export const getActionItems = async (meetingId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ai.ACTION_ITEM_ID,
         ai.MEETING_ID,
         ai.AGENDA_ITEM_ID,
         a.TOPIC AS AGENDA_TOPIC,
         ai.DESCRIPTION,
         ai.ASSIGNED_TO,
         e1.FIRST_NAME || ' ' || e1.LAST_NAME AS ASSIGNED_TO_NAME,
         ai.ASSIGNED_BY,
         e2.FIRST_NAME || ' ' || e2.LAST_NAME AS ASSIGNED_BY_NAME,
         ai.PRIORITY,
         ai.STATUS,
         TO_CHAR(ai.DUE_DATE, 'YYYY-MM-DD') AS DUE_DATE,
         TO_CHAR(ai.COMPLETED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS COMPLETED_AT,
         TO_CHAR(ai.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT
       FROM ACTION_ITEMS ai
       LEFT JOIN AGENDA_ITEMS a ON a.AGENDA_ITEM_ID = ai.AGENDA_ITEM_ID
       LEFT JOIN EMPLOYEES e1   ON e1.EMPLOYEE_ID = ai.ASSIGNED_TO
       LEFT JOIN EMPLOYEES e2   ON e2.EMPLOYEE_ID = ai.ASSIGNED_BY
       WHERE ai.MEETING_ID = :meetingId
       ORDER BY ai.ACTION_ITEM_ID DESC`,
      { meetingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getActionItemById = async (meetingId, actionItemId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ai.ACTION_ITEM_ID,
         ai.MEETING_ID,
         ai.AGENDA_ITEM_ID,
         a.TOPIC AS AGENDA_TOPIC,
         ai.DESCRIPTION,
         ai.ASSIGNED_TO,
         e1.FIRST_NAME || ' ' || e1.LAST_NAME AS ASSIGNED_TO_NAME,
         ai.ASSIGNED_BY,
         ai.PRIORITY,
         ai.STATUS,
         TO_CHAR(ai.DUE_DATE, 'YYYY-MM-DD') AS DUE_DATE,
         TO_CHAR(ai.COMPLETED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS COMPLETED_AT
       FROM ACTION_ITEMS ai
       LEFT JOIN AGENDA_ITEMS a ON a.AGENDA_ITEM_ID = ai.AGENDA_ITEM_ID
       LEFT JOIN EMPLOYEES e1   ON e1.EMPLOYEE_ID = ai.ASSIGNED_TO
       WHERE ai.ACTION_ITEM_ID = :actionItemId AND ai.MEETING_ID = :meetingId`,
      { actionItemId, meetingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const createActionItem = async (meetingId, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO ACTION_ITEMS (
        MEETING_ID, AGENDA_ITEM_ID, DESCRIPTION, ASSIGNED_TO, ASSIGNED_BY,
        PRIORITY, STATUS, DUE_DATE
      ) VALUES (
        :meetingId, :agendaItemId, :description, :assignedTo, :assignedBy,
        :priority, :status, TO_DATE(:dueDate, 'YYYY-MM-DD')
      ) RETURNING ACTION_ITEM_ID INTO :outId`,
      {
        meetingId,
        agendaItemId: data.agendaItemId ?? null,
        description:  data.description,
        assignedTo:   data.assignedTo,
        assignedBy:   data.assignedBy ?? null,
        priority:     data.priority ?? 'MEDIUM',
        status:       'OPEN', // new action items always start OPEN, regardless of what's sent
        dueDate:      data.dueDate ?? null,
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

export const updateActionItem = async (meetingId, actionItemId, data) => {
  const conn = await getConnection();
  try {
    const isCompleting = data.status === 'COMPLETED';
    const result = await conn.execute(
      `UPDATE ACTION_ITEMS
         SET DESCRIPTION    = :description,
             AGENDA_ITEM_ID = :agendaItemId,
             ASSIGNED_TO    = :assignedTo,
             PRIORITY       = :priority,
             STATUS         = :status,
             DUE_DATE       = TO_DATE(:dueDate, 'YYYY-MM-DD'),
             COMPLETED_AT   = CASE WHEN :isCompleting = 1 THEN SYSTIMESTAMP ELSE COMPLETED_AT END
       WHERE ACTION_ITEM_ID = :actionItemId AND MEETING_ID = :meetingId`,
      {
        description:  data.description,
        agendaItemId: data.agendaItemId ?? null,
        assignedTo:   data.assignedTo,
        priority:     data.priority ?? 'MEDIUM',
        status:       data.status ?? 'OPEN',
        dueDate:      data.dueDate ?? null,
        isCompleting: isCompleting ? 1 : 0,
        actionItemId,
        meetingId,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Action item not found.');
    await conn.commit();
    return { id: actionItemId, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// Lightweight status-only update — used for quick inline status change in the UI
// (e.g. moving a card between OPEN / IN_PROGRESS / COMPLETED, or cancelling it).
export const updateActionItemStatus = async (meetingId, actionItemId, status) => {
  const conn = await getConnection();
  try {
    const isCompleting = status === 'COMPLETED';
    const result = await conn.execute(
      `UPDATE ACTION_ITEMS
         SET STATUS       = :status,
             COMPLETED_AT = CASE WHEN :isCompleting = 1 THEN SYSTIMESTAMP ELSE NULL END
       WHERE ACTION_ITEM_ID = :actionItemId AND MEETING_ID = :meetingId`,
      { status, isCompleting: isCompleting ? 1 : 0, actionItemId, meetingId },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Action item not found.');
    await conn.commit();
    return { id: actionItemId, status };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteActionItem = async (meetingId, actionItemId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM ACTION_ITEMS WHERE ACTION_ITEM_ID = :actionItemId AND MEETING_ID = :meetingId`,
      { actionItemId, meetingId },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Action item not found.');
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ATTACHMENTS  (disk storage — FILE_PATH holds the on-disk relative path)
// ═══════════════════════════════════════════════════════════════════════════

export const getAttachments = async (meetingId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         att.ATTACHMENT_ID,
         att.MEETING_ID,
         att.AGENDA_ITEM_ID,
         a.TOPIC AS AGENDA_TOPIC,
         att.FILE_NAME,
         att.FILE_PATH,
         att.UPLOADED_BY,
         e.FIRST_NAME || ' ' || e.LAST_NAME AS UPLOADED_BY_NAME,
         TO_CHAR(att.UPLOADED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS UPLOADED_AT
       FROM ATTACHMENTS att
       LEFT JOIN AGENDA_ITEMS a ON a.AGENDA_ITEM_ID = att.AGENDA_ITEM_ID
       LEFT JOIN EMPLOYEES e    ON e.EMPLOYEE_ID = att.UPLOADED_BY
       WHERE att.MEETING_ID = :meetingId
       ORDER BY att.ATTACHMENT_ID DESC`,
      { meetingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// data: { agendaItemId, fileName, filePath, uploadedBy }
// filePath is the relative on-disk path already written by multer diskStorage
// (e.g. 'uploads/agenda-attachments/1699999999-abc123.pdf')
export const createAttachment = async (meetingId, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO ATTACHMENTS (MEETING_ID, AGENDA_ITEM_ID, FILE_NAME, FILE_PATH, UPLOADED_BY)
       VALUES (:meetingId, :agendaItemId, :fileName, :filePath, :uploadedBy)
       RETURNING ATTACHMENT_ID INTO :outId`,
      {
        meetingId,
        agendaItemId: data.agendaItemId ?? null,
        fileName:     data.fileName,
        filePath:     data.filePath,
        uploadedBy:   data.uploadedBy,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    await conn.commit();
    return { id: result.outBinds.outId[0], filePath: data.filePath };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// Fetch a single attachment's metadata — used by the download route to
// locate the file on disk and set the correct response filename.
export const getAttachmentById = async (meetingId, attachmentId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ATTACHMENT_ID, FILE_NAME, FILE_PATH
       FROM ATTACHMENTS
       WHERE ATTACHMENT_ID = :attachmentId AND MEETING_ID = :meetingId`,
      { attachmentId, meetingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// Deletes the DB row and returns the FILE_PATH so the controller can also
// remove the physical file from disk.
export const deleteAttachment = async (meetingId, attachmentId) => {
  const conn = await getConnection();
  try {
    const lookup = await conn.execute(
      `SELECT FILE_PATH FROM ATTACHMENTS WHERE ATTACHMENT_ID = :attachmentId AND MEETING_ID = :meetingId`,
      { attachmentId, meetingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const filePath = lookup.rows[0]?.FILE_PATH ?? null;
    if (filePath === null) throw new Error('Attachment not found.');

    const result = await conn.execute(
      `DELETE FROM ATTACHMENTS WHERE ATTACHMENT_ID = :attachmentId AND MEETING_ID = :meetingId`,
      { attachmentId, meetingId },
      { autoCommit: false }
    );
    await conn.commit();
    return { rowsAffected: result.rowsAffected, filePath };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const getNotifications = async (meetingId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         n.NOTIFICATION_ID,
         n.MEETING_ID,
         n.EMPLOYEE_ID,
         e.FIRST_NAME || ' ' || e.LAST_NAME AS EMPLOYEE_NAME,
         n.NOTIFICATION_TYPE,
         n.MESSAGE,
         TO_CHAR(n.SEND_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS SEND_AT,
         n.IS_SENT,
         TO_CHAR(n.SENT_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS SENT_AT
       FROM NOTIFICATIONS n
       JOIN EMPLOYEES e ON e.EMPLOYEE_ID = n.EMPLOYEE_ID
       WHERE n.MEETING_ID = :meetingId
       ORDER BY n.NOTIFICATION_ID DESC`,
      { meetingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// data: { employeeIds: [1,2,3], notificationType, message, sendAt }
// Bulk insert — one notification row per recipient employee.
export const createNotification = async (meetingId, data) => {
  const conn = await getConnection();
  try {
    const employeeIds = Array.isArray(data.employeeIds) ? data.employeeIds : [];
    if (employeeIds.length === 0) throw new Error('At least one recipient is required.');

    const binds = employeeIds.map((employeeId) => ({
      meetingId,
      employeeId,
      notificationType: data.notificationType ?? 'REMINDER',
      message:          data.message ?? null,
      sendAt:           data.sendAt ? new Date(data.sendAt) : new Date(),
    }));

    await conn.executeMany(
      `INSERT INTO NOTIFICATIONS (MEETING_ID, EMPLOYEE_ID, NOTIFICATION_TYPE, MESSAGE, SEND_AT)
       VALUES (:meetingId, :employeeId, :notificationType, :message, :sendAt)`,
      binds,
      { autoCommit: false }
    );
    await conn.commit();
    return { count: binds.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// Marks a notification as sent — called by whatever dispatch job/cron
// actually sends the email/push, right after a successful send.
export const markNotificationSent = async (meetingId, notificationId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE NOTIFICATIONS
         SET IS_SENT = 'Y', SENT_AT = SYSTIMESTAMP
       WHERE NOTIFICATION_ID = :notificationId AND MEETING_ID = :meetingId`,
      { notificationId, meetingId },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Notification not found.');
    await conn.commit();
    return { id: notificationId, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteNotification = async (meetingId, notificationId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM NOTIFICATIONS WHERE NOTIFICATION_ID = :notificationId AND MEETING_ID = :meetingId`,
      { notificationId, meetingId },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Notification not found.');
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};