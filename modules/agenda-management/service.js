// import { getConnection, oracledb } from '../../config/db.js';

// // ═══════════════════ MEETING (Header) ═══════════════════
// // Creates a meeting + its participants + its agenda items in ONE transaction.
// // data shape expected from the form:
// // {
// //   title, description, organizerId, departmentId, roomId,
// //   meetingType, virtualLink, startTime, endTime, status,
// //   participants: [{ employeeId, role, rsvpStatus }],
// //   agendaItems:  [{ itemOrder, topic, presenterId, durationMinutes }]
// // }
// export const createMeeting = async (data) => {
//   const conn = await getConnection();
//   try {
//     const meetingResult = await conn.execute(
//       `INSERT INTO MEETINGS (
//         TITLE, DESCRIPTION, ORGANIZER_ID, DEPARTMENT_ID, ROOM_ID,
//         MEETING_TYPE, VIRTUAL_LINK, START_TIME, END_TIME, STATUS
//       ) VALUES (
//         :title, :description, :organizerId, :departmentId, :roomId,
//         :meetingType, :virtualLink, :startTime, :endTime, :status
//       ) RETURNING MEETING_ID INTO :outId`,
//       {
//         title:        data.title ?? null,
//         description:  data.description ?? null,
//         organizerId:  data.organizerId ?? null,
//         departmentId: data.departmentId ?? null,
//         roomId:       data.roomId ?? null,
//         meetingType:  data.meetingType ?? 'IN_PERSON',
//         virtualLink:  data.virtualLink ?? null,
//        startTime:    data.startTime ? new Date(data.startTime) : null,
// endTime:      data.endTime ? new Date(data.endTime) : null,
//         status:       data.status ?? 'SCHEDULED',
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     const meetingId = meetingResult.outBinds.outId[0];

//     if (Array.isArray(data.participants) && data.participants.length > 0) {
//       const participantBinds = data.participants.map((p) => ({
//         meetingId,
//         employeeId: p.employeeId ?? null,
//         role:       p.role ?? 'ATTENDEE',
//         rsvpStatus: p.rsvpStatus ?? 'PENDING',
//       }));
//       await conn.executeMany(
//         `INSERT INTO MEETING_PARTICIPANTS (MEETING_ID, EMPLOYEE_ID, ROLE, RSVP_STATUS)
//          VALUES (:meetingId, :employeeId, :role, :rsvpStatus)`,
//         participantBinds,
//         { autoCommit: false }
//       );
//     }

//     if (Array.isArray(data.agendaItems) && data.agendaItems.length > 0) {
//       const agendaBinds = data.agendaItems.map((a, idx) => ({
//         meetingId,
//         itemOrder:       a.itemOrder ?? idx + 1,
//         topic:           a.topic ?? null,
//         presenterId:     a.presenterId ?? null,
//         durationMinutes: a.durationMinutes ?? null,
//       }));
//       await conn.executeMany(
//         `INSERT INTO AGENDA_ITEMS (MEETING_ID, ITEM_ORDER, TOPIC, PRESENTER_ID, DURATION_MINUTES)
//          VALUES (:meetingId, :itemOrder, :topic, :presenterId, :durationMinutes)`,
//         agendaBinds,
//         { autoCommit: false }
//       );
//     }

