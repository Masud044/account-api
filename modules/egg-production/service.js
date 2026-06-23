
import { getConnection, oracledb } from '../../config/db.js';

// ─── INSERT ───────────────────────────────────────────────────────────────────
export const createEggProduction = async (data) => {
  const conn = await getConnection();
  try {
    const sql = `
      INSERT INTO EGG_PRODUCTION (
        PRODUCTION_DATE, QTY, CREATION_BY
      ) VALUES (
        TO_DATE(:productionDate, 'YYYY-MM-DD'), :qty, :creationBy
      )
      RETURNING ID INTO :outId
    `;
    const binds = {
      productionDate: data.productionDate,
      qty:            data.qty ?? 0,
      creationBy:     data.creationBy ?? null,
      outId:          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    };
    const result = await conn.execute(sql, binds, { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
    return { rowsAffected: result.rowsAffected, id: result.outBinds.outId[0] };
  } finally {
    await conn.close();
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateEggProduction = async (id, data) => {
  const conn = await getConnection();
  try {
    const sql = `
      UPDATE EGG_PRODUCTION SET
        PRODUCTION_DATE = TO_DATE(:productionDate, 'YYYY-MM-DD'),
        QTY             = :qty,
        UPDATED_BY      = :updatedBy,
        UPDATE_DATE     = SYSDATE
      WHERE ID = :id
    `;
    const binds = {
      id,
      productionDate: data.productionDate,
      qty:            data.qty,
      updatedBy:      data.updatedBy,
    };
    const result = await conn.execute(sql, binds, { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── GET ALL (paginated) ──────────────────────────────────────────────────────
// export const getAllEggProduction = async ({ page = 1, limit = 20 } = {}) => {
//   const conn = await getConnection();
//   try {
//     const offset = (page - 1) * limit;

//     const sql = `
//       SELECT *
//       FROM (
//         SELECT
//           eg.ID,
//           eg.PRODUCTION_DATE,
//           eg.QTY,
//           eg.CREATION_DATE,
//           eg.UPDATE_DATE,
//           eg.CREATION_BY,
//           eg.UPDATED_BY,
//           ROWNUM AS RN
//         FROM EGG_PRODUCTION eg
//         ORDER BY eg.PRODUCTION_DATE DESC, eg.ID DESC
//       )
//       WHERE RN > :offset AND RN <= :endRow
//     `;

//     const result = await conn.execute(
//       sql,
//       { offset, endRow: offset + limit },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

export const getAllEggProduction = async ({ page = 1, limit = 20 } = {}) => {
  const conn = await getConnection();
  try {
    // ✅ limit=0 মানে সব আনবে
    if (!limit || limit === 0) {
      const sql = `
        SELECT
          ID, PRODUCTION_DATE, QTY,
          CREATION_DATE, UPDATE_DATE,
          CREATION_BY, UPDATED_BY
        FROM EGG_PRODUCTION
        ORDER BY PRODUCTION_DATE DESC, ID DESC
      `;
      const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return result.rows;
    }

    const offset = (page - 1) * limit;
    const sql = `
      SELECT * FROM (
        SELECT
          eg.ID, eg.PRODUCTION_DATE, eg.QTY,
          eg.CREATION_DATE, eg.UPDATE_DATE,
          eg.CREATION_BY, eg.UPDATED_BY,
          ROWNUM AS RN
        FROM EGG_PRODUCTION eg
        ORDER BY eg.PRODUCTION_DATE DESC, eg.ID DESC
      )
      WHERE RN > :offset AND RN <= :endRow
    `;
    const result = await conn.execute(
      sql,
      { offset, endRow: offset + limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE ───────────────────────────────────────────────────────────────
export const getEggProductionById = async (id) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        ID,
        PRODUCTION_DATE,
        QTY,
        CREATION_DATE,
        UPDATE_DATE,
        CREATION_BY,
        UPDATED_BY
      FROM EGG_PRODUCTION
      WHERE ID = :id
    `;
    const result = await conn.execute(sql, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteEggProduction = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM EGG_PRODUCTION WHERE ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── GET BY DATE RANGE ────────────────────────────────────────────────────────
export const getEggProductionByDateRange = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        ID,
        PRODUCTION_DATE,
        QTY,
        CREATION_DATE,
        UPDATE_DATE,
        CREATION_BY,
        UPDATED_BY
      FROM EGG_PRODUCTION
      WHERE PRODUCTION_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')
        AND PRODUCTION_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')
      ORDER BY PRODUCTION_DATE DESC, ID DESC
    `;
    const result = await conn.execute(
      sql,
      { fromDate, toDate },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};


// ─── GET MONTHLY SUMMARY ──────────────────────────────────────────────────────
// Add this function to your existing service.js file
// Returns total QTY grouped by month (YYYY-MM) for a given year
export const getMonthlyProduction = async (year) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        TO_CHAR(PRODUCTION_DATE, 'YYYY-MM') AS MONTH,
        SUM(QTY)                            AS TOTAL_QTY,
        COUNT(*)                            AS RECORD_COUNT,
        ROUND(AVG(QTY), 0)                  AS AVG_DAILY_QTY
      FROM EGG_PRODUCTION
      WHERE EXTRACT(YEAR FROM PRODUCTION_DATE) = :year
      GROUP BY TO_CHAR(PRODUCTION_DATE, 'YYYY-MM')
      ORDER BY MONTH ASC
    `;
    const result = await conn.execute(
      sql,
      { year: Number(year) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// service.js এর একদম শেষে paste করো

export const getMonthlySummaryWithAvg = async (year) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        TO_CHAR(PRODUCTION_DATE, 'Mon')     AS MONTH_LABEL,
        TO_CHAR(PRODUCTION_DATE, 'MM')      AS MONTH_NUM,
        SUM(QTY)                            AS TOTAL_QTY,
        ROUND(AVG(QTY), 0)                  AS AVG_DAILY_QTY,
        COUNT(*)                            AS RECORD_COUNT
      FROM EGG_PRODUCTION
      WHERE EXTRACT(YEAR FROM PRODUCTION_DATE) = :year
      GROUP BY
        TO_CHAR(PRODUCTION_DATE, 'Mon'),
        TO_CHAR(PRODUCTION_DATE, 'MM')
      ORDER BY MONTH_NUM ASC
    `;
    const result = await conn.execute(
      sql,
      { year: Number(year) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getDailyTrend = async (year, month) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        TO_CHAR(PRODUCTION_DATE, 'DD Mon') AS DAY_LABEL,
        TO_CHAR(PRODUCTION_DATE, 'DD')     AS DAY_NUM,
        QTY
      FROM EGG_PRODUCTION
      WHERE EXTRACT(YEAR  FROM PRODUCTION_DATE) = :year
        AND EXTRACT(MONTH FROM PRODUCTION_DATE) = :month
      ORDER BY PRODUCTION_DATE ASC
    `;
    const result = await conn.execute(
      sql,
      { year: Number(year), month: Number(month) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

