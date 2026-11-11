// import oracledb from "oracledb";
// // ⚠️ tomar project-er existing DB helper onujayi mile nao
// import { getConnection } from "../../config/db.js";

// /* ====================================================================== */
// /* CONFIG                                                                  */
// /* ====================================================================== */
// const DATE_COLUMN = "GL_ENTRY_DATE"; // TRANS_DATE chaile ekhane bodlao
// const VOUCHER_KEY = "ID"; // ekta voucher-er sob line-e same ID (VOUCHERNO type-er majhe repeat hoy)

// // ⚠️ COA table/column naam mile nao (workbook-er SQL onujayi: GLDATA.CODE = COA.ACCOUNT_ID)
// const COA = {
//   table: "COA",
//   id: "ACCOUNT_ID",
//   path: "FULL_PATH",
//   root: "ROOT_ACCOUNT",
// };

// // COA-te naam nai emon code-er naam
// const ACCOUNT_NAME_OVERRIDES = {
//   "4030020000": "Egg Sales - Other",
// };

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

// const rootKey = (v) => String(v ?? "").trim().toLowerCase();

// // "> Asset > CURRENT ASSETS > Cash at BANK (Chicken)"
// //   -> { name: "Cash at BANK (Chicken)", group: "CURRENT ASSETS" }
// const parsePath = (fullPath) => {
//   const parts = String(fullPath ?? "")
//     .split(">")
//     .map((s) => s.trim())
//     .filter(Boolean);
//   if (!parts.length) return { name: null, group: "Others" };
//   const name = parts[parts.length - 1];
//   const middle = parts
//     .slice(1, -1)
//     .filter((seg, i, arr) => i === 0 || seg !== arr[i - 1]); // porpor same naam bad
//   return { name, group: middle.join(" > ") || "Others" };
// };

// // Data problem: debit != credit hoye thaka voucher puro skip hobe
// const UNBALANCED = `
//   SELECT ${VOUCHER_KEY} AS VKEY
//     FROM GLDATA
//    WHERE ${VOUCHER_KEY} IS NOT NULL
//    GROUP BY ${VOUCHER_KEY}
//   HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)`;

// /* ====================================================================== */
// /* Balance sheet (as on date, cumulative)                                  */
// /* ====================================================================== */
// export const getBalanceSheet = async (params = {}) => {
//   const asOn = params.asOn ? String(params.asOn).trim() : null;
//   if (!isValidDate(asOn)) {
//     throw httpError(400, "asOn date দিতে হবে (format: YYYY-MM-DD)");
//   }

//   const balanceSql = `
//     SELECT g.CODE,
//            SUM(NVL(g.DEBIT, 0))  AS DEBIT,
//            SUM(NVL(g.CREDIT, 0)) AS CREDIT
//       FROM GLDATA g
//      WHERE TRUNC(g.${DATE_COLUMN}) <= TO_DATE(:asOn, 'YYYY-MM-DD')
//        AND NOT EXISTS (
//              SELECT 1 FROM (${UNBALANCED}) u WHERE u.VKEY = g.${VOUCHER_KEY}
//            )
//      GROUP BY g.CODE
//      ORDER BY g.CODE`;

//   const skippedSql = `
//     SELECT x.VKEY, x.VOUCHERNO, x.VOUCHER_TYPE, x.TOTAL_DEBIT, x.TOTAL_CREDIT
//       FROM (
//             SELECT ${VOUCHER_KEY}               AS VKEY,
//                    MIN(VOUCHERNO)               AS VOUCHERNO,
//                    MIN(VOUCHER_TYPE)            AS VOUCHER_TYPE,
//                    SUM(NVL(DEBIT, 0))           AS TOTAL_DEBIT,
//                    SUM(NVL(CREDIT, 0))          AS TOTAL_CREDIT,
//                    MIN(TRUNC(${DATE_COLUMN}))   AS V_DATE
//               FROM GLDATA
//              WHERE ${VOUCHER_KEY} IS NOT NULL
//              GROUP BY ${VOUCHER_KEY}
//             HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)
//            ) x
//      WHERE x.V_DATE <= TO_DATE(:asOn, 'YYYY-MM-DD')
//      ORDER BY x.VOUCHERNO`;

