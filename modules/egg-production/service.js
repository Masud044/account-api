

// import { getConnection, oracledb } from '../../config/db.js';

// // ─── INSERT ───────────────────────────────────────────────────────────────────
// export const createEggProduction = async (data) => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       INSERT INTO EGG_PRODUCTION (
//         PRODUCTION_DATE, QTY, REJECT_QTY, REMARKS, CREATION_BY
//       ) VALUES (
//         TO_DATE(:productionDate, 'YYYY-MM-DD'), :qty, :rejectQty, :remarks, :creationBy
//       )
//       RETURNING ID INTO :outId
//     `;
//     const binds = {
//       productionDate: data.productionDate,
//       qty:            data.qty ?? 0,
//       rejectQty:      data.rejectQty ?? 0,
//       remarks:        data.remarks ?? null,
//       creationBy:     data.creationBy ?? null,
//       outId:          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//     };
//     const result = await conn.execute(sql, binds, { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return { rowsAffected: result.rowsAffected, id: result.outBinds.outId[0] };
//   } finally {
//     await conn.close();
//   }
// };

// // ─── UPDATE ───────────────────────────────────────────────────────────────────
// export const updateEggProduction = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     // ✅ Duplicate date check — same record বাদ দিয়ে
//     const checkResult = await conn.execute(
//       `SELECT COUNT(*) AS CNT
//        FROM EGG_PRODUCTION
//        WHERE TRUNC(PRODUCTION_DATE) = TO_DATE(:productionDate, 'YYYY-MM-DD')
//          AND ID != :id`,
//       { productionDate: data.productionDate, id: Number(id) },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const cnt = Number(checkResult.rows[0]?.CNT ?? 0);
//     if (cnt > 0) {
//       throw new Error(`A record for date ${data.productionDate} already exists.`);
//     }

//     // ✅ UPDATED_BY — NUMBER column, তাই null বা number পাঠাতে হবে
//     const updatedBy = data.updatedBy ? Number(data.updatedBy) : null;

//     const result = await conn.execute(
//       `UPDATE EGG_PRODUCTION SET
//          PRODUCTION_DATE = TO_DATE(:productionDate, 'YYYY-MM-DD'),
//          QTY             = :qty,
//          REJECT_QTY      = :rejectQty,
//          REMARKS         = :remarks,
//          UPDATED_BY      = :updatedBy,
//          UPDATE_DATE     = SYSDATE
//        WHERE ID = :id`,
//       {
//         id:             Number(id),
//         productionDate: data.productionDate,
//         qty:            Number(data.qty),
//         rejectQty:      data.rejectQty != null ? Number(data.rejectQty) : 0,
//         remarks:        data.remarks || null,
//         updatedBy:      updatedBy,
//       },
//       { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return { rowsAffected: result.rowsAffected };
//   } finally {
//     await conn.close();
//   }
// };

// // ─── GET ALL (paginated) ──────────────────────────────────────────────────────
// export const getAllEggProduction = async ({ page = 1, limit = 20, excludeInvoiced = false } = {}) => {
//   const conn = await getConnection();
//   try {
//     const invoicedFilter = excludeInvoiced
//       ? `WHERE NOT EXISTS (SELECT 1 FROM SAL_INVOICE_L l WHERE l.PRODUTION_ID = eg.ID)`
//       : '';

//     // limit=0 মানে সব আনবে
//     if (!limit || limit === 0) {
//       const sql = `
//         SELECT
//           ID,
//           TO_CHAR(PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
//           QTY, REJECT_QTY, REMARKS,
//           TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
//           TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
//           CREATION_BY, UPDATED_BY
//         FROM EGG_PRODUCTION eg
//         ${invoicedFilter}
//         ORDER BY PRODUCTION_DATE DESC, ID DESC
//       `;
//       const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       return result.rows;
//     }

//     const offset = (page - 1) * limit;
//     const sql = `
//       SELECT * FROM (
//         SELECT
//           eg.ID,
//           TO_CHAR(eg.PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
//           eg.QTY, eg.REJECT_QTY, eg.REMARKS,
//           TO_CHAR(eg.CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
//           TO_CHAR(eg.UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
//           eg.CREATION_BY, eg.UPDATED_BY,
//           ROWNUM AS RN
//         FROM EGG_PRODUCTION eg
//         ${invoicedFilter}
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

