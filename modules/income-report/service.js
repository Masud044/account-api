// import oracledb from "oracledb";

// import { getConnection } from "../../config/db.js";

// // Income head = 4xxx code (query param `codePrefix` diye override kora jay)
// const DEFAULT_CODE_PREFIX = "4";
// const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// const httpError = (statusCode, message) => {
//   const err = new Error(message);
//   err.statusCode = statusCode;
//   return err;
// };

// const isValidDate = (s) => {
//   if (typeof s !== "string" || !DATE_RE.test(s)) return false;
//   const [y, m, d] = s.split("-").map(Number);
//   const dt = new Date(Date.UTC(y, m - 1, d));
//   return (
//     dt.getUTCFullYear() === y &&
//     dt.getUTCMonth() === m - 1 &&
//     dt.getUTCDate() === d
//   );
// };

// const buildMonthList = (from, to) => {
//   const months = [];
//   let [y, m] = from.slice(0, 7).split("-").map(Number);
//   const [ey, em] = to.slice(0, 7).split("-").map(Number);
//   while (y < ey || (y === ey && m <= em)) {
//     months.push(`${y}-${String(m).padStart(2, "0")}`);
//     m += 1;
//     if (m > 12) {
//       m = 1;
//       y += 1;
//     }
//   }
//   return months;
// };

// const normalize = (v) => {
//   if (v === undefined || v === null) return null;
//   const s = String(v).trim();
//   return s === "" || s.toLowerCase() === "all" ? null : s;
// };

// /* ------------------------------------------------------------------ */
// /* Filter options (dropdown) - sob data theke                          */
// /* ------------------------------------------------------------------ */
// export const getIncomeReportFilters = async ({ codePrefix } = {}) => {
//   const prefix = normalize(codePrefix) ?? DEFAULT_CODE_PREFIX;
//   let conn;
//   try {
//     conn = await getConnection();

//     const types = await conn.execute(
//       `SELECT DISTINCT VOUCHER_TYPE
//          FROM GLDATA
//         WHERE VOUCHER_TYPE IS NOT NULL
//         ORDER BY VOUCHER_TYPE`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const heads = await conn.execute(
//       `SELECT CODE, MAX(CODEDESCRIPTION) AS HEAD_NAME
//          FROM GLDATA
//         WHERE CODE LIKE :codeLike
//         GROUP BY CODE
//         ORDER BY CODE`,
//       { codeLike: `${prefix}%` },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return {
//       voucherTypes: types.rows.map((r) => r.VOUCHER_TYPE),
//       heads: heads.rows.map((r) => ({
//         code: r.CODE,
//         head: r.HEAD_NAME || r.CODE,
//       })),
//     };
//   } finally {
//     if (conn) await conn.close();
//   }
// };

// /* ------------------------------------------------------------------ */
// /* Income report                                                       */
// /* ------------------------------------------------------------------ */
// export const getIncomeReport = async (params = {}) => {
//   const fromDate = normalize(params.from);
//   const toDate = normalize(params.to);
//   const voucherType = normalize(params.voucherType);
//   const head = normalize(params.head); // head CODE
//   const codePrefix = normalize(params.codePrefix) ?? DEFAULT_CODE_PREFIX;

//   if (!isValidDate(fromDate) || !isValidDate(toDate)) {
//     throw httpError(400, "from ও to date দিতে হবে (format: YYYY-MM-DD)");
//   }
//   if (fromDate > toDate) {
//     throw httpError(400, "from date, to date এর পরে হতে পারবে না");
//   }

//   const binds = {
//     codeLike: `${codePrefix}%`,
//     fromDate,
//     toDate,
//   };

//   let extraWhere = "";
//   if (voucherType) {
//     extraWhere += " AND g.VOUCHER_TYPE = :voucherType";
//     binds.voucherType = voucherType;
//   }
//   if (head) {
//     extraWhere += " AND g.CODE = :head";
//     binds.head = head;
//   }

