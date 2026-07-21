
// import { getConnection, oracledb } from '../../config/db.js';
// export const getFarmSummary = async () => {
//   const conn = await getConnection();
//   try {
//     // 1. select count(*) from COW_PROJECT where status=1
//     const cowResult = await conn.execute(
//       `select count(*) as TOTAL_COWS from COW_PROJECT where status=1`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const totalCows = cowResult.rows[0]?.TOTAL_COWS ?? 0;

//     // 2. select fish_number from FISH_PROJECT
//     const fishResult = await conn.execute(
//       `select fish_number from FISH_PROJECT`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const totalFish = fishResult.rows.reduce(
//       (sum, r) => sum + Number(r.FISH_NUMBER || 0), 0
//     );

//     // 3. select QTY from CHICKEN_PROJECT_DETAILS where SYSDATE between FROM_DATE and TODATE
//    const chickenResult = await conn.execute(
//   `select QTY from CHICKEN_PROJECT_DETAILS where TRUNC(SYSDATE) between TRUNC(FROM_DATE) and TRUNC(TO_DATE)`,
//   {},
//   { outFormat: oracledb.OUT_FORMAT_OBJECT }
// );
//     const totalChicken = chickenResult.rows.reduce(
//       (sum, r) => sum + Number(r.QTY || 0), 0
//     );

//     // 4. egg quantity for the latest production date
//     // const eggResult = await conn.execute(
//     //   `SELECT SUM(QTY) as EGG_QTY FROM EGG_PRODUCTION
//     //     WHERE PRODUCTION_DATE = (SELECT MAX(PRODUCTION_DATE) FROM EGG_PRODUCTION)`,
//     //   {},
//     //   { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     // );
//     // const eggQty = eggResult.rows[0]?.EGG_QTY ?? 0;

//     // const eggRatio = totalChicken > 0
//     //   ? Number(((eggQty / totalChicken) * 100).toFixed(2))
//     //   : 0;

//     const eggResult = await conn.execute(
//   `
//   SELECT ROUND(qty / a.CHICKEN_NUMBER * 100, 2) AS EGG_PER
//   FROM CHICKEN_PROJECT a,
//   (
//       SELECT SUM(QTY) qty
//       FROM EGG_PRODUCTION
//       WHERE PRODUCTION_DATE = (
//           SELECT MAX(PRODUCTION_DATE)
//           FROM EGG_PRODUCTION
//       )
//       GROUP BY PRODUCTION_DATE
//   ) b
//   WHERE SYSDATE BETWEEN a.FROM_DATE AND a.TODATE
//   `,
//   {},
//   { outFormat: oracledb.OUT_FORMAT_OBJECT }
// );

// const eggRatio = eggResult.rows[0]?.EGG_PER ?? 0;

//     return {
//       totalCows:    Number(totalCows),
//       totalFish:    Number(totalFish),
//       totalChicken: Number(totalChicken),
//       eggRatio:     Number(eggRatio),
//     };
//   } finally {
//     await conn.close();
//   }
// };

import { getConnection, oracledb } from '../../config/db.js';

export const getFarmSummary = async () => {
  const conn = await getConnection();
  try {
    // 1. select count(*) from COW_PROJECT where status=1
    const cowResult = await conn.execute(
      `select count(*) as TOTAL_COWS from COW_PROJECT where status=1`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const totalCows = cowResult.rows[0]?.TOTAL_COWS ?? 0;

    // 2. select fish_number from FISH_PROJECT
    const fishResult = await conn.execute(
      `select fish_number from FISH_PROJECT`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const totalFish = fishResult.rows.reduce(
      (sum, r) => sum + Number(r.FISH_NUMBER || 0), 0
    );

    // 3. select QTY from CHICKEN_PROJECT_DETAILS where today's date falls in FROM_DATE-TO_DATE range
    const chickenResult = await conn.execute(
      `select QTY from CHICKEN_PROJECT_DETAILS where TRUNC(SYSDATE) between TRUNC(FROM_DATE) and TRUNC(TO_DATE)`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const totalChicken = chickenResult.rows.reduce(
      (sum, r) => sum + Number(r.QTY || 0), 0
    );

    // 4. egg ratio using CHICKEN_PROJECT_DETAILS-derived CHICKEN_NUMBER
    const eggResult = await conn.execute(
      `SELECT ROUND(qty / a.CHICKEN_NUMBER * 100, 2) AS EGG_PER
       FROM (
           SELECT SUM(QTY) AS CHICKEN_NUMBER
           FROM CHICKEN_PROJECT_DETAILS
           WHERE TRUNC(SYSDATE) BETWEEN TRUNC(FROM_DATE) AND TRUNC(TO_DATE)
       ) a,
       (
           SELECT SUM(QTY) qty
           FROM EGG_PRODUCTION
           WHERE PRODUCTION_DATE = (
               SELECT MAX(PRODUCTION_DATE)
               FROM EGG_PRODUCTION
           )
           GROUP BY PRODUCTION_DATE
       ) b`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const eggRatio = eggResult.rows[0]?.EGG_PER ?? 0;

    return {
      totalCows:    Number(totalCows),
      totalFish:    Number(totalFish),
      totalChicken: Number(totalChicken),
      eggRatio:     Number(eggRatio),
    };
  } finally {
    await conn.close();
  }
};