// // ─── GET SINGLE ───────────────────────────────────────────────────────────────
// export const getEggProductionById = async (id) => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         ID,
//         TO_CHAR(PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
//         QTY,
//         REJECT_QTY,
//         REMARKS,
//         TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
//         TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
//         CREATION_BY,
//         UPDATED_BY
//       FROM EGG_PRODUCTION
//       WHERE ID = :id
//     `;
//     const result = await conn.execute(sql, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── DELETE ───────────────────────────────────────────────────────────────────
// export const deleteEggProduction = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `DELETE FROM EGG_PRODUCTION WHERE ID = :id`,
//       { id },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return { rowsAffected: result.rowsAffected };
//   } finally {
//     await conn.close();
//   }
// };

// // ─── GET BY DATE RANGE ────────────────────────────────────────────────────────
// export const getEggProductionByDateRange = async (fromDate, toDate) => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         ID,
//         TO_CHAR(PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
//         QTY,
//         REJECT_QTY,
//         REMARKS,
//         TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
//         TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
//         CREATION_BY,
//         UPDATED_BY
//       FROM EGG_PRODUCTION
//       WHERE PRODUCTION_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')
//         AND PRODUCTION_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')
//       ORDER BY PRODUCTION_DATE DESC, ID DESC
//     `;
//     const result = await conn.execute(
//       sql,
//       { fromDate, toDate },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };


// // ─── GET MONTHLY SUMMARY ──────────────────────────────────────────────────────
// // Returns total QTY grouped by month (YYYY-MM) for a given year
// export const getMonthlyProduction = async (year) => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         TO_CHAR(PRODUCTION_DATE, 'YYYY-MM') AS MONTH,
//         SUM(QTY)                            AS TOTAL_QTY,
//         COUNT(*)                            AS RECORD_COUNT,
//         ROUND(AVG(QTY), 0)                  AS AVG_DAILY_QTY
//       FROM EGG_PRODUCTION
//       WHERE EXTRACT(YEAR FROM PRODUCTION_DATE) = :year
//       GROUP BY TO_CHAR(PRODUCTION_DATE, 'YYYY-MM')
//       ORDER BY MONTH ASC
//     `;
//     const result = await conn.execute(
//       sql,
//       { year: Number(year) },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getMonthlySummaryWithAvg = async (year) => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         TO_CHAR(PRODUCTION_DATE, 'Mon')     AS MONTH_LABEL,
//         TO_CHAR(PRODUCTION_DATE, 'MM')      AS MONTH_NUM,
//         SUM(QTY)                            AS TOTAL_QTY,
//         ROUND(AVG(QTY), 0)                  AS AVG_DAILY_QTY,
//         COUNT(*)                            AS RECORD_COUNT
//       FROM EGG_PRODUCTION
//       WHERE EXTRACT(YEAR FROM PRODUCTION_DATE) = :year
//       GROUP BY
//         TO_CHAR(PRODUCTION_DATE, 'Mon'),
//         TO_CHAR(PRODUCTION_DATE, 'MM')
//       ORDER BY MONTH_NUM ASC
//     `;
//     const result = await conn.execute(
//       sql,
//       { year: Number(year) },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getDailyTrend = async (year, month) => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         TO_CHAR(PRODUCTION_DATE, 'DD Mon') AS DAY_LABEL,
//         TO_CHAR(PRODUCTION_DATE, 'DD')     AS DAY_NUM,
//         QTY
//       FROM EGG_PRODUCTION
//       WHERE EXTRACT(YEAR  FROM PRODUCTION_DATE) = :year
//         AND EXTRACT(MONTH FROM PRODUCTION_DATE) = :month
//       ORDER BY PRODUCTION_DATE ASC
//     `;
//     const result = await conn.execute(
//       sql,
//       { year: Number(year), month: Number(month) },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };


import { getConnection, oracledb } from '../../config/db.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// Free-text shed: trim, extra space remove, uppercase
const normalizeShed = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

