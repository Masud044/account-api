// // import oracledb from "oracledb";
// // // ⚠️ tomar project-er existing DB helper onujayi mile nao
// // import { getConnection } from "../../config/db.js";

// // /* ====================================================================== */
// // /* CONFIG                                                                  */
// // /* ====================================================================== */
// // const VOUCHER_TYPE = "Expense";
// // const CODE_PREFIX = "5"; // expense account = 5xxx
// // const DATE_COLUMN = "GL_ENTRY_DATE"; // TRANS_DATE chaile ekhane bodlao

// // // Project voucher-wise, GLDATA-r ei column theke (income-e Cow/Egg ei column-e chilo)
// // // ⚠️ workbook-er Project jodi onno column theke hoy, ekhane bodlao
// // const PROJECT_COLUMN = "DESCRIPTIO";
// // const UNASSIGNED_LABEL = "Unassigned"; // project column faka thakle

// // // ⚠️ glmaster table/column naam tomar DB onujayi mile nao (account description ekhan theke ashbe)
// // const GL_MASTER = { table: "GLMASTER", name: "DESCRIPTION" };

// // /* ====================================================================== */
// // /* HELPERS                                                                 */
// // /* ====================================================================== */
// // const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// // const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// // const httpError = (statusCode, message) => {
// //   const err = new Error(message);
// //   err.statusCode = statusCode;
// //   return err;
// // };

// // const isValidDate = (s) => {
// //   if (typeof s !== "string" || !DATE_RE.test(s)) return false;
// //   const [y, m, d] = s.split("-").map(Number);
// //   const dt = new Date(Date.UTC(y, m - 1, d));
// //   return (
// //     dt.getUTCFullYear() === y &&
// //     dt.getUTCMonth() === m - 1 &&
// //     dt.getUTCDate() === d
// //   );
// // };

// // const buildMonthList = (from, to) => {
// //   const months = [];
// //   let [y, m] = from.slice(0, 7).split("-").map(Number);
// //   const [ey, em] = to.slice(0, 7).split("-").map(Number);
// //   while (y < ey || (y === ey && m <= em)) {
// //     months.push(`${y}-${String(m).padStart(2, "0")}`);
// //     m += 1;
// //     if (m > 12) {
// //       m = 1;
// //       y += 1;
// //     }
// //   }
// //   return months;
// // };

// // const normalize = (v) => {
// //   if (v === undefined || v === null) return null;
// //   const s = String(v).trim();
// //   return s === "" || s.toLowerCase() === "all" ? null : s;
// // };

// // const projectOf = (v) => (v && String(v).trim()) || UNASSIGNED_LABEL;

// // // glmaster-e ekta code-er ekadhik row thakleo join-e row duplicate hobe na
// // const MASTER_JOIN = `
// //   LEFT JOIN (
// //          SELECT ${GL_MASTER.code} AS CODE, MAX(${GL_MASTER.name}) AS ACCOUNT_NAME
// //            FROM ${GL_MASTER.table}
// //           GROUP BY ${GL_MASTER.code}
// //        ) m ON m.CODE = g.CODE`;

// // // Data problem: debit != credit hoye thaka voucher puro skip hobe
// // const UNBALANCED_VOUCHERS = `
// //   SELECT VOUCHERNO
// //     FROM GLDATA
// //    WHERE VOUCHER_TYPE = :voucherType
// //      AND VOUCHERNO IS NOT NULL
// //    GROUP BY VOUCHERNO
// //   HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)`;

// // /* ====================================================================== */
// // /* Filter options                                                          */
// // /* ====================================================================== */
// // export const getExpenseReportFilters = async () => {
// //   let conn;
// //   try {
// //     conn = await getConnection();
// //     const result = await conn.execute(
// //       `SELECT DISTINCT g.CODE, m.ACCOUNT_NAME, TRIM(g.${PROJECT_COLUMN}) AS PROJECT
// //          FROM GLDATA g
// //          ${MASTER_JOIN}
// //         WHERE g.VOUCHER_TYPE = :voucherType
// //           AND g.CODE LIKE :codeLike
// //         ORDER BY g.CODE`,
// //       { voucherType: VOUCHER_TYPE, codeLike: `${CODE_PREFIX}%` },
// //       { outFormat: oracledb.OUT_FORMAT_OBJECT }
// //     );

// //     const categoryMap = new Map();
// //     const projectSet = new Set();
// //     for (const r of result.rows) {
// //       const project = projectOf(r.PROJECT);
// //       projectSet.add(project);
// //       const cur = categoryMap.get(r.CODE) || {
// //         code: r.CODE,
// //         name: r.ACCOUNT_NAME || r.CODE,
// //         projects: [],
// //       };
// //       if (!cur.projects.includes(project)) cur.projects.push(project);
// //       categoryMap.set(r.CODE, cur);
// //     }

// //     return {
// //       projects: [...projectSet].sort(),
// //       categories: [...categoryMap.values()],
// //     };
// //   } finally {
// //     if (conn) await conn.close();
// //   }
// // };