//   let conn;
//   try {
//     conn = await getConnection();
//     const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

//     const coaRes = await conn.execute(
//       `SELECT ${COA.id} AS CODE, ${COA.path} AS FULL_PATH, ${COA.root} AS ROOT_ACCOUNT
//          FROM ${COA.table}`,
//       {},
//       opts
//     );
//     const balRes = await conn.execute(balanceSql, { asOn }, opts);
//     const skipRes = await conn.execute(skippedSql, { asOn }, opts);

//     /* ---------- COA map + (COA-te nai emon code-er jonno) root ---------- */
//     const coaMap = new Map();
//     const digitRoots = new Map(); // prothom digit -> Set(root)
//     for (const r of coaRes.rows || []) {
//       const code = String(r.CODE);
//       const root = rootKey(r.ROOT_ACCOUNT);
//       coaMap.set(code, { root, ...parsePath(r.FULL_PATH) });
//       const d = code.charAt(0);
//       if (!digitRoots.has(d)) digitRoots.set(d, new Set());
//       digitRoots.get(d).add(root);
//     }
//     // Digit-er shob COA account same root hole tai-i root (jemon 4xxx = Income)
//     const rootOfDigit = (code) => {
//       const set = digitRoots.get(String(code).charAt(0));
//       return set && set.size === 1 ? [...set][0] : null;
//     };

//     /* ---------- account-wise balance ---------- */
//     const accounts = (balRes.rows || []).map((r) => {
//       const code = String(r.CODE);
//       const coa = coaMap.get(code);
//       const debit = Number(r.DEBIT) || 0;
//       const credit = Number(r.CREDIT) || 0;
//       return {
//         code,
//         name: coa?.name || ACCOUNT_NAME_OVERRIDES[code] || code,
//         group: coa?.group || "Others",
//         root: coa ? coa.root : rootOfDigit(code),
//         debit,
//         credit,
//       };
//     });

//     const byRoot = (root) => accounts.filter((a) => a.root === root);

//     const buildGroups = (list, sign) => {
//       const groups = new Map();
//       for (const a of list) {
//         const balance = round2(sign === "dr" ? a.debit - a.credit : a.credit - a.debit);
//         const g = groups.get(a.group) || { name: a.group, accounts: [], total: 0 };
//         g.accounts.push({ code: a.code, name: a.name, balance });
//         g.total = round2(g.total + balance);
//         groups.set(a.group, g);
//       }
//       const arr = [...groups.values()];
//       arr.forEach((g) => g.accounts.sort((x, y) => x.code.localeCompare(y.code)));
//       arr.sort((x, y) => x.accounts[0].code.localeCompare(y.accounts[0].code));
//       return arr;
//     };

//     const assetGroups = buildGroups(byRoot("asset"), "dr");
//     const liabilityGroups = buildGroups(byRoot("liability"), "cr");
//     const equityGroups = buildGroups(byRoot("equity"), "cr");

//     const sumGroups = (groups) =>
//       round2(groups.reduce((s, g) => s + g.total, 0));
//     const totalAssets = sumGroups(assetGroups);
//     const totalLiabilities = sumGroups(liabilityGroups);
//     const equityAccountsTotal = sumGroups(equityGroups);

//     const income = round2(
//       byRoot("income").reduce((s, a) => s + (a.credit - a.debit), 0)
//     );
//     const expense = round2(
//       byRoot("expense").reduce((s, a) => s + (a.debit - a.credit), 0)
//     );
//     const netProfit = round2(income - expense);
//     const totalEquity = round2(equityAccountsTotal + netProfit);
//     const totalLiabilitiesEquity = round2(totalLiabilities + totalEquity);
//     const difference = round2(totalAssets - totalLiabilitiesEquity);