//   const sql = `
//     SELECT g.VOUCHERNO,
//            g.DESCRIPTIO,
//            g.DESCRIPTION,
//            g.VOUCHER_TYPE,
//            g.CODE,
//            NVL(h.HEAD_NAME, g.CODE)                       AS HEAD_NAME,
//            TO_CHAR(TRUNC(g.GL_ENTRY_DATE), 'YYYY-MM-DD')  AS GL_DATE,
//            TO_CHAR(TRUNC(g.TRANS_DATE),    'YYYY-MM-DD')  AS TRANS_DATE,
//            SUM(NVL(g.CREDIT, 0) - NVL(g.DEBIT, 0))        AS AMOUNT
//       FROM GLDATA g
//       LEFT JOIN (
//              SELECT CODE, MAX(CODEDESCRIPTION) AS HEAD_NAME
//                FROM GLDATA
//               WHERE CODEDESCRIPTION IS NOT NULL
//                 AND CODE LIKE :codeLike
//               GROUP BY CODE
//            ) h ON h.CODE = g.CODE
//      WHERE g.CODE LIKE :codeLike
//        AND TRUNC(g.GL_ENTRY_DATE) BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
//                                        AND TO_DATE(:toDate,   'YYYY-MM-DD')
//        ${extraWhere}
//      GROUP BY g.VOUCHERNO, g.DESCRIPTIO, g.DESCRIPTION, g.VOUCHER_TYPE,
//               g.CODE, h.HEAD_NAME,
//               TRUNC(g.GL_ENTRY_DATE), TRUNC(g.TRANS_DATE)
//      ORDER BY GL_DATE, g.VOUCHERNO, g.CODE`;

//   let conn;
//   try {
//     conn = await getConnection();
//     const result = await conn.execute(sql, binds, {
//       outFormat: oracledb.OUT_FORMAT_OBJECT,
//     });
//     const rows = result.rows || [];

//     /* ---------- details (+ cumulative) ---------- */
//     let running = 0;
//     const details = rows.map((r, i) => {
//       const amount = round2(r.AMOUNT);
//       running = round2(running + amount);
//       return {
//         sNo: i + 1,
//         glDate: r.GL_DATE,
//         transDate: r.TRANS_DATE,
//         voucherNo: r.VOUCHERNO,
//         voucherType: r.VOUCHER_TYPE,
//         shortDescription: r.DESCRIPTIO,
//         description: r.DESCRIPTION,
//         code: r.CODE,
//         head: r.HEAD_NAME,
//         amount,
//         cumulative: running,
//       };
//     });

//     const totalIncome = round2(details.reduce((s, d) => s + d.amount, 0));

//     /* ---------- KPIs (voucher-wise) ---------- */
//     const voucherTotals = new Map();
//     for (const d of details) {
//       voucherTotals.set(
//         d.voucherNo,
//         round2((voucherTotals.get(d.voucherNo) || 0) + d.amount)
//       );
//     }
//     const voucherCount = voucherTotals.size;
//     const kpis = {
//       totalIncome,
//       voucherCount,
//       averagePerVoucher: voucherCount ? round2(totalIncome / voucherCount) : 0,
//       largestVoucher: voucherCount
//         ? Math.max(...voucherTotals.values())
//         : 0,
//     };

//     /* ---------- by head ---------- */
//     const headMap = new Map();
//     for (const d of details) {
//       const cur = headMap.get(d.code) || {
//         code: d.code,
//         head: d.head,
//         amount: 0,
//       };
//       cur.amount = round2(cur.amount + d.amount);
//       headMap.set(d.code, cur);
//     }
//     const byHead = [...headMap.values()]
//       .sort((a, b) => a.code.localeCompare(b.code))
//       .map((h) => ({
//         ...h,
//         percent: totalIncome ? round2((h.amount / totalIncome) * 100) : 0,
//       }));
//     const byHeadTotal = round2(byHead.reduce((s, h) => s + h.amount, 0));

//     /* ---------- monthly (GL date অনুযায়ী) ---------- */
//     const months = buildMonthList(fromDate, toDate);
//     const monthlyMap = new Map();
//     for (const d of details) {
//       const key = d.glDate.slice(0, 7);
//       const row =
//         monthlyMap.get(d.code) ||
//         {
//           code: d.code,
//           head: d.head,
//           months: Object.fromEntries(months.map((m) => [m, 0])),
//           total: 0,
//         };
//       row.months[key] = round2((row.months[key] || 0) + d.amount);
//       row.total = round2(row.total + d.amount);
//       monthlyMap.set(d.code, row);
//     }
//     const monthlyRows = [...monthlyMap.values()].sort((a, b) =>
//       a.code.localeCompare(b.code)
//     );
//     const monthlyTotals = Object.fromEntries(
//       months.map((m) => [
//         m,
//         round2(monthlyRows.reduce((s, r) => s + (r.months[m] || 0), 0)),
//       ])
//     );
//     const monthlyGrandTotal = round2(
//       Object.values(monthlyTotals).reduce((s, v) => s + v, 0)
//     );

//     return {
//       filters: {
//         from: fromDate,
//         to: toDate,
//         dateBasis: "GL_ENTRY_DATE",
//         head: head || "All",
//         voucherType: voucherType || "All",
//         codePrefix,
//       },
//       kpis,
//       byHead: { rows: byHead, total: byHeadTotal },
//       monthly: {
//         months,
//         rows: monthlyRows,
//         totals: monthlyTotals,
//         grandTotal: monthlyGrandTotal,
//       },
//       details,
//       checks: {
//         byHeadEqualsKpi: byHeadTotal === totalIncome,
//         monthlyEqualsKpi: monthlyGrandTotal === totalIncome,
//       },
//     };
//   } finally {
//     if (conn) await conn.close();
//   }
// };