// // /* ====================================================================== */
// // /* Expense report                                                          */
// // /* ====================================================================== */
// // export const getExpenseReport = async (params = {}) => {
// //   const fromDate = normalize(params.from);
// //   const toDate = normalize(params.to);
// //   const projectFilter = normalize(params.project);
// //   const categoryFilter = normalize(params.category); // account CODE

// //   if (!isValidDate(fromDate) || !isValidDate(toDate)) {
// //     throw httpError(400, "from ও to date দিতে হবে (format: YYYY-MM-DD)");
// //   }
// //   if (fromDate > toDate) {
// //     throw httpError(400, "from date, to date এর পরে হতে পারবে না");
// //   }

// //   const binds = {
// //     voucherType: VOUCHER_TYPE,
// //     codeLike: `${CODE_PREFIX}%`,
// //     fromDate,
// //     toDate,
// //   };

// //   let extraWhere = "";
// //   if (categoryFilter) {
// //     extraWhere += " AND g.CODE = :category";
// //     binds.category = categoryFilter;
// //   }

// //   const sql = `
// //     SELECT g.VOUCHERNO,
// //            g.DESCRIPTION,
// //            g.CODE,
// //            m.ACCOUNT_NAME,
// //            TRIM(g.${PROJECT_COLUMN})                       AS PROJECT,
// //            TO_CHAR(TRUNC(g.${DATE_COLUMN}), 'YYYY-MM-DD')  AS GL_DATE,
// //            SUM(NVL(g.DEBIT, 0) - NVL(g.CREDIT, 0))         AS AMOUNT
// //       FROM GLDATA g
// //       ${MASTER_JOIN}
// //      WHERE g.VOUCHER_TYPE = :voucherType
// //        AND g.CODE LIKE :codeLike
// //        AND TRUNC(g.${DATE_COLUMN}) BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
// //                                        AND TO_DATE(:toDate,   'YYYY-MM-DD')
// //        AND g.VOUCHERNO NOT IN (${UNBALANCED_VOUCHERS})
// //        ${extraWhere}
// //      GROUP BY g.VOUCHERNO, g.DESCRIPTION, g.CODE, m.ACCOUNT_NAME,
// //               TRIM(g.${PROJECT_COLUMN}), TRUNC(g.${DATE_COLUMN})
// //      ORDER BY GL_DATE, g.VOUCHERNO, g.CODE`;

// //   const skippedSql = `
// //     SELECT u.VOUCHERNO, u.TOTAL_DEBIT, u.TOTAL_CREDIT
// //       FROM (
// //             SELECT VOUCHERNO,
// //                    SUM(NVL(DEBIT, 0))              AS TOTAL_DEBIT,
// //                    SUM(NVL(CREDIT, 0))             AS TOTAL_CREDIT,
// //                    MIN(TRUNC(${DATE_COLUMN}))      AS V_DATE
// //               FROM GLDATA
// //              WHERE VOUCHER_TYPE = :voucherType
// //                AND VOUCHERNO IS NOT NULL
// //              GROUP BY VOUCHERNO
// //             HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)
// //            ) u
// //      WHERE u.V_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
// //                         AND TO_DATE(:toDate,   'YYYY-MM-DD')
// //      ORDER BY u.VOUCHERNO`;

// //   let conn;
// //   try {
// //     conn = await getConnection();
// //     const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };
// //     const result = await conn.execute(sql, binds, opts);
// //     const skipped = await conn.execute(
// //       skippedSql,
// //       { voucherType: VOUCHER_TYPE, fromDate, toDate },
// //       opts
// //     );

// //     /* ---------- details (project = voucher-wise, category = account name) ---------- */
// //     let details = (result.rows || []).map((r) => ({
// //       glDate: r.GL_DATE,
// //       voucherNo: r.VOUCHERNO,
// //       description: r.DESCRIPTION,
// //       code: r.CODE,
// //       category: r.ACCOUNT_NAME || r.CODE,
// //       project: projectOf(r.PROJECT),
// //       amount: round2(r.AMOUNT),
// //     }));

// //     if (projectFilter) {
// //       details = details.filter((d) => d.project === projectFilter);
// //     }
// //     details = details.map((d, i) => ({ sNo: i + 1, ...d }));

// //     const totalExpense = round2(details.reduce((s, d) => s + d.amount, 0));
// //     const months = buildMonthList(fromDate, toDate);
// //     const projects = [...new Set(details.map((d) => d.project))].sort();

// //     /* ---------- by project x month ---------- */
// //     const projectMap = new Map();
// //     for (const d of details) {
// //       const row =
// //         projectMap.get(d.project) || {
// //           project: d.project,
// //           months: Object.fromEntries(months.map((m) => [m, 0])),
// //           total: 0,
// //         };
// //       const key = d.glDate.slice(0, 7);
// //       row.months[key] = round2((row.months[key] || 0) + d.amount);
// //       row.total = round2(row.total + d.amount);
// //       projectMap.set(d.project, row);
// //     }
// //     const projectRows = [...projectMap.values()]
// //       .sort((a, b) => a.project.localeCompare(b.project))
// //       .map((r) => ({
// //         ...r,
// //         percent: totalExpense ? round2((r.total / totalExpense) * 100) : 0,
// //       }));
// //     const monthTotals = Object.fromEntries(
// //       months.map((m) => [
// //         m,
// //         round2(projectRows.reduce((s, r) => s + (r.months[m] || 0), 0)),
// //       ])
// //     );
// //     const monthlyGrandTotal = round2(
// //       Object.values(monthTotals).reduce((s, v) => s + v, 0)
// //     );
// //     const projectGrandTotal = round2(
// //       projectRows.reduce((s, r) => s + r.total, 0)
// //     );