//     // Kono root-e na pore emon account (kono plug chhara alada dekhano hoy)
//     const known = new Set(["asset", "liability", "equity", "income", "expense"]);
//     const unclassified = accounts
//       .filter((a) => !known.has(a.root))
//       .map((a) => ({
//         code: a.code,
//         name: a.name,
//         amount: round2(a.debit - a.credit),
//       }));

//     return {
//       asOn,
//       dateBasis: DATE_COLUMN,
//       kpis: { totalAssets, totalLiabilities, totalEquity, netProfit },
//       assets: { groups: assetGroups, total: totalAssets },
//       liabilities: { groups: liabilityGroups, total: totalLiabilities },
//       equity: {
//         groups: equityGroups,
//         accountsTotal: equityAccountsTotal,
//         income,
//         expense,
//         netProfit,
//         total: totalEquity,
//       },
//       totalLiabilitiesEquity,
//       check: { difference, balanced: difference === 0 },
//       unclassified,
//       skippedVouchers: (skipRes.rows || []).map((r) => ({
//         voucherNo: r.VOUCHERNO,
//         voucherType: r.VOUCHER_TYPE,
//         debit: round2(r.TOTAL_DEBIT),
//         credit: round2(r.TOTAL_CREDIT),
//       })),
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
const DATE_COLUMN = "GL_ENTRY_DATE"; // TRANS_DATE chaile ekhane bodlao
const VOUCHER_KEY = "ID"; // ekta voucher-er sob line-e same ID (VOUCHERNO type-er majhe repeat hoy)

// ⚠️ COA table/column naam mile nao (workbook-er SQL onujayi: GLDATA.CODE = COA.ACCOUNT_ID)
const COA = {
  table: "COA",
  id: "ACCOUNT_ID",
  path: "FULL_PATH",
  root: "ROOT_ACCOUNT",
};