import oracledb from "oracledb";

import { getConnection } from "../../config/db.js";

const DEFAULT_CODE_PREFIX = "4"; // sudhu response-er filters-e dekhanor jonno
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Sudhu Income voucher (GLMASTER.VOUCHER_TYPE = 1), jate Receive Voucher page-er sathe mile.
// GL (3) / Expense (2) / Bank Transfer (4) voucher ei report-e ashbe na.
const INCOME_VOUCHER_TYPE = "Income";

// Report-e sudhu ei 3 ta head ashbe (amount 0 hole-o dekhabe)
const FIXED_HEADS = [
  { code: "4010000000", head: "Cow-Sales" },
  { code: "4030010000", head: "Egg-Sales" },
  { code: "4030020000", head: "Egg Sales - Other" },
];
const HEAD_NAME_BY_CODE = Object.fromEntries(
  FIXED_HEADS.map((h) => [h.code, h.head])
);
// constant theke toiri, user input na, tai SQL-e boshano safe
const HEAD_CODES_SQL = FIXED_HEADS.map((h) => `'${h.code}'`).join(", ");

// GLDATA view-er moto-i, kintu INV_TYPE-er jonno LEFT JOIN.
// GLDATA view-te inner join (H.INV_TYPE = IT.ID) ache, tai INV_TYPE faka/mile na
// emon voucher bad pore jay. Ekhane sob voucher ashe.
const GL_SOURCE = `(
  SELECT H.ID,
         H.VOUCHERNO,
         IT.DESCRIPTIO,
         H.TRANS_DATE,
         CASE H.VOUCHER_TYPE
           WHEN 1 THEN 'Income'
           WHEN 2 THEN 'Expense'
           WHEN 3 THEN 'GL'
           WHEN 4 THEN 'Bank Transfer'
         END AS VOUCHER_TYPE,
         H.DESCRIPTION,
         H.GL_ENTRY_DATE,
         L.CODE,
         L.DEBIT,
         L.CREDIT,
         L.CODEDESCRIPTION
    FROM GLMASTER H
    JOIN GLDETAILS L ON L.GLMASTERID = H.ID
    LEFT JOIN INV_TYPE IT ON IT.ID = H.INV_TYPE
)`;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const isValidDate = (s) => {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

const buildMonthList = (from, to) => {
  const months = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ey, em] = to.slice(0, 7).split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
};

const normalize = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "all" ? null : s;
};

/* ------------------------------------------------------------------ */
/* Filter options (dropdown)                                           */
/* ------------------------------------------------------------------ */
export const getIncomeReportFilters = async () => {
  // Voucher type sudhu Income, tai DB-te jete hoy na
  return {
    voucherTypes: [INCOME_VOUCHER_TYPE],
    heads: FIXED_HEADS.map((h) => ({ code: h.code, head: h.head })),
  };
};