// //     /* ---------- by category (account) x project ---------- */
// //     const categoryMap = new Map();
// //     for (const d of details) {
// //       const row = categoryMap.get(d.code) || {
// //         code: d.code,
// //         category: d.category,
// //         projects: Object.fromEntries(projects.map((p) => [p, 0])),
// //         total: 0,
// //       };
// //       row.projects[d.project] = round2(row.projects[d.project] + d.amount);
// //       row.total = round2(row.total + d.amount);
// //       categoryMap.set(d.code, row);
// //     }
// //     const categoryRows = [...categoryMap.values()]
// //       .sort((a, b) => b.total - a.total)
// //       .map((r) => ({
// //         ...r,
// //         percent: totalExpense ? round2((r.total / totalExpense) * 100) : 0,
// //       }));
// //     const categoryProjectTotals = Object.fromEntries(
// //       projects.map((p) => [
// //         p,
// //         round2(categoryRows.reduce((s, r) => s + (r.projects[p] || 0), 0)),
// //       ])
// //     );
// //     const categoryGrandTotal = round2(
// //       categoryRows.reduce((s, r) => s + r.total, 0)
// //     );

// //     /* ---------- KPIs ---------- */
// //     const largestProject = projectRows.length
// //       ? projectRows.reduce((a, b) => (b.total > a.total ? b : a))
// //       : null;
// //     const largestCategory = categoryRows[0] || null;
// //     const monthEntries = Object.entries(monthTotals);
// //     const peak = monthEntries.length
// //       ? monthEntries.reduce((a, b) => (b[1] > a[1] ? b : a))
// //       : null;
// //     const spendingMonths = monthEntries.filter(([, v]) => v !== 0).length;

// //     const kpis = {
// //       totalExpense,
// //       expenseLines: details.length,
// //       largestProject: largestProject
// //         ? { name: largestProject.project, amount: largestProject.total }
// //         : null,
// //       largestCategory: largestCategory
// //         ? { name: largestCategory.category, amount: largestCategory.total }
// //         : null,
// //       peakMonth:
// //         peak && peak[1] !== 0 ? { month: peak[0], amount: peak[1] } : null,
// //       averagePerSpendingMonth: spendingMonths
// //         ? round2(totalExpense / spendingMonths)
// //         : 0,
// //     };

// //     return {
// //       filters: {
// //         from: fromDate,
// //         to: toDate,
// //         dateBasis: DATE_COLUMN,
// //         project: projectFilter || "All",
// //         category: categoryFilter || "All",
// //       },
// //       kpis,
// //       byProject: {
// //         months,
// //         rows: projectRows,
// //         totals: monthTotals,
// //         grandTotal: projectGrandTotal,
// //       },
// //       byCategory: {
// //         projects,
// //         rows: categoryRows,
// //         totals: categoryProjectTotals,
// //         grandTotal: categoryGrandTotal,
// //       },
// //       details,
// //       skippedVouchers: (skipped.rows || []).map((r) => ({
// //         voucherNo: r.VOUCHERNO,
// //         debit: round2(r.TOTAL_DEBIT),
// //         credit: round2(r.TOTAL_CREDIT),
// //       })),
// //       checks: {
// //         byProjectEqualsKpi: projectGrandTotal === totalExpense,
// //         byMonthEqualsKpi: monthlyGrandTotal === totalExpense,
// //         byCategoryEqualsKpi: categoryGrandTotal === totalExpense,
// //       },
// //     };
// //   } finally {
// //     if (conn) await conn.close();
// //   }
// // };

// import oracledb from "oracledb";
// // ⚠️ tomar project-er existing DB helper onujayi mile nao
// import { getConnection } from "../../config/db.js";

// /* ====================================================================== */
// /* CONFIG                                                                  */
// /* ====================================================================== */
// const VOUCHER_TYPE = "Expense";
// const CODE_PREFIX = "5"; // expense account = 5xxx
// const DATE_COLUMN = "GL_ENTRY_DATE"; // TRANS_DATE chaile ekhane bodlao

// // Project voucher-wise, GLDATA-r ei column theke
// // ⚠️ Project jodi onno column theke hoy, ekhane bodlao
// const PROJECT_COLUMN = "DESCRIPTIO";
// const UNASSIGNED_LABEL = "Unassigned"; // project column faka thakle

// /* ====================================================================== */
// /* HELPERS                                                                 */
// /* ====================================================================== */
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

// const projectOf = (v) => (v && String(v).trim()) || UNASSIGNED_LABEL;