//     await conn.commit();
//     return { id: meetingId };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getAllMeetings = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          m.MEETING_ID,
//          m.TITLE,
//          m.MEETING_TYPE,
//          m.STATUS,
//          TO_CHAR(m.START_TIME, 'YYYY-MM-DD"T"HH24:MI:SS') AS START_TIME,
//          TO_CHAR(m.END_TIME,   'YYYY-MM-DD"T"HH24:MI:SS') AS END_TIME,
//          m.ORGANIZER_ID,
//          e.FIRST_NAME || ' ' || e.LAST_NAME AS ORGANIZER_NAME,
//          m.DEPARTMENT_ID,
//          d.DEPARTMENT_NAME,
//          m.ROOM_ID,
//          r.ROOM_NAME
//        FROM MEETINGS m
//        LEFT JOIN EMPLOYEES e     ON e.EMPLOYEE_ID = m.ORGANIZER_ID
//        LEFT JOIN DEPARTMENTS d   ON d.DEPARTMENT_ID = m.DEPARTMENT_ID
//        LEFT JOIN MEETING_ROOMS r ON r.ROOM_ID = m.ROOM_ID
//        ORDER BY m.MEETING_ID DESC`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getMeetingById = async (id) => {
//   const conn = await getConnection();
//   try {
//     const meetingResult = await conn.execute(
//       `SELECT
//          m.MEETING_ID,
//          m.TITLE,
//          m.DESCRIPTION,
//          m.MEETING_TYPE,
//          m.VIRTUAL_LINK,
//          m.STATUS,
//          TO_CHAR(m.START_TIME, 'YYYY-MM-DD"T"HH24:MI:SS') AS START_TIME,
//          TO_CHAR(m.END_TIME,   'YYYY-MM-DD"T"HH24:MI:SS') AS END_TIME,
//          m.ORGANIZER_ID,
//          m.DEPARTMENT_ID,
//          m.ROOM_ID
//        FROM MEETINGS m
//        WHERE m.MEETING_ID = :id`,
//       { id },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const meeting = meetingResult.rows[0] ?? null;
//     if (!meeting) return null;

//     const participantsResult = await conn.execute(
//       `SELECT
//          p.PARTICIPANT_ID,
//          p.EMPLOYEE_ID,
//          e.FIRST_NAME || ' ' || e.LAST_NAME AS EMPLOYEE_NAME,
//          p.ROLE,
//          p.RSVP_STATUS
//        FROM MEETING_PARTICIPANTS p
//        JOIN EMPLOYEES e ON e.EMPLOYEE_ID = p.EMPLOYEE_ID
//        WHERE p.MEETING_ID = :id
//        ORDER BY p.PARTICIPANT_ID`,
//       { id },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const agendaResult = await conn.execute(
//       `SELECT
//          a.AGENDA_ITEM_ID,
//          a.ITEM_ORDER,
//          a.TOPIC,
//          a.PRESENTER_ID,
//          e.FIRST_NAME || ' ' || e.LAST_NAME AS PRESENTER_NAME,
//          a.DURATION_MINUTES,
//          a.STATUS
//        FROM AGENDA_ITEMS a
//        LEFT JOIN EMPLOYEES e ON e.EMPLOYEE_ID = a.PRESENTER_ID
//        WHERE a.MEETING_ID = :id
//        ORDER BY a.ITEM_ORDER`,
//       { id },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return {
//       ...meeting,
//       participants: participantsResult.rows,
//       agendaItems: agendaResult.rows,
//     };
//   } finally {
//     await conn.close();
//   }
// };

// // Full replace of a meeting's participants + agenda items along with the header —
// // same delete-then-recreate approach kept inside one transaction.
// export const updateMeeting = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE MEETINGS
//          SET TITLE        = :title,
//              DESCRIPTION  = :description,
//              ORGANIZER_ID = :organizerId,
//              DEPARTMENT_ID= :departmentId,
//              ROOM_ID      = :roomId,
//              MEETING_TYPE = :meetingType,
//              VIRTUAL_LINK = :virtualLink,
//              START_TIME   = :startTime,
//              END_TIME     = :endTime,
//              STATUS       = :status,
//              UPDATED_AT   = SYSTIMESTAMP
//        WHERE MEETING_ID = :id`,
//       {
//         title:        data.title ?? null,
//         description:  data.description ?? null,
//         organizerId:  data.organizerId ?? null,
//         departmentId: data.departmentId ?? null,
//         roomId:       data.roomId ?? null,
//         meetingType:  data.meetingType ?? 'IN_PERSON',
//         virtualLink:  data.virtualLink ?? null,
//        startTime:    data.startTime ? new Date(data.startTime) : null,
// endTime:      data.endTime ? new Date(data.endTime) : null,
//         status:       data.status ?? 'SCHEDULED',
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Meeting not found.');

//     if (Array.isArray(data.participants)) {
//       await conn.execute(`DELETE FROM MEETING_PARTICIPANTS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//       if (data.participants.length > 0) {
//         const participantBinds = data.participants.map((p) => ({
//           meetingId: id,
//           employeeId: p.employeeId ?? null,
//           role:       p.role ?? 'ATTENDEE',
//           rsvpStatus: p.rsvpStatus ?? 'PENDING',
//         }));
//         await conn.executeMany(
//           `INSERT INTO MEETING_PARTICIPANTS (MEETING_ID, EMPLOYEE_ID, ROLE, RSVP_STATUS)
//            VALUES (:meetingId, :employeeId, :role, :rsvpStatus)`,
//           participantBinds,
//           { autoCommit: false }
//         );
//       }
//     }