// COA-te naam nai emon code-er naam
const ACCOUNT_NAME_OVERRIDES = {
  "4030020000": "Egg Sales - Other",
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

const rootKey = (v) => String(v ?? "").trim().toLowerCase();

// "> Asset > CURRENT ASSETS > Cash at BANK (Chicken)"
//   -> { name: "Cash at BANK (Chicken)", group: "CURRENT ASSETS" }
const parsePath = (fullPath) => {
  const parts = String(fullPath ?? "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return { name: null, group: "Others" };
  const name = parts[parts.length - 1];
  const middle = parts
    .slice(1, -1)
    .filter((seg, i, arr) => i === 0 || seg !== arr[i - 1]); // porpor same naam bad
  return { name, group: middle.join(" > ") || "Others" };
};

// Data problem: debit != credit hoye thaka voucher puro skip hobe
const UNBALANCED = `
  SELECT ${VOUCHER_KEY} AS VKEY
    FROM GLDATA
   WHERE ${VOUCHER_KEY} IS NOT NULL
   GROUP BY ${VOUCHER_KEY}
  HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)`;

/* ====================================================================== */
/* Balance sheet (From date - To date)                                     */
/*   Opening = From date-er age porjonto cumulative                        */
/*   Period  = From theke To porjonto movement                             */
/*   Closing = Opening + Period (To date porjonto cumulative)              */
/* ====================================================================== */
export const getBalanceSheet = async (params = {}) => {
  const fromDate = params.from ? String(params.from).trim() : null;
  const toDate = params.to ? String(params.to).trim() : null;
  if (!isValidDate(fromDate) || !isValidDate(toDate)) {
    throw httpError(400, "from ও to date দিতে হবে (format: YYYY-MM-DD)");
  }
  if (fromDate > toDate) {
    throw httpError(400, "from date, to date এর পরে হতে পারবে না");
  }

  const balanceSql = `
    SELECT g.CODE,
           SUM(CASE WHEN TRUNC(g.${DATE_COLUMN}) < TO_DATE(:fromDate, 'YYYY-MM-DD')
                    THEN NVL(g.DEBIT, 0) ELSE 0 END)  AS OPEN_DR,
           SUM(CASE WHEN TRUNC(g.${DATE_COLUMN}) < TO_DATE(:fromDate, 'YYYY-MM-DD')
                    THEN NVL(g.CREDIT, 0) ELSE 0 END) AS OPEN_CR,
           SUM(CASE WHEN TRUNC(g.${DATE_COLUMN}) >= TO_DATE(:fromDate, 'YYYY-MM-DD')
                    THEN NVL(g.DEBIT, 0) ELSE 0 END)  AS MOVE_DR,
           SUM(CASE WHEN TRUNC(g.${DATE_COLUMN}) >= TO_DATE(:fromDate, 'YYYY-MM-DD')
                    THEN NVL(g.CREDIT, 0) ELSE 0 END) AS MOVE_CR
      FROM GLDATA g
     WHERE TRUNC(g.${DATE_COLUMN}) <= TO_DATE(:toDate, 'YYYY-MM-DD')
       AND NOT EXISTS (
             SELECT 1 FROM (${UNBALANCED}) u WHERE u.VKEY = g.${VOUCHER_KEY}
           )
     GROUP BY g.CODE
     ORDER BY g.CODE`;

  const skippedSql = `
    SELECT x.VKEY, x.VOUCHERNO, x.VOUCHER_TYPE, x.TOTAL_DEBIT, x.TOTAL_CREDIT
      FROM (
            SELECT ${VOUCHER_KEY}               AS VKEY,
                   MIN(VOUCHERNO)               AS VOUCHERNO,
                   MIN(VOUCHER_TYPE)            AS VOUCHER_TYPE,
                   SUM(NVL(DEBIT, 0))           AS TOTAL_DEBIT,
                   SUM(NVL(CREDIT, 0))          AS TOTAL_CREDIT,
                   MIN(TRUNC(${DATE_COLUMN}))   AS V_DATE
              FROM GLDATA
             WHERE ${VOUCHER_KEY} IS NOT NULL
             GROUP BY ${VOUCHER_KEY}
            HAVING ROUND(SUM(NVL(DEBIT, 0)), 2) <> ROUND(SUM(NVL(CREDIT, 0)), 2)
           ) x
     WHERE x.V_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')
     ORDER BY x.VOUCHERNO`;

  let conn;
  try {
    conn = await getConnection();
    const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const coaRes = await conn.execute(
      `SELECT ${COA.id} AS CODE, ${COA.path} AS FULL_PATH, ${COA.root} AS ROOT_ACCOUNT
         FROM ${COA.table}`,
      {},
      opts
    );
    const balRes = await conn.execute(balanceSql, { fromDate, toDate }, opts);
    const skipRes = await conn.execute(skippedSql, { toDate }, opts);

    /* ---------- COA map + (COA-te nai emon code-er jonno) root ---------- */
    const coaMap = new Map();
    const digitRoots = new Map(); // prothom digit -> Set(root)
    for (const r of coaRes.rows || []) {
      const code = String(r.CODE);
      const root = rootKey(r.ROOT_ACCOUNT);
      coaMap.set(code, { root, ...parsePath(r.FULL_PATH) });
      const d = code.charAt(0);
      if (!digitRoots.has(d)) digitRoots.set(d, new Set());
      digitRoots.get(d).add(root);
    }
    // Digit-er shob COA account same root hole tai-i root (jemon 4xxx = Income)
    const rootOfDigit = (code) => {
      const set = digitRoots.get(String(code).charAt(0));
      return set && set.size === 1 ? [...set][0] : null;
    };

    /* ---------- account-wise opening / period / closing ---------- */
    const accounts = (balRes.rows || []).map((r) => {
      const code = String(r.CODE);
      const coa = coaMap.get(code);
      return {
        code,
        name: coa?.name || ACCOUNT_NAME_OVERRIDES[code] || code,
        group: coa?.group || "Others",
        root: coa ? coa.root : rootOfDigit(code),
        openDr: Number(r.OPEN_DR) || 0,
        openCr: Number(r.OPEN_CR) || 0,
        moveDr: Number(r.MOVE_DR) || 0,
        moveCr: Number(r.MOVE_CR) || 0,
      };
    });

    const byRoot = (root) => accounts.filter((a) => a.root === root);

    // sign "dr": Asset (debit - credit), "cr": Liability/Equity/Income (credit - debit)
    const amounts = (a, sign) => {
      const open = round2(sign === "dr" ? a.openDr - a.openCr : a.openCr - a.openDr);
      const movement = round2(sign === "dr" ? a.moveDr - a.moveCr : a.moveCr - a.moveDr);
      return { opening: open, movement, closing: round2(open + movement) };
    };
    const addAmt = (x, y) => ({
      opening: round2(x.opening + y.opening),
      movement: round2(x.movement + y.movement),
      closing: round2(x.closing + y.closing),
    });
    const ZERO = { opening: 0, movement: 0, closing: 0 };
    const sumAmt = (list) => list.reduce(addAmt, ZERO);

    const buildGroups = (list, sign) => {
      const groups = new Map();
      for (const a of list) {
        const g = groups.get(a.group) || {
          name: a.group,
          accounts: [],
          total: ZERO,
        };
        const amt = amounts(a, sign);
        g.accounts.push({ code: a.code, name: a.name, ...amt });
        g.total = addAmt(g.total, amt);
        groups.set(a.group, g);
      }
      const arr = [...groups.values()];
      arr.forEach((g) => g.accounts.sort((x, y) => x.code.localeCompare(y.code)));
      arr.sort((x, y) => x.accounts[0].code.localeCompare(y.accounts[0].code));
      return arr;
    };

    const assetGroups = buildGroups(byRoot("asset"), "dr");
    const liabilityGroups = buildGroups(byRoot("liability"), "cr");
    const equityGroups = buildGroups(byRoot("equity"), "cr");

    const totalAssets = sumAmt(assetGroups.map((g) => g.total));
    const totalLiabilities = sumAmt(liabilityGroups.map((g) => g.total));
    const equityAccountsTotal = sumAmt(equityGroups.map((g) => g.total));

    const income = sumAmt(byRoot("income").map((a) => amounts(a, "cr")));
    const expense = sumAmt(byRoot("expense").map((a) => amounts(a, "dr")));
    // Profit: opening = From-er agey porjonto (brought forward), period = ei period-er
    const profit = {
      opening: round2(income.opening - expense.opening),
      movement: round2(income.movement - expense.movement),
      closing: round2(income.closing - expense.closing),
    };

    const totalEquity = addAmt(equityAccountsTotal, profit);
    const totalLiabilitiesEquity = addAmt(totalLiabilities, totalEquity);
    const difference = round2(totalAssets.closing - totalLiabilitiesEquity.closing);
    const openingDifference = round2(totalAssets.opening - totalLiabilitiesEquity.opening);

    // Kono root-e na pore emon account (kono plug chhara alada dekhano hoy)
    const known = new Set(["asset", "liability", "equity", "income", "expense"]);
    const unclassified = accounts
      .filter((a) => !known.has(a.root))
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: round2(a.openDr + a.moveDr - a.openCr - a.moveCr),
      }));

    return {
      from: fromDate,
      to: toDate,
      dateBasis: DATE_COLUMN,
      kpis: {
        totalAssets: totalAssets.closing,
        totalLiabilities: totalLiabilities.closing,
        totalEquity: totalEquity.closing,
        netProfit: profit.movement,
      },
      assets: { groups: assetGroups, total: totalAssets },
      liabilities: { groups: liabilityGroups, total: totalLiabilities },
      equity: {
        groups: equityGroups,
        income,
        expense,
        profit,
        total: totalEquity,
      },
      totalLiabilitiesEquity,
      check: {
        difference,
        balanced: difference === 0 && openingDifference === 0,
      },
      unclassified,
      skippedVouchers: (skipRes.rows || []).map((r) => ({
        voucherNo: r.VOUCHERNO,
        voucherType: r.VOUCHER_TYPE,
        debit: round2(r.TOTAL_DEBIT),
        credit: round2(r.TOTAL_CREDIT),
      })),
    };
  } finally {
    if (conn) await conn.close();
  }
};