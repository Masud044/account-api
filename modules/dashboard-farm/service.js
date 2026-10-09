

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

//     // 3. select QTY from CHICKEN_PROJECT_DETAILS where today's date falls in FROM_DATE-TO_DATE range
//     const chickenResult = await conn.execute(
//       `select QTY from CHICKEN_PROJECT_DETAILS where TRUNC(SYSDATE) between TRUNC(FROM_DATE) and TRUNC(TO_DATE)`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const totalChicken = chickenResult.rows.reduce(
//       (sum, r) => sum + Number(r.QTY || 0), 0
//     );

//     // 4. egg ratio using CHICKEN_PROJECT_DETAILS-derived CHICKEN_NUMBER
//     const eggResult = await conn.execute(
//       `SELECT ROUND(qty / a.CHICKEN_NUMBER * 100, 2) AS EGG_PER
//        FROM (
//            SELECT SUM(QTY) AS CHICKEN_NUMBER
//            FROM CHICKEN_PROJECT_DETAILS
//            WHERE TRUNC(SYSDATE) BETWEEN TRUNC(FROM_DATE) AND TRUNC(TO_DATE)
//        ) a,
//        (
//            SELECT SUM(QTY) qty
//            FROM EGG_PRODUCTION
//            WHERE PRODUCTION_DATE = (
//                SELECT MAX(PRODUCTION_DATE)
//                FROM EGG_PRODUCTION
//            )
//            GROUP BY PRODUCTION_DATE
//        ) b`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const eggRatio = eggResult.rows[0]?.EGG_PER ?? 0;

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

const OBJ = { outFormat: oracledb.OUT_FORMAT_OBJECT };

export const getFarmSummary = async () => {
  const conn = await getConnection();
  try {
    // 1. Cows
    const cowResult = await conn.execute(
      `select count(*) as TOTAL_COWS from COW_PROJECT where status=1`,
      {}, OBJ
    );
    const totalCows = cowResult.rows[0]?.TOTAL_COWS ?? 0;

    // 2. Fish
    const fishResult = await conn.execute(
      `select fish_number from FISH_PROJECT`,
      {}, OBJ
    );
    const totalFish = fishResult.rows.reduce(
      (sum, r) => sum + Number(r.FISH_NUMBER || 0), 0
    );

    // 3. Chicken — shade/shed onujayi (ajker date active range er QTY)
    const chickenResult = await conn.execute(
      `SELECT cp.SHADE AS SHED_CODE, NVL(SUM(d.QTY), 0) AS TOTAL_CHICKEN
       FROM CHICKEN_PROJECT cp
       JOIN CHICKEN_PROJECT_DETAILS d ON d.H_ID = cp.ID
       WHERE TRUNC(SYSDATE) BETWEEN TRUNC(d.FROM_DATE) AND TRUNC(d.TO_DATE)
       GROUP BY cp.SHADE`,
      {}, OBJ
    );

    // 4. Egg — prottek shed er nijer latest production date er QTY
    const eggResult = await conn.execute(
      `SELECT cs.SHED_CODE,
              eg.PRODUCTION_DATE,
              SUM(eg.QTY) AS EGG_QTY
       FROM EGG_PRODUCTION eg
       JOIN CHICKEN_SHED cs ON cs.ID = eg.SHED_ID
       WHERE eg.PRODUCTION_DATE = (
               SELECT MAX(e2.PRODUCTION_DATE)
               FROM EGG_PRODUCTION e2
               WHERE e2.SHED_ID = eg.SHED_ID
             )
       GROUP BY cs.SHED_CODE, eg.PRODUCTION_DATE`,
      {}, OBJ
    );

    // ── Merge by shed ──
    const shedMap = {};
    for (const r of chickenResult.rows) {
      const code = r.SHED_CODE ?? 'N/A';
      shedMap[code] = { shed: code, totalChicken: Number(r.TOTAL_CHICKEN || 0), eggQty: 0, eggRatio: 0 };
    }
    for (const r of eggResult.rows) {
      const code = r.SHED_CODE ?? 'N/A';
      if (!shedMap[code]) shedMap[code] = { shed: code, totalChicken: 0, eggQty: 0, eggRatio: 0 };
      shedMap[code].eggQty = Number(r.EGG_QTY || 0);
    }

    const sheds = Object.values(shedMap)
      .map((s) => ({
        ...s,
        eggRatio: s.totalChicken > 0
          ? Number(((s.eggQty / s.totalChicken) * 100).toFixed(2))
          : 0,
      }))
      .sort((a, b) => a.shed.localeCompare(b.shed, undefined, { numeric: true }));

    // ── Overall (aager response compatible) ──
    const totalChicken = sheds.reduce((sum, s) => sum + s.totalChicken, 0);
    const totalEgg     = sheds.reduce((sum, s) => sum + s.eggQty, 0);
    const eggRatio = totalChicken > 0
      ? Number(((totalEgg / totalChicken) * 100).toFixed(2))
      : 0;

    return {
      totalCows:    Number(totalCows),
      totalFish:    Number(totalFish),
      totalChicken,
      eggRatio,
      sheds, // [{ shed:'S-1', totalChicken, eggQty, eggRatio }, { shed:'S-2', ... }]
    };
  } finally {
    await conn.close();
  }
};