//     if (Array.isArray(data.agendaItems)) {
//       await conn.execute(`DELETE FROM AGENDA_ITEMS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//       if (data.agendaItems.length > 0) {
//         const agendaBinds = data.agendaItems.map((a, idx) => ({
//           meetingId: id,
//           itemOrder:       a.itemOrder ?? idx + 1,
//           topic:           a.topic ?? null,
//           presenterId:     a.presenterId ?? null,
//           durationMinutes: a.durationMinutes ?? null,
//         }));
//         await conn.executeMany(
//           `INSERT INTO AGENDA_ITEMS (MEETING_ID, ITEM_ORDER, TOPIC, PRESENTER_ID, DURATION_MINUTES)
//            VALUES (:meetingId, :itemOrder, :topic, :presenterId, :durationMinutes)`,
//           agendaBinds,
//           { autoCommit: false }
//         );
//       }
//     }

//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteMeeting = async (id) => {
//   const conn = await getConnection();
//   try {
//     // cascade: notifications / attachments / action items / minutes / agenda items / participants -> meeting
//     await conn.execute(`DELETE FROM NOTIFICATIONS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM ATTACHMENTS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM ACTION_ITEMS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM MEETING_MINUTES WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM AGENDA_ITEMS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM MEETING_PARTICIPANTS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//     const result = await conn.execute(`DELETE FROM MEETINGS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════ LOOKUPS (for form dropdowns) ═══════════════════
// export const getDepartments = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT DEPARTMENT_ID, DEPARTMENT_NAME, DEPARTMENT_CODE
//        FROM DEPARTMENTS
//        ORDER BY DEPARTMENT_NAME`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getEmployees = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT EMPLOYEE_ID, FIRST_NAME, LAST_NAME, EMAIL, JOB_TITLE, DEPARTMENT_ID
//        FROM EMPLOYEES
//        WHERE IS_ACTIVE = 'Y'
//        ORDER BY FIRST_NAME, LAST_NAME`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getMeetingRooms = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT ROOM_ID, ROOM_NAME, LOCATION, CAPACITY, HAS_VIDEO_CONF
//        FROM MEETING_ROOMS
//        WHERE IS_ACTIVE = 'Y'
//        ORDER BY ROOM_NAME`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };



import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ MEETING (Header) ═══════════════════
// Creates a meeting + its participants + its agenda items + its minutes in ONE transaction.
// data shape expected from the form:
// {
//   title, description, organizerId, departmentId, roomId,
//   meetingType, virtualLink, startTime, endTime, status,
//   participants: [{ employeeId, role, rsvpStatus }],
//   agendaItems:  [{ itemOrder, topic, presenterId, durationMinutes }],
//   minutes:      [{ agendaItemIndex, authorId, notes }]
//     - agendaItemIndex is the POSITION of the item in the agendaItems array above
//       (null/"" = general/no-agenda-item minute), NOT a real AGENDA_ITEM_ID —
//       agenda items don't have real IDs yet at submit time since they're being
//       created in this same request.
// }
export const createMeeting = async (data) => {
  const conn = await getConnection();
  try {
    const meetingResult = await conn.execute(
      `INSERT INTO MEETINGS (
        TITLE, DESCRIPTION, ORGANIZER_ID, DEPARTMENT_ID, ROOM_ID,
        MEETING_TYPE, VIRTUAL_LINK, START_TIME, END_TIME, STATUS
      ) VALUES (
        :title, :description, :organizerId, :departmentId, :roomId,
        :meetingType, :virtualLink, :startTime, :endTime, :status
      ) RETURNING MEETING_ID INTO :outId`,
      {
        title:        data.title ?? null,
        description:  data.description ?? null,
        organizerId:  data.organizerId ?? null,
        departmentId: data.departmentId ?? null,
        roomId:       data.roomId ?? null,
        meetingType:  data.meetingType ?? 'IN_PERSON',
        virtualLink:  data.virtualLink ?? null,
        startTime:    data.startTime ? new Date(data.startTime) : null,
        endTime:      data.endTime ? new Date(data.endTime) : null,
        status:       data.status ?? 'SCHEDULED',
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    const meetingId = meetingResult.outBinds.outId[0];

    if (Array.isArray(data.participants) && data.participants.length > 0) {
      const participantBinds = data.participants.map((p) => ({
        meetingId,
        employeeId: p.employeeId ?? null,
        role:       p.role ?? 'ATTENDEE',
        rsvpStatus: p.rsvpStatus ?? 'PENDING',
      }));
      await conn.executeMany(
        `INSERT INTO MEETING_PARTICIPANTS (MEETING_ID, EMPLOYEE_ID, ROLE, RSVP_STATUS)
         VALUES (:meetingId, :employeeId, :role, :rsvpStatus)`,
        participantBinds,
        { autoCommit: false }
      );
    }

    // Agenda items inserted ONE BY ONE (not executeMany) so we can capture each
    // generated AGENDA_ITEM_ID — minutes below need it as a FK.
    const agendaItemIdByIndex = []; // local form index -> real AGENDA_ITEM_ID
    if (Array.isArray(data.agendaItems) && data.agendaItems.length > 0) {
      for (let idx = 0; idx < data.agendaItems.length; idx++) {
        const a = data.agendaItems[idx];
        const agendaResult = await conn.execute(
          `INSERT INTO AGENDA_ITEMS (MEETING_ID, ITEM_ORDER, TOPIC, PRESENTER_ID, DURATION_MINUTES)
           VALUES (:meetingId, :itemOrder, :topic, :presenterId, :durationMinutes)
           RETURNING AGENDA_ITEM_ID INTO :outId`,
          {
            meetingId,
            itemOrder:       a.itemOrder ?? idx + 1,
            topic:           a.topic ?? null,
            presenterId:     a.presenterId ?? null,
            durationMinutes: a.durationMinutes ?? null,
            outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          },
          { autoCommit: false }
        );
        agendaItemIdByIndex[idx] = agendaResult.outBinds.outId[0];
      }
    }

    // Minutes — same transaction, inserted after agenda items so the FK resolves.
    if (Array.isArray(data.minutes) && data.minutes.length > 0) {
      const minuteBinds = data.minutes
        .filter((m) => m.notes && m.notes.trim())
        .map((m) => ({
          meetingId,
          agendaItemId:
            m.agendaItemIndex !== null && m.agendaItemIndex !== '' && m.agendaItemIndex !== undefined
              ? agendaItemIdByIndex[m.agendaItemIndex] ?? null
              : null,
          authorId: m.authorId ?? null,
          notes:    m.notes.trim(),
        }));
      if (minuteBinds.length > 0) {
        await conn.executeMany(
          `INSERT INTO MEETING_MINUTES (MEETING_ID, AGENDA_ITEM_ID, AUTHOR_ID, NOTES)
           VALUES (:meetingId, :agendaItemId, :authorId, :notes)`,
          minuteBinds,
          { autoCommit: false }
        );
      }
    }

    await conn.commit();
    return { id: meetingId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const getAllMeetings = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         m.MEETING_ID,
         m.TITLE,
         m.MEETING_TYPE,
         m.STATUS,
         TO_CHAR(m.START_TIME, 'YYYY-MM-DD"T"HH24:MI:SS') AS START_TIME,
         TO_CHAR(m.END_TIME,   'YYYY-MM-DD"T"HH24:MI:SS') AS END_TIME,
         m.ORGANIZER_ID,
         e.FIRST_NAME || ' ' || e.LAST_NAME AS ORGANIZER_NAME,
         m.DEPARTMENT_ID,
         d.DEPARTMENT_NAME,
         m.ROOM_ID,
         r.ROOM_NAME
       FROM MEETINGS m
       LEFT JOIN EMPLOYEES e     ON e.EMPLOYEE_ID = m.ORGANIZER_ID
       LEFT JOIN DEPARTMENTS d   ON d.DEPARTMENT_ID = m.DEPARTMENT_ID
       LEFT JOIN MEETING_ROOMS r ON r.ROOM_ID = m.ROOM_ID
       ORDER BY m.MEETING_ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getMeetingById = async (id) => {
  const conn = await getConnection();
  try {
    const meetingResult = await conn.execute(
      `SELECT
         m.MEETING_ID,
         m.TITLE,
         m.DESCRIPTION,
         m.MEETING_TYPE,
         m.VIRTUAL_LINK,
         m.STATUS,
         TO_CHAR(m.START_TIME, 'YYYY-MM-DD"T"HH24:MI:SS') AS START_TIME,
         TO_CHAR(m.END_TIME,   'YYYY-MM-DD"T"HH24:MI:SS') AS END_TIME,
         m.ORGANIZER_ID,
         m.DEPARTMENT_ID,
         m.ROOM_ID
       FROM MEETINGS m
       WHERE m.MEETING_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const meeting = meetingResult.rows[0] ?? null;
    if (!meeting) return null;

    const participantsResult = await conn.execute(
      `SELECT
         p.PARTICIPANT_ID,
         p.EMPLOYEE_ID,
         e.FIRST_NAME || ' ' || e.LAST_NAME AS EMPLOYEE_NAME,
         p.ROLE,
         p.RSVP_STATUS
       FROM MEETING_PARTICIPANTS p
       JOIN EMPLOYEES e ON e.EMPLOYEE_ID = p.EMPLOYEE_ID
       WHERE p.MEETING_ID = :id
       ORDER BY p.PARTICIPANT_ID`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const agendaResult = await conn.execute(
      `SELECT
         a.AGENDA_ITEM_ID,
         a.ITEM_ORDER,
         a.TOPIC,
         a.PRESENTER_ID,
         e.FIRST_NAME || ' ' || e.LAST_NAME AS PRESENTER_NAME,
         a.DURATION_MINUTES,
         a.STATUS
       FROM AGENDA_ITEMS a
       LEFT JOIN EMPLOYEES e ON e.EMPLOYEE_ID = a.PRESENTER_ID
       WHERE a.MEETING_ID = :id
       ORDER BY a.ITEM_ORDER`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const minutesResult = await conn.execute(
      `SELECT
         mm.MINUTE_ID,
         mm.AGENDA_ITEM_ID,
         a.TOPIC AS AGENDA_TOPIC,
         mm.AUTHOR_ID,
         e.FIRST_NAME || ' ' || e.LAST_NAME AS AUTHOR_NAME,
         TO_CHAR(mm.CREATED_AT, 'DD-MON-YYYY') AS DATE_RECORDED,
         mm.NOTES
       FROM MEETING_MINUTES mm
       JOIN EMPLOYEES e         ON e.EMPLOYEE_ID = mm.AUTHOR_ID
       LEFT JOIN AGENDA_ITEMS a ON a.AGENDA_ITEM_ID = mm.AGENDA_ITEM_ID
       WHERE mm.MEETING_ID = :id
       ORDER BY mm.MINUTE_ID`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      ...meeting,
      participants: participantsResult.rows,
      agendaItems: agendaResult.rows,
      minutes: minutesResult.rows,
    };
  } finally {
    await conn.close();
  }
};

// Full replace of a meeting's participants + agenda items + minutes along with the
// header — same delete-then-recreate approach kept inside one transaction.
export const updateMeeting = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE MEETINGS
         SET TITLE        = :title,
             DESCRIPTION  = :description,
             ORGANIZER_ID = :organizerId,
             DEPARTMENT_ID= :departmentId,
             ROOM_ID      = :roomId,
             MEETING_TYPE = :meetingType,
             VIRTUAL_LINK = :virtualLink,
             START_TIME   = :startTime,
             END_TIME     = :endTime,
             STATUS       = :status,
             UPDATED_AT   = SYSTIMESTAMP
       WHERE MEETING_ID = :id`,
      {
        title:        data.title ?? null,
        description:  data.description ?? null,
        organizerId:  data.organizerId ?? null,
        departmentId: data.departmentId ?? null,
        roomId:       data.roomId ?? null,
        meetingType:  data.meetingType ?? 'IN_PERSON',
        virtualLink:  data.virtualLink ?? null,
        startTime:    data.startTime ? new Date(data.startTime) : null,
        endTime:      data.endTime ? new Date(data.endTime) : null,
        status:       data.status ?? 'SCHEDULED',
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Meeting not found.');

    if (Array.isArray(data.participants)) {
      await conn.execute(`DELETE FROM MEETING_PARTICIPANTS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
      if (data.participants.length > 0) {
        const participantBinds = data.participants.map((p) => ({
          meetingId: id,
          employeeId: p.employeeId ?? null,
          role:       p.role ?? 'ATTENDEE',
          rsvpStatus: p.rsvpStatus ?? 'PENDING',
        }));
        await conn.executeMany(
          `INSERT INTO MEETING_PARTICIPANTS (MEETING_ID, EMPLOYEE_ID, ROLE, RSVP_STATUS)
           VALUES (:meetingId, :employeeId, :role, :rsvpStatus)`,
          participantBinds,
          { autoCommit: false }
        );
      }
    }

    // Minutes reference AGENDA_ITEM_ID via FK, so wipe minutes BEFORE agenda items
    // are deleted/recreated, then recreate agenda items (capturing new IDs), then
    // recreate minutes pointing at the new IDs.
    await conn.execute(`DELETE FROM MEETING_MINUTES WHERE MEETING_ID = :id`, { id }, { autoCommit: false });

    const agendaItemIdByIndex = [];
    if (Array.isArray(data.agendaItems)) {
      await conn.execute(`DELETE FROM AGENDA_ITEMS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
      for (let idx = 0; idx < data.agendaItems.length; idx++) {
        const a = data.agendaItems[idx];
        const agendaResult = await conn.execute(
          `INSERT INTO AGENDA_ITEMS (MEETING_ID, ITEM_ORDER, TOPIC, PRESENTER_ID, DURATION_MINUTES)
           VALUES (:meetingId, :itemOrder, :topic, :presenterId, :durationMinutes)
           RETURNING AGENDA_ITEM_ID INTO :outId`,
          {
            meetingId: id,
            itemOrder:       a.itemOrder ?? idx + 1,
            topic:           a.topic ?? null,
            presenterId:     a.presenterId ?? null,
            durationMinutes: a.durationMinutes ?? null,
            outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          },
          { autoCommit: false }
        );
        agendaItemIdByIndex[idx] = agendaResult.outBinds.outId[0];
      }
    }

    if (Array.isArray(data.minutes) && data.minutes.length > 0) {
      const minuteBinds = data.minutes
        .filter((m) => m.notes && m.notes.trim())
        .map((m) => ({
          meetingId: id,
          agendaItemId:
            m.agendaItemIndex !== null && m.agendaItemIndex !== '' && m.agendaItemIndex !== undefined
              ? agendaItemIdByIndex[m.agendaItemIndex] ?? null
              : null,
          authorId: m.authorId ?? null,
          notes:    m.notes.trim(),
        }));
      if (minuteBinds.length > 0) {
        await conn.executeMany(
          `INSERT INTO MEETING_MINUTES (MEETING_ID, AGENDA_ITEM_ID, AUTHOR_ID, NOTES)
           VALUES (:meetingId, :agendaItemId, :authorId, :notes)`,
          minuteBinds,
          { autoCommit: false }
        );
      }
    }

    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteMeeting = async (id) => {
  const conn = await getConnection();
  try {
    // cascade: notifications / attachments / action items / minutes / agenda items / participants -> meeting
    await conn.execute(`DELETE FROM NOTIFICATIONS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM ATTACHMENTS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM ACTION_ITEMS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM MEETING_MINUTES WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM AGENDA_ITEMS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM MEETING_PARTICIPANTS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
    const result = await conn.execute(`DELETE FROM MEETINGS WHERE MEETING_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ LOOKUPS (for form dropdowns) ═══════════════════
export const getDepartments = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DEPARTMENT_ID, DEPARTMENT_NAME, DEPARTMENT_CODE
       FROM DEPARTMENTS
       ORDER BY DEPARTMENT_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getEmployees = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT EMPLOYEE_ID, FIRST_NAME, LAST_NAME, EMAIL, JOB_TITLE, DEPARTMENT_ID
       FROM EMPLOYEES
       WHERE IS_ACTIVE = 'Y'
       ORDER BY FIRST_NAME, LAST_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getMeetingRooms = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ROOM_ID, ROOM_NAME, LOCATION, CAPACITY, HAS_VIDEO_CONF
       FROM MEETING_ROOMS
       WHERE IS_ACTIVE = 'Y'
       ORDER BY ROOM_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};