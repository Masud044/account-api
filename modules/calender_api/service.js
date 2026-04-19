import { withConnection, oracledb } from "../../config/db.js";

export async function getCalendar(filters) {
  return withConnection(async (connection) => {
    let sql = `SELECT DAY_ID, TO_CHAR(DAY, 'YYYY-MM-DD') AS DAY, HOLIDAY_DESCRIPTION, WORKING_STATUS,
      LAST_UPDATED_BY, TO_CHAR(LAST_UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS LAST_UPDATED_DATE, MONTH_ID, DAY_NAME
      FROM BWAL.PM_CALENDAR_T WHERE 1=1`;
    const binds = {};
    if (filters.day_id) {
      sql += " AND DAY_ID = :day_id";
      binds.day_id = Number(filters.day_id);
    }
    if (filters.month_id) {
      sql += " AND MONTH_ID = :month_id";
      binds.month_id = Number(filters.month_id);
    }
    if (filters.day) {
      sql += " AND TRUNC(DAY) = TO_DATE(:day, 'YYYY-MM-DD')";
      binds.day = filters.day;
    }
    sql += " ORDER BY DAY ASC";
    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  });
}
