import { getConnection, oracledb } from '../../config/db.js';

// ─── FARM SUMMARY (Cow / Chicken / Fish / Egg Ratio cards) ──────────────────
// Queries kept exactly as given — no SUM/NVL added on the SQL side.
// Where a query can return multiple rows (fish_number, CHICKEN_NUMBER,
// Egg_per), the rows are combined in JS after fetching.
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
    // multiple rows possible — sum them in JS for the "Total Fish" card
    const totalFish = fishResult.rows.reduce(
      (sum, r) => sum + Number(r.FISH_NUMBER || 0), 0
    );

    // 3. select CHICKEN_NUMBER from CHICKEN_PROJECT where SYSDATE between FROM_DATE and TODATE
    const chickenResult = await conn.execute(
      `select CHICKEN_NUMBER from CHICKEN_PROJECT where SYSDATE between FROM_DATE and TODATE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    // multiple active lots possible — sum them in JS for the "Chicken" card
    const totalChicken = chickenResult.rows.reduce(
      (sum, r) => sum + Number(r.CHICKEN_NUMBER || 0), 0
    );

    // 4. egg percentage
    const eggResult = await conn.execute(
      `select round(qty/a.CHICKEN_NUMBER *100,2) Egg_per
         from CHICKEN_PROJECT a,
              ( SELECT SUM(QTY) qty FROM EGG_PRODUCTION
                WHERE PRODUCTION_DATE = (SELECT MAX(PRODUCTION_DATE) FROM EGG_PRODUCTION)
                GROUP BY PRODUCTION_DATE) b
        where SYSDATE between FROM_DATE and TODATE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    // take the first row's ratio (single active lot expected for this card)
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