// ─── INSERT ───────────────────────────────────────────────────────────────────
export const createEggProduction = async (data) => {
  const conn = await getConnection();
  try {
    const shed = normalizeShed(data.shed);
    if (!shed) throw new Error('Shed is required.');

    // Duplicate check — same date + same shed
    const check = await conn.execute(
      `SELECT COUNT(*) AS CNT
       FROM EGG_PRODUCTION
       WHERE TRUNC(PRODUCTION_DATE) = TO_DATE(:productionDate, 'YYYY-MM-DD')
         AND SHED = :shed`,
      { productionDate: data.productionDate, shed },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (Number(check.rows[0]?.CNT ?? 0) > 0) {
      throw new Error(`A record for shed ${shed} on ${data.productionDate} already exists.`);
    }

    const sql = `
      INSERT INTO EGG_PRODUCTION (
        PRODUCTION_DATE, SHED, QTY, REJECT_QTY, REMARKS, CREATION_BY
      ) VALUES (
        TO_DATE(:productionDate, 'YYYY-MM-DD'), :shed, :qty, :rejectQty, :remarks, :creationBy
      )
      RETURNING ID INTO :outId
    `;
    const binds = {
      productionDate: data.productionDate,
      shed,
      qty:            data.qty ?? 0,
      rejectQty:      data.rejectQty ?? 0,
      remarks:        data.remarks ?? null,
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
    const shed = normalizeShed(data.shed);
    if (!shed) throw new Error('Shed is required.');

    // ✅ Duplicate check — same date + same shed, nijer record badh diye
    const checkResult = await conn.execute(
      `SELECT COUNT(*) AS CNT
       FROM EGG_PRODUCTION
       WHERE TRUNC(PRODUCTION_DATE) = TO_DATE(:productionDate, 'YYYY-MM-DD')
         AND SHED = :shed
         AND ID != :id`,
      { productionDate: data.productionDate, shed, id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const cnt = Number(checkResult.rows[0]?.CNT ?? 0);
    if (cnt > 0) {
      throw new Error(`A record for shed ${shed} on ${data.productionDate} already exists.`);
    }

    // ✅ UPDATED_BY — NUMBER column, তাই null বা number পাঠাতে হবে
    const updatedBy = data.updatedBy ? Number(data.updatedBy) : null;

    const result = await conn.execute(
      `UPDATE EGG_PRODUCTION SET
         PRODUCTION_DATE = TO_DATE(:productionDate, 'YYYY-MM-DD'),
         SHED            = :shed,
         QTY             = :qty,
         REJECT_QTY      = :rejectQty,
         REMARKS         = :remarks,
         UPDATED_BY      = :updatedBy,
         UPDATE_DATE     = SYSDATE
       WHERE ID = :id`,
      {
        id:             Number(id),
        productionDate: data.productionDate,
        shed,
        qty:            Number(data.qty),
        rejectQty:      data.rejectQty != null ? Number(data.rejectQty) : 0,
        remarks:        data.remarks || null,
        updatedBy:      updatedBy,
      },
      { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── GET ALL (paginated) ──────────────────────────────────────────────────────
export const getAllEggProduction = async ({
  page = 1,
  limit = 20,
  excludeInvoiced = false,
  shed = null,
} = {}) => {
  const conn = await getConnection();
  try {
    const conditions = [];
    const binds = {};

    if (excludeInvoiced) {
      conditions.push(`NOT EXISTS (SELECT 1 FROM SAL_INVOICE_L l WHERE l.PRODUTION_ID = eg.ID)`);
    }
    const shedVal = normalizeShed(shed);
    if (shedVal) {
      conditions.push(`eg.SHED = :shed`);
      binds.shed = shedVal;
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // limit=0 মানে সব আনবে
    if (!limit || limit === 0) {
      const sql = `
        SELECT
          eg.ID,
          eg.SHED,
          TO_CHAR(eg.PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
          eg.QTY, eg.REJECT_QTY, eg.REMARKS,
          TO_CHAR(eg.CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
          TO_CHAR(eg.UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
          eg.CREATION_BY, eg.UPDATED_BY
        FROM EGG_PRODUCTION eg
        ${whereClause}
        ORDER BY eg.PRODUCTION_DATE DESC, eg.SHED, eg.ID DESC
      `;
      const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return result.rows;
    }

    const offset = (page - 1) * limit;
    const sql = `
      SELECT * FROM (
        SELECT x.*, ROWNUM AS RN
        FROM (
          SELECT
            eg.ID,
            eg.SHED,
            TO_CHAR(eg.PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
            eg.QTY, eg.REJECT_QTY, eg.REMARKS,
            TO_CHAR(eg.CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
            TO_CHAR(eg.UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
            eg.CREATION_BY, eg.UPDATED_BY
          FROM EGG_PRODUCTION eg
          ${whereClause}
          ORDER BY eg.PRODUCTION_DATE DESC, eg.SHED, eg.ID DESC
        ) x
      )
      WHERE RN > :offset AND RN <= :endRow
    `;
    const result = await conn.execute(
      sql,
      { ...binds, offset, endRow: offset + limit },
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
        SHED,
        TO_CHAR(PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
        QTY,
        REJECT_QTY,
        REMARKS,
        TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
        TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
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
export const getEggProductionByDateRange = async (fromDate, toDate, shed = null) => {
  const conn = await getConnection();
  try {
    const binds = { fromDate, toDate };
    let shedClause = '';
    const shedVal = normalizeShed(shed);
    if (shedVal) {
      shedClause = `AND SHED = :shed`;
      binds.shed = shedVal;
    }

    const sql = `
      SELECT
        ID,
        SHED,
        TO_CHAR(PRODUCTION_DATE, 'YYYY-MM-DD')          AS PRODUCTION_DATE,
        QTY,
        REJECT_QTY,
        REMARKS,
        TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS')  AS CREATION_DATE,
        TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS')    AS UPDATE_DATE,
        CREATION_BY,
        UPDATED_BY
      FROM EGG_PRODUCTION
      WHERE PRODUCTION_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')
        AND PRODUCTION_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')
        ${shedClause}
      ORDER BY PRODUCTION_DATE DESC, SHED, ID DESC
    `;
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET MONTHLY SUMMARY ──────────────────────────────────────────────────────
// Returns total QTY grouped by month (YYYY-MM) for a given year (optional shed)
export const getMonthlyProduction = async (year, shed = null) => {
  const conn = await getConnection();
  try {
    const binds = { year: Number(year) };
    let shedClause = '';
    const shedVal = normalizeShed(shed);
    if (shedVal) {
      shedClause = `AND SHED = :shed`;
      binds.shed = shedVal;
    }

    const sql = `
      SELECT
        TO_CHAR(PRODUCTION_DATE, 'YYYY-MM') AS MONTH,
        SUM(QTY)                            AS TOTAL_QTY,
        COUNT(*)                            AS RECORD_COUNT,
        ROUND(AVG(QTY), 0)                  AS AVG_DAILY_QTY
      FROM EGG_PRODUCTION
      WHERE EXTRACT(YEAR FROM PRODUCTION_DATE) = :year
        ${shedClause}
      GROUP BY TO_CHAR(PRODUCTION_DATE, 'YYYY-MM')
      ORDER BY MONTH ASC
    `;
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getMonthlySummaryWithAvg = async (year, shed = null) => {
  const conn = await getConnection();
  try {
    const binds = { year: Number(year) };
    let shedClause = '';
    const shedVal = normalizeShed(shed);
    if (shedVal) {
      shedClause = `AND SHED = :shed`;
      binds.shed = shedVal;
    }

    const sql = `
      SELECT
        TO_CHAR(PRODUCTION_DATE, 'Mon')     AS MONTH_LABEL,
        TO_CHAR(PRODUCTION_DATE, 'MM')      AS MONTH_NUM,
        SUM(QTY)                            AS TOTAL_QTY,
        ROUND(AVG(QTY), 0)                  AS AVG_DAILY_QTY,
        COUNT(*)                            AS RECORD_COUNT
      FROM EGG_PRODUCTION
      WHERE EXTRACT(YEAR FROM PRODUCTION_DATE) = :year
        ${shedClause}
      GROUP BY
        TO_CHAR(PRODUCTION_DATE, 'Mon'),
        TO_CHAR(PRODUCTION_DATE, 'MM')
      ORDER BY MONTH_NUM ASC
    `;
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getDailyTrend = async (year, month, shed = null) => {
  const conn = await getConnection();
  try {
    const binds = { year: Number(year), month: Number(month) };
    let shedClause = '';
    const shedVal = normalizeShed(shed);
    if (shedVal) {
      shedClause = `AND SHED = :shed`;
      binds.shed = shedVal;
    }

    const sql = `
      SELECT
        TO_CHAR(PRODUCTION_DATE, 'DD Mon') AS DAY_LABEL,
        TO_CHAR(PRODUCTION_DATE, 'DD')     AS DAY_NUM,
        SUM(QTY)                           AS QTY
      FROM EGG_PRODUCTION
      WHERE EXTRACT(YEAR  FROM PRODUCTION_DATE) = :year
        AND EXTRACT(MONTH FROM PRODUCTION_DATE) = :month
        ${shedClause}
      GROUP BY PRODUCTION_DATE, TO_CHAR(PRODUCTION_DATE, 'DD Mon'), TO_CHAR(PRODUCTION_DATE, 'DD')
      ORDER BY PRODUCTION_DATE ASC
    `;
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── DISTINCT SHED LIST (datalist suggestion / filter dropdown) ───────────────
export const getShedList = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DISTINCT SHED FROM EGG_PRODUCTION WHERE SHED IS NOT NULL ORDER BY SHED`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows.map((r) => r.SHED);
  } finally {
    await conn.close();
  }
};