// // Data problem: debit != credit hoye thaka voucher puro skip hobe
// const UNBALANCED_VOUCHERS = `
//   SELECT VOUCHERNO
//     FROM GLDATA
//    WHERE VOUCHER_TYPE = :voucherType
//      AND VOUCHERNO IS NOT NULL
//    GROUP BY VOUCHERNO
//   HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)`;

// /* ====================================================================== */
// /* Filter options                                                          */
// /* ====================================================================== */
// export const getExpenseReportFilters = async () => {
//   let conn;
//   try {
//     conn = await getConnection();
//     const result = await conn.execute(
//       `SELECT g.CODE,
//               MAX(g.CODEDESCRIPTION)      AS ACCOUNT_NAME,
//               TRIM(g.${PROJECT_COLUMN})   AS PROJECT
//          FROM GLDATA g
//         WHERE g.VOUCHER_TYPE = :voucherType
//           AND g.CODE LIKE :codeLike
//         GROUP BY g.CODE, TRIM(g.${PROJECT_COLUMN})
//         ORDER BY g.CODE`,
//       { voucherType: VOUCHER_TYPE, codeLike: `${CODE_PREFIX}%` },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const categoryMap = new Map();
//     const projectSet = new Set();
//     for (const r of result.rows) {
//       const project = projectOf(r.PROJECT);
//       projectSet.add(project);
//       const cur = categoryMap.get(r.CODE) || {
//         code: r.CODE,
//         name: r.ACCOUNT_NAME || r.CODE,
//         projects: [],
//       };
//       if (!cur.name || cur.name === cur.code) {
//         cur.name = r.ACCOUNT_NAME || r.CODE;
//       }
//       if (!cur.projects.includes(project)) cur.projects.push(project);
//       categoryMap.set(r.CODE, cur);
//     }

//     return {
//       projects: [...projectSet].sort(),
//       categories: [...categoryMap.values()],
//     };
//   } finally {
//     if (conn) await conn.close();
//   }
// };

// /* ====================================================================== */
// /* Expense report                                                          */
// /* ====================================================================== */
// export const getExpenseReport = async (params = {}) => {
//   const fromDate = normalize(params.from);
//   const toDate = normalize(params.to);
//   const projectFilter = normalize(params.project);
//   const categoryFilter = normalize(params.category); // account CODE

//   if (!isValidDate(fromDate) || !isValidDate(toDate)) {
//     throw httpError(400, "from ও to date দিতে হবে (format: YYYY-MM-DD)");
//   }
//   if (fromDate > toDate) {
//     throw httpError(400, "from date, to date এর পরে হতে পারবে না");
//   }

//   const binds = {
//     voucherType: VOUCHER_TYPE,
//     codeLike: `${CODE_PREFIX}%`,
//     fromDate,
//     toDate,
//   };

//   let extraWhere = "";
//   if (categoryFilter) {
//     extraWhere += " AND g.CODE = :category";
//     binds.category = categoryFilter;
//   }

//   const sql = `
//     SELECT g.VOUCHERNO,
//            g.DESCRIPTION,
//            g.CODE,
//            g.CODEDESCRIPTION                               AS ACCOUNT_NAME,
//            TRIM(g.${PROJECT_COLUMN})                       AS PROJECT,
//            TO_CHAR(TRUNC(g.${DATE_COLUMN}), 'YYYY-MM-DD')  AS GL_DATE,
//            SUM(NVL(g.DEBIT, 0) - NVL(g.CREDIT, 0))         AS AMOUNT
//       FROM GLDATA g
//      WHERE g.VOUCHER_TYPE = :voucherType
//        AND g.CODE LIKE :codeLike
//        AND TRUNC(g.${DATE_COLUMN}) BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
//                                        AND TO_DATE(:toDate,   'YYYY-MM-DD')
//        AND g.VOUCHERNO NOT IN (${UNBALANCED_VOUCHERS})
//        ${extraWhere}
//      GROUP BY g.VOUCHERNO, g.DESCRIPTION, g.CODE, g.CODEDESCRIPTION,
//               TRIM(g.${PROJECT_COLUMN}), TRUNC(g.${DATE_COLUMN})
//      ORDER BY GL_DATE, g.VOUCHERNO, g.CODE`;

//   const skippedSql = `
//     SELECT u.VOUCHERNO, u.TOTAL_DEBIT, u.TOTAL_CREDIT
//       FROM (
//             SELECT VOUCHERNO,
//                    SUM(NVL(DEBIT, 0))              AS TOTAL_DEBIT,
//                    SUM(NVL(CREDIT, 0))             AS TOTAL_CREDIT,
//                    MIN(TRUNC(${DATE_COLUMN}))      AS V_DATE
//               FROM GLDATA
//              WHERE VOUCHER_TYPE = :voucherType
//                AND VOUCHERNO IS NOT NULL
//              GROUP BY VOUCHERNO
//             HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)
//            ) u
//      WHERE u.V_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
//                         AND TO_DATE(:toDate,   'YYYY-MM-DD')
//      ORDER BY u.VOUCHERNO`;

//   let conn;
//   try {
//     conn = await getConnection();
//     const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };
//     const result = await conn.execute(sql, binds, opts);
//     const skipped = await conn.execute(
//       skippedSql,
//       { voucherType: VOUCHER_TYPE, fromDate, toDate },
//       opts
//     );