/* ------------------------------------------------------------------ */
/* Income report                                                       */
/* ------------------------------------------------------------------ */
export const getIncomeReport = async (params = {}) => {
  const fromDate = normalize(params.from);
  const toDate = normalize(params.to);
  const head = normalize(params.head); // head CODE

  if (!isValidDate(fromDate) || !isValidDate(toDate)) {
    throw httpError(400, "from ও to date দিতে হবে (format: YYYY-MM-DD)");
  }
  if (fromDate > toDate) {
    throw httpError(400, "from date, to date এর পরে হতে পারবে না");
  }

  // head filter na thakle 3 ta head-i 0 shoho dekhabe
  const seedHeads = head ? [] : FIXED_HEADS;

  const binds = {
    fromDate,
    toDate,
    voucherType: INCOME_VOUCHER_TYPE,
  };

  let extraWhere = "";
  if (head) {
    extraWhere += " AND g.CODE = :head";
    binds.head = head;
  }

  const sql = `
    SELECT g.VOUCHERNO,
           g.DESCRIPTIO,
           g.DESCRIPTION,
           g.VOUCHER_TYPE,
           g.CODE,
           TO_CHAR(TRUNC(g.GL_ENTRY_DATE), 'YYYY-MM-DD')  AS GL_DATE,
           TO_CHAR(TRUNC(g.TRANS_DATE),    'YYYY-MM-DD')  AS TRANS_DATE,
           SUM(NVL(g.CREDIT, 0) - NVL(g.DEBIT, 0))        AS AMOUNT
      FROM ${GL_SOURCE} g
     WHERE g.CODE IN (${HEAD_CODES_SQL})
       AND g.VOUCHER_TYPE = :voucherType
       AND TRUNC(g.GL_ENTRY_DATE) BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                                       AND TO_DATE(:toDate,   'YYYY-MM-DD')
       ${extraWhere}
     GROUP BY g.VOUCHERNO, g.DESCRIPTIO, g.DESCRIPTION, g.VOUCHER_TYPE,
              g.CODE, TRUNC(g.GL_ENTRY_DATE), TRUNC(g.TRANS_DATE)
     ORDER BY GL_DATE, g.VOUCHERNO, g.CODE`;

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const rows = result.rows || [];

    /* ---------- details (+ cumulative) ---------- */
    let running = 0;
    const details = rows.map((r, i) => {
      const amount = round2(r.AMOUNT);
      running = round2(running + amount);
      return {
        sNo: i + 1,
        glDate: r.GL_DATE,
        transDate: r.TRANS_DATE,
        voucherNo: r.VOUCHERNO,
        voucherType: r.VOUCHER_TYPE,
        shortDescription: r.DESCRIPTIO,
        description: r.DESCRIPTION,
        code: r.CODE,
        head: HEAD_NAME_BY_CODE[r.CODE] || r.CODE,
        amount,
        cumulative: running,
      };
    });

    const totalIncome = round2(details.reduce((s, d) => s + d.amount, 0));

    /* ---------- KPIs (voucher-wise) ---------- */
    const voucherTotals = new Map();
    for (const d of details) {
      voucherTotals.set(
        d.voucherNo,
        round2((voucherTotals.get(d.voucherNo) || 0) + d.amount)
      );
    }
    const voucherCount = voucherTotals.size;
    const kpis = {
      totalIncome,
      voucherCount,
      averagePerVoucher: voucherCount ? round2(totalIncome / voucherCount) : 0,
      largestVoucher: voucherCount
        ? Math.max(...voucherTotals.values())
        : 0,
    };

    /* ---------- by head ---------- */
    const headMap = new Map(
      seedHeads.map((h) => [h.code, { code: h.code, head: h.head, amount: 0 }])
    );
    for (const d of details) {
      const cur = headMap.get(d.code) || {
        code: d.code,
        head: d.head,
        amount: 0,
      };
      cur.amount = round2(cur.amount + d.amount);
      headMap.set(d.code, cur);
    }
    const byHead = [...headMap.values()]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((h) => ({
        ...h,
        percent: totalIncome ? round2((h.amount / totalIncome) * 100) : 0,
      }));
    const byHeadTotal = round2(byHead.reduce((s, h) => s + h.amount, 0));

    /* ---------- monthly (GL date অনুযায়ী) ---------- */
    const months = buildMonthList(fromDate, toDate);
    const monthlyMap = new Map(
      seedHeads.map((h) => [
        h.code,
        {
          code: h.code,
          head: h.head,
          months: Object.fromEntries(months.map((m) => [m, 0])),
          total: 0,
        },
      ])
    );
    for (const d of details) {
      const key = d.glDate.slice(0, 7);
      const row =
        monthlyMap.get(d.code) ||
        {
          code: d.code,
          head: d.head,
          months: Object.fromEntries(months.map((m) => [m, 0])),
          total: 0,
        };
      row.months[key] = round2((row.months[key] || 0) + d.amount);
      row.total = round2(row.total + d.amount);
      monthlyMap.set(d.code, row);
    }
    const monthlyRows = [...monthlyMap.values()].sort((a, b) =>
      a.code.localeCompare(b.code)
    );
    const monthlyTotals = Object.fromEntries(
      months.map((m) => [
        m,
        round2(monthlyRows.reduce((s, r) => s + (r.months[m] || 0), 0)),
      ])
    );
    const monthlyGrandTotal = round2(
      Object.values(monthlyTotals).reduce((s, v) => s + v, 0)
    );

    return {
      filters: {
        from: fromDate,
        to: toDate,
        dateBasis: "GL_ENTRY_DATE",
        head: head || "All",
        voucherType: INCOME_VOUCHER_TYPE,
        codePrefix: DEFAULT_CODE_PREFIX,
      },
      kpis,
      byHead: { rows: byHead, total: byHeadTotal },
      monthly: {
        months,
        rows: monthlyRows,
        totals: monthlyTotals,
        grandTotal: monthlyGrandTotal,
      },
      details,
      checks: {
        byHeadEqualsKpi: byHeadTotal === totalIncome,
        monthlyEqualsKpi: monthlyGrandTotal === totalIncome,
      },
    };
  } finally {
    if (conn) await conn.close();
  }
};