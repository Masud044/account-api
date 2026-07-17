
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

    // 3. select QTY from CHICKEN_PROJECT_DETAILS where SYSDATE between FROM_DATE and TODATE
   const chickenResult = await conn.execute(
  `select QTY from CHICKEN_PROJECT_DETAILS where TRUNC(SYSDATE) between TRUNC(FROM_DATE) and TRUNC(TO_DATE)`,
  {},
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);
    const totalChicken = chickenResult.rows.reduce(
      (sum, r) => sum + Number(r.QTY || 0), 0
    );

    // 4. egg quantity for the latest production date
    const eggResult = await conn.execute(
      `SELECT SUM(QTY) as EGG_QTY FROM EGG_PRODUCTION
        WHERE PRODUCTION_DATE = (SELECT MAX(PRODUCTION_DATE) FROM EGG_PRODUCTION)`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const eggQty = eggResult.rows[0]?.EGG_QTY ?? 0;

    const eggRatio = totalChicken > 0
      ? Number(((eggQty / totalChicken) * 100).toFixed(2))
      : 0;

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