//     /* ---------- details (project = voucher-wise, category = account name) ---------- */
//     let details = (result.rows || []).map((r) => ({
//       glDate: r.GL_DATE,
//       voucherNo: r.VOUCHERNO,
//       description: r.DESCRIPTION,
//       code: r.CODE,
//       category: r.ACCOUNT_NAME || r.CODE,
//       project: projectOf(r.PROJECT),
//       amount: round2(r.AMOUNT),
//     }));

//     if (projectFilter) {
//       details = details.filter((d) => d.project === projectFilter);
//     }
//     details = details.map((d, i) => ({ sNo: i + 1, ...d }));

//     const totalExpense = round2(details.reduce((s, d) => s + d.amount, 0));
//     const months = buildMonthList(fromDate, toDate);
//     const projects = [...new Set(details.map((d) => d.project))].sort();

//     /* ---------- by project x month ---------- */
//     const projectMap = new Map();
//     for (const d of details) {
//       const row =
//         projectMap.get(d.project) || {
//           project: d.project,
//           months: Object.fromEntries(months.map((m) => [m, 0])),
//           total: 0,
//         };
//       const key = d.glDate.slice(0, 7);
//       row.months[key] = round2((row.months[key] || 0) + d.amount);
//       row.total = round2(row.total + d.amount);
//       projectMap.set(d.project, row);
//     }
//     const projectRows = [...projectMap.values()]
//       .sort((a, b) => a.project.localeCompare(b.project))
//       .map((r) => ({
//         ...r,
//         percent: totalExpense ? round2((r.total / totalExpense) * 100) : 0,
//       }));
//     const monthTotals = Object.fromEntries(
//       months.map((m) => [
//         m,
//         round2(projectRows.reduce((s, r) => s + (r.months[m] || 0), 0)),
//       ])
//     );
//     const monthlyGrandTotal = round2(
//       Object.values(monthTotals).reduce((s, v) => s + v, 0)
//     );
//     const projectGrandTotal = round2(
//       projectRows.reduce((s, r) => s + r.total, 0)
//     );

//     /* ---------- by category (account) x project ---------- */
//     const categoryMap = new Map();
//     for (const d of details) {
//       const row = categoryMap.get(d.code) || {
//         code: d.code,
//         category: d.category,
//         projects: Object.fromEntries(projects.map((p) => [p, 0])),
//         total: 0,
//       };
//       row.projects[d.project] = round2(row.projects[d.project] + d.amount);
//       row.total = round2(row.total + d.amount);
//       categoryMap.set(d.code, row);
//     }
//     const categoryRows = [...categoryMap.values()]
//       .sort((a, b) => b.total - a.total)
//       .map((r) => ({
//         ...r,
//         percent: totalExpense ? round2((r.total / totalExpense) * 100) : 0,
//       }));
//     const categoryProjectTotals = Object.fromEntries(
//       projects.map((p) => [
//         p,
//         round2(categoryRows.reduce((s, r) => s + (r.projects[p] || 0), 0)),
//       ])
//     );
//     const categoryGrandTotal = round2(
//       categoryRows.reduce((s, r) => s + r.total, 0)
//     );

//     /* ---------- KPIs ---------- */
//     const largestProject = projectRows.length
//       ? projectRows.reduce((a, b) => (b.total > a.total ? b : a))
//       : null;
//     const largestCategory = categoryRows[0] || null;
//     const monthEntries = Object.entries(monthTotals);
//     const peak = monthEntries.length
//       ? monthEntries.reduce((a, b) => (b[1] > a[1] ? b : a))
//       : null;
//     const spendingMonths = monthEntries.filter(([, v]) => v !== 0).length;

//     const kpis = {
//       totalExpense,
//       expenseLines: details.length,
//       largestProject: largestProject
//         ? { name: largestProject.project, amount: largestProject.total }
//         : null,
//       largestCategory: largestCategory
//         ? { name: largestCategory.category, amount: largestCategory.total }
//         : null,
//       peakMonth:
//         peak && peak[1] !== 0 ? { month: peak[0], amount: peak[1] } : null,
//       averagePerSpendingMonth: spendingMonths
//         ? round2(totalExpense / spendingMonths)
//         : 0,
//     };

//     return {
//       filters: {
//         from: fromDate,
//         to: toDate,
//         dateBasis: DATE_COLUMN,
//         project: projectFilter || "All",
//         category: categoryFilter || "All",
//       },
//       kpis,
//       byProject: {
//         months,
//         rows: projectRows,
//         totals: monthTotals,
//         grandTotal: projectGrandTotal,
//       },
//       byCategory: {
//         projects,
//         rows: categoryRows,
//         totals: categoryProjectTotals,
//         grandTotal: categoryGrandTotal,
//       },
//       details,
//       skippedVouchers: (skipped.rows || []).map((r) => ({
//         voucherNo: r.VOUCHERNO,
//         debit: round2(r.TOTAL_DEBIT),
//         credit: round2(r.TOTAL_CREDIT),
//       })),
//       checks: {
//         byProjectEqualsKpi: projectGrandTotal === totalExpense,
//         byMonthEqualsKpi: monthlyGrandTotal === totalExpense,
//         byCategoryEqualsKpi: categoryGrandTotal === totalExpense,
//       },
//     };
//   } finally {
//     if (conn) await conn.close();
//   }
// };
import oracledb from "oracledb";
// ⚠️ tomar project-er existing DB helper onujayi mile nao
import { getConnection } from "../../config/db.js";

