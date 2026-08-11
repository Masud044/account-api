import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ DEPARTMENTS ═══════════════════
export const createDepartment = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO DEPARTMENTS (
        DEPARTMENT_NAME, DEPARTMENT_CODE
      ) VALUES (
        :departmentName, :departmentCode
      ) RETURNING DEPARTMENT_ID INTO :outId`,
      {
        departmentName: data.departmentName ?? null,
        departmentCode: data.departmentCode ?? null,
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

export const getAllDepartments = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DEPARTMENT_ID, DEPARTMENT_NAME, DEPARTMENT_CODE,
              TO_CHAR(CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT
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

export const getDepartmentById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DEPARTMENT_ID, DEPARTMENT_NAME, DEPARTMENT_CODE,
              TO_CHAR(CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT
       FROM DEPARTMENTS
       WHERE DEPARTMENT_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateDepartment = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE DEPARTMENTS
         SET DEPARTMENT_NAME = :departmentName,
             DEPARTMENT_CODE = :departmentCode
       WHERE DEPARTMENT_ID = :id`,
      {
        departmentName: data.departmentName ?? null,
        departmentCode: data.departmentCode ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Department not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// Hard delete — DEPARTMENTS has no IS_ACTIVE flag. If EMPLOYEES/MEETINGS still
// reference this department, Oracle raises an FK violation which bubbles up
// as err.message (caught by the controller) rather than being swallowed here.
export const deleteDepartment = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM DEPARTMENTS WHERE DEPARTMENT_ID = :id`,
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

// ═══════════════════ EMPLOYEES ═══════════════════
export const createEmployee = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO EMPLOYEES (
        FIRST_NAME, LAST_NAME, EMAIL, PHONE, JOB_TITLE, DEPARTMENT_ID, MANAGER_ID, IS_ACTIVE
      ) VALUES (
        :firstName, :lastName, :email, :phone, :jobTitle, :departmentId, :managerId, :isActive
      ) RETURNING EMPLOYEE_ID INTO :outId`,
      {
        firstName:    data.firstName ?? null,
        lastName:     data.lastName ?? null,
        email:        data.email ?? null,
        phone:        data.phone ?? null,
        jobTitle:     data.jobTitle ?? null,
        departmentId: data.departmentId ?? null,
        managerId:    data.managerId ?? null,
        isActive:     data.isActive ?? 'Y',
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

// includeInactive=true shows everyone (Setup list page); false (default) is
// used by the meeting-form dropdowns so deactivated staff don't show up there.
export const getAllEmployees = async (includeInactive = false) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         e.EMPLOYEE_ID, e.FIRST_NAME, e.LAST_NAME, e.EMAIL, e.PHONE, e.JOB_TITLE,
         e.DEPARTMENT_ID, d.DEPARTMENT_NAME,
         e.MANAGER_ID, m.FIRST_NAME || ' ' || m.LAST_NAME AS MANAGER_NAME,
         e.IS_ACTIVE
       FROM EMPLOYEES e
       LEFT JOIN DEPARTMENTS d ON d.DEPARTMENT_ID = e.DEPARTMENT_ID
       LEFT JOIN EMPLOYEES m ON m.EMPLOYEE_ID = e.MANAGER_ID
       ${includeInactive ? '' : "WHERE e.IS_ACTIVE = 'Y'"}
       ORDER BY e.FIRST_NAME, e.LAST_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getEmployeeById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         e.EMPLOYEE_ID, e.FIRST_NAME, e.LAST_NAME, e.EMAIL, e.PHONE, e.JOB_TITLE,
         e.DEPARTMENT_ID, d.DEPARTMENT_NAME,
         e.MANAGER_ID, m.FIRST_NAME || ' ' || m.LAST_NAME AS MANAGER_NAME,
         e.IS_ACTIVE
       FROM EMPLOYEES e
       LEFT JOIN DEPARTMENTS d ON d.DEPARTMENT_ID = e.DEPARTMENT_ID
       LEFT JOIN EMPLOYEES m ON m.EMPLOYEE_ID = e.MANAGER_ID
       WHERE e.EMPLOYEE_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateEmployee = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE EMPLOYEES
         SET FIRST_NAME    = :firstName,
             LAST_NAME     = :lastName,
             EMAIL         = :email,
             PHONE         = :phone,
             JOB_TITLE     = :jobTitle,
             DEPARTMENT_ID = :departmentId,
             MANAGER_ID    = :managerId
       WHERE EMPLOYEE_ID = :id`,
      {
        firstName:    data.firstName ?? null,
        lastName:     data.lastName ?? null,
        email:        data.email ?? null,
        phone:        data.phone ?? null,
        jobTitle:     data.jobTitle ?? null,
        departmentId: data.departmentId ?? null,
        managerId:    data.managerId ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Employee not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// Soft delete — flips IS_ACTIVE to 'N' instead of removing the row, since
// employees stay referenced from historical meetings/agenda items/minutes.
export const deactivateEmployee = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE EMPLOYEES SET IS_ACTIVE = 'N' WHERE EMPLOYEE_ID = :id`,
      { id },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Employee not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const reactivateEmployee = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE EMPLOYEES SET IS_ACTIVE = 'Y' WHERE EMPLOYEE_ID = :id`,
      { id },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Employee not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ MEETING ROOMS ═══════════════════
export const createMeetingRoom = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO MEETING_ROOMS (
        ROOM_NAME, LOCATION, CAPACITY, HAS_VIDEO_CONF, IS_ACTIVE
      ) VALUES (
        :roomName, :location, :capacity, :hasVideoConf, :isActive
      ) RETURNING ROOM_ID INTO :outId`,
      {
        roomName:     data.roomName ?? null,
        location:     data.location ?? null,
        capacity:     data.capacity ?? null,
        hasVideoConf: data.hasVideoConf ?? 'N',
        isActive:     data.isActive ?? 'Y',
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

export const getAllMeetingRooms = async (includeInactive = false) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ROOM_ID, ROOM_NAME, LOCATION, CAPACITY, HAS_VIDEO_CONF, IS_ACTIVE
       FROM MEETING_ROOMS
       ${includeInactive ? '' : "WHERE IS_ACTIVE = 'Y'"}
       ORDER BY ROOM_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getMeetingRoomById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ROOM_ID, ROOM_NAME, LOCATION, CAPACITY, HAS_VIDEO_CONF, IS_ACTIVE
       FROM MEETING_ROOMS
       WHERE ROOM_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateMeetingRoom = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE MEETING_ROOMS
         SET ROOM_NAME      = :roomName,
             LOCATION       = :location,
             CAPACITY       = :capacity,
             HAS_VIDEO_CONF = :hasVideoConf
       WHERE ROOM_ID = :id`,
      {
        roomName:     data.roomName ?? null,
        location:     data.location ?? null,
        capacity:     data.capacity ?? null,
        hasVideoConf: data.hasVideoConf ?? 'N',
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Meeting room not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// Soft delete — flips IS_ACTIVE to 'N'; historical meetings keep pointing at the room.
export const deactivateMeetingRoom = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE MEETING_ROOMS SET IS_ACTIVE = 'N' WHERE ROOM_ID = :id`,
      { id },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Meeting room not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const reactivateMeetingRoom = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE MEETING_ROOMS SET IS_ACTIVE = 'Y' WHERE ROOM_ID = :id`,
      { id },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Meeting room not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};