/* ====================================================================== */
/* CONFIG                                                                  */
/* ====================================================================== */
const VOUCHER_TYPE = "Expense";
const CODE_PREFIX = "5"; // expense account = 5xxx
const DATE_COLUMN = "GL_ENTRY_DATE"; // TRANS_DATE chaile ekhane bodlao

// Project voucher-wise, GLDATA-r ei column theke
// ⚠️ Project jodi onno column theke hoy, ekhane bodlao
const PROJECT_COLUMN = "DESCRIPTIO";
const UNASSIGNED_LABEL = "Unassigned"; // project column faka thakle

// Excel (Expense_Report.xlsx -> Accounts sheet) er category mapping.
// Output e category + code + name tin-tai jabe.
const OTHER_CATEGORY = "Other";
const ACCOUNT_CATEGORY = {
  5010010000: ["Travelling & Conveyance", "Other"],
  5010020000: ["Guest Entertainment", "Other"],
  5010030000: ["Salary & Other Expense", "Salary & Labour"],
  5010040000: ["Cow Medicine & Treatment", "Medicine & Treatment"],
  5020010001: ["Chicken Project - Construction", "Construction & Setup"],
  5020010002: ["Chicken Project - Others", "Construction & Setup"],
  5020010003: ["Chicken Project - Carpenter", "Construction & Setup"],
  5030000000: ["Grass - Fertilizer", "Grass & Land"],
  5030010000: ["Grass - Land Lease", "Grass & Land"],
  5030020000: ["Grass Project - Other Expense", "Grass & Land"],
  5040020000: ["Staff Kitchen Equipment", "Other"],
  5050020000: ["Farm Maintenance & Utilities", "Utilities & Rent"],
  5060010000: ["Electricity Bill", "Utilities & Rent"],
  5060020000: ["Internet Bill", "Utilities & Rent"],
  5060030000: ["Farm Rent", "Utilities & Rent"],
  5070000000: ["Labour Bill", "Salary & Labour"],
  5090000000: ["Cow - Feed", "Feed"],
  5100000000: ["Miscellaneous - Cow", "Other"],
  5110000000: ["Chicken House Equipment & Supplies", "Equipment & Supplies"],
  5120000000: ["Fish Pond - Maintenance", "Pond & Fish"],
  5120010000: ["Fish Pond - Stocking & Pond Work", "Pond & Fish"],
  5140010000: ["Cow Fattening - Feed", "Feed"],
  5140020000: ["Cow Fattening - Medicine", "Medicine & Treatment"],
  5140030000: ["Cow Fattening - Others", "Other"],
  5140040000: ["Salary & Others Expense (Cow)", "Salary & Labour"],
  5150010000: ["Layer Chicken - Feed", "Feed"],
  5150020000: ["Layer Chicken - Medicine", "Medicine & Treatment"],
  5150030000: ["Layer Chicken - Others", "Equipment & Supplies"],
  5150040000: ["Salary & Others Expense (Chicken)", "Salary & Labour"],
  5150050000: ["Layer Chicken - Pullets (Shed-2)", "Livestock Purchase"],
  5150060000: ["Layer Chicken - Feed (Shed-2)", "Feed"],
  5150070000: ["Layer Chicken - Medicine & Vaccine (Shed-2)", "Medicine & Treatment"],
  5150080000: ["Layer Chicken - Egg Trays (Shed-2)", "Equipment & Supplies"],
};

// code -> { name, category }. Ledger-e name thakle seta, na thakle Excel-er name.
// Map-e na thaka notun account hole category = "Other".
const resolveAccount = (code, ledgerName) => {
  const hit = ACCOUNT_CATEGORY[String(code).trim()];
  return {
    name: (ledgerName && String(ledgerName).trim()) || (hit && hit[0]) || String(code),
    category: hit ? hit[1] : OTHER_CATEGORY,
  };
};

/* ====================================================================== */
/* HELPERS                                                                 */
/* ====================================================================== */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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

const projectOf = (v) => (v && String(v).trim()) || UNASSIGNED_LABEL;

// Data problem: debit != credit hoye thaka voucher puro skip hobe
const UNBALANCED_VOUCHERS = `
  SELECT VOUCHERNO
    FROM GLDATA
   WHERE VOUCHER_TYPE = :voucherType
     AND VOUCHERNO IS NOT NULL
   GROUP BY VOUCHERNO
  HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)`;

/* ====================================================================== */
/* Filter options                                                          */
/* ====================================================================== */
export const getExpenseReportFilters = async () => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT g.CODE,
              MAX(g.CODEDESCRIPTION)      AS ACCOUNT_NAME,
              TRIM(g.${PROJECT_COLUMN})   AS PROJECT
         FROM GLDATA g
        WHERE g.VOUCHER_TYPE = :voucherType
          AND g.CODE LIKE :codeLike
        GROUP BY g.CODE, TRIM(g.${PROJECT_COLUMN})
        ORDER BY g.CODE`,
      { voucherType: VOUCHER_TYPE, codeLike: `${CODE_PREFIX}%` },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // category -> { name: category, accounts: [account names], projects: [...] }  (code nai)
    const categoryMap = new Map();
    const projectSet = new Set();
    for (const r of result.rows) {
      const project = projectOf(r.PROJECT);
      projectSet.add(project);
      const acc = resolveAccount(r.CODE, r.ACCOUNT_NAME);
      const cur = categoryMap.get(acc.category) || {
        name: acc.category,
        accounts: [],
        projects: [],
      };
      if (!cur.accounts.some((a) => a.code === r.CODE)) {
        cur.accounts.push({ code: r.CODE, name: acc.name });
      }
      if (!cur.projects.includes(project)) cur.projects.push(project);
      categoryMap.set(acc.category, cur);
    }

    return {
      projects: [...projectSet].sort(),
      categories: [...categoryMap.values()]
        .map((c) => ({
          ...c,
          accounts: c.accounts.sort((a, b) => String(a.code).localeCompare(String(b.code))),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  } finally {
    if (conn) await conn.close();
  }
};

/* ====================================================================== */
/* Expense report                                                          */
/* ====================================================================== */
export const getExpenseReport = async (params = {}) => {
  const fromDate = normalize(params.from);
  const toDate = normalize(params.to);
  const projectFilter = normalize(params.project);
  const categoryFilter = normalize(params.category); // category NAME (jemon "Feed")

  if (!isValidDate(fromDate) || !isValidDate(toDate)) {
    throw httpError(400, "from ও to date দিতে হবে (format: YYYY-MM-DD)");
  }
  if (fromDate > toDate) {
    throw httpError(400, "from date, to date এর পরে হতে পারবে না");
  }

  const binds = {
    voucherType: VOUCHER_TYPE,
    codeLike: `${CODE_PREFIX}%`,
    fromDate,
    toDate,
  };

  const sql = `
    SELECT g.VOUCHERNO,
           g.DESCRIPTION,
           g.CODE,
           g.CODEDESCRIPTION                               AS ACCOUNT_NAME,
           TRIM(g.${PROJECT_COLUMN})                       AS PROJECT,
           TO_CHAR(TRUNC(g.${DATE_COLUMN}), 'YYYY-MM-DD')  AS GL_DATE,
           SUM(NVL(g.DEBIT, 0) - NVL(g.CREDIT, 0))         AS AMOUNT
      FROM GLDATA g
     WHERE g.VOUCHER_TYPE = :voucherType
       AND g.CODE LIKE :codeLike
       AND TRUNC(g.${DATE_COLUMN}) BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                                       AND TO_DATE(:toDate,   'YYYY-MM-DD')
       AND g.VOUCHERNO NOT IN (${UNBALANCED_VOUCHERS})
     GROUP BY g.VOUCHERNO, g.DESCRIPTION, g.CODE, g.CODEDESCRIPTION,
              TRIM(g.${PROJECT_COLUMN}), TRUNC(g.${DATE_COLUMN})
     ORDER BY GL_DATE, g.VOUCHERNO, g.CODE`;

  const skippedSql = `
    SELECT u.VOUCHERNO, u.TOTAL_DEBIT, u.TOTAL_CREDIT
      FROM (
            SELECT VOUCHERNO,
                   SUM(NVL(DEBIT, 0))              AS TOTAL_DEBIT,
                   SUM(NVL(CREDIT, 0))             AS TOTAL_CREDIT,
                   MIN(TRUNC(${DATE_COLUMN}))      AS V_DATE
              FROM GLDATA
             WHERE VOUCHER_TYPE = :voucherType
               AND VOUCHERNO IS NOT NULL
             GROUP BY VOUCHERNO
            HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)
           ) u
     WHERE u.V_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                        AND TO_DATE(:toDate,   'YYYY-MM-DD')
     ORDER BY u.VOUCHERNO`;

  let conn;
  try {
    conn = await getConnection();
    const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    const result = await conn.execute(sql, binds, opts);
    const skipped = await conn.execute(
      skippedSql,
      { voucherType: VOUCHER_TYPE, fromDate, toDate },
      opts
    );

    /* ---------- details (project = voucher-wise, category = account name) ---------- */
    // category (Excel grouping) + code + accountName
    let details = (result.rows || []).map((r) => {
      const acc = resolveAccount(r.CODE, r.ACCOUNT_NAME);
      return {
        glDate: r.GL_DATE,
        voucherNo: r.VOUCHERNO,
        description: r.DESCRIPTION,
        category: acc.category,
        code: r.CODE,
        accountName: acc.name,
        project: projectOf(r.PROJECT),
        amount: round2(r.AMOUNT),
      };
    });

    if (projectFilter) {
      details = details.filter((d) => d.project === projectFilter);
    }
    if (categoryFilter) {
      details = details.filter((d) => d.category === categoryFilter);
    }
    details = details.map((d, i) => ({ sNo: i + 1, ...d }));

    const totalExpense = round2(details.reduce((s, d) => s + d.amount, 0));
    const months = buildMonthList(fromDate, toDate);
    const projects = [...new Set(details.map((d) => d.project))].sort();

    /* ---------- by project x month ---------- */
    const projectMap = new Map();
    for (const d of details) {
      const row =
        projectMap.get(d.project) || {
          project: d.project,
          months: Object.fromEntries(months.map((m) => [m, 0])),
          total: 0,
        };
      const key = d.glDate.slice(0, 7);
      row.months[key] = round2((row.months[key] || 0) + d.amount);
      row.total = round2(row.total + d.amount);
      projectMap.set(d.project, row);
    }
    const projectRows = [...projectMap.values()]
      .sort((a, b) => a.project.localeCompare(b.project))
      .map((r) => ({
        ...r,
        percent: totalExpense ? round2((r.total / totalExpense) * 100) : 0,
      }));
    const monthTotals = Object.fromEntries(
      months.map((m) => [
        m,
        round2(projectRows.reduce((s, r) => s + (r.months[m] || 0), 0)),
      ])
    );
    const monthlyGrandTotal = round2(
      Object.values(monthTotals).reduce((s, v) => s + v, 0)
    );
    const projectGrandTotal = round2(
      projectRows.reduce((s, r) => s + r.total, 0)
    );

    /* ---------- by category x project (Excel Summary-r moto), code chhara ---------- */
    const zeroProjects = () => Object.fromEntries(projects.map((p) => [p, 0]));
    const categoryMap = new Map();
    for (const d of details) {
      const row = categoryMap.get(d.category) || {
        category: d.category,
        projects: zeroProjects(),
        total: 0,
        accountMap: new Map(),
      };
      row.projects[d.project] = round2(row.projects[d.project] + d.amount);
      row.total = round2(row.total + d.amount);

      // category-r bhitore account name wise breakdown
      const acc = row.accountMap.get(d.code) || {
        code: d.code,
        name: d.accountName,
        projects: zeroProjects(),
        total: 0,
      };
      acc.projects[d.project] = round2(acc.projects[d.project] + d.amount);
      acc.total = round2(acc.total + d.amount);
      row.accountMap.set(d.code, acc);

      categoryMap.set(d.category, row);
    }
    const categoryRows = [...categoryMap.values()]
      .sort((a, b) => b.total - a.total)
      .map(({ accountMap, ...r }) => ({
        ...r,
        percent: totalExpense ? round2((r.total / totalExpense) * 100) : 0,
        accounts: [...accountMap.values()].sort((a, b) => b.total - a.total),
      }));
    const categoryProjectTotals = Object.fromEntries(
      projects.map((p) => [
        p,
        round2(categoryRows.reduce((s, r) => s + (r.projects[p] || 0), 0)),
      ])
    );
    const categoryGrandTotal = round2(
      categoryRows.reduce((s, r) => s + r.total, 0)
    );

    /* ---------- KPIs ---------- */
    const largestProject = projectRows.length
      ? projectRows.reduce((a, b) => (b.total > a.total ? b : a))
      : null;
    const largestCategory = categoryRows[0] || null;
    const monthEntries = Object.entries(monthTotals);
    const peak = monthEntries.length
      ? monthEntries.reduce((a, b) => (b[1] > a[1] ? b : a))
      : null;
    const spendingMonths = monthEntries.filter(([, v]) => v !== 0).length;

    const kpis = {
      totalExpense,
      expenseLines: details.length,
      largestProject: largestProject
        ? { name: largestProject.project, amount: largestProject.total }
        : null,
      largestCategory: largestCategory
        ? { name: largestCategory.category, amount: largestCategory.total }
        : null,
      peakMonth:
        peak && peak[1] !== 0 ? { month: peak[0], amount: peak[1] } : null,
      averagePerSpendingMonth: spendingMonths
        ? round2(totalExpense / spendingMonths)
        : 0,
    };

    return {
      filters: {
        from: fromDate,
        to: toDate,
        dateBasis: DATE_COLUMN,
        project: projectFilter || "All",
        category: categoryFilter || "All",
      },
      kpis,
      byProject: {
        months,
        rows: projectRows,
        totals: monthTotals,
        grandTotal: projectGrandTotal,
      },
      byCategory: {
        projects,
        rows: categoryRows,
        totals: categoryProjectTotals,
        grandTotal: categoryGrandTotal,
      },
      details,
      skippedVouchers: (skipped.rows || []).map((r) => ({
        voucherNo: r.VOUCHERNO,
        debit: round2(r.TOTAL_DEBIT),
        credit: round2(r.TOTAL_CREDIT),
      })),
      checks: {
        byProjectEqualsKpi: projectGrandTotal === totalExpense,
        byMonthEqualsKpi: monthlyGrandTotal === totalExpense,
        byCategoryEqualsKpi: categoryGrandTotal === totalExpense,
      },
    };
  } finally {
    if (conn) await conn.close();
  }
};