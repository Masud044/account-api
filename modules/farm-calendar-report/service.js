import { getConnection, oracledb } from '../../config/db.js';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Keyword-based classification (no schema change, heuristic) ────────────
const CATEGORY_KEYWORDS = {
  VACCINATION: ['vaccin', 'vaccine', 'deworm', 'quarantine', 'disease', 'veterinary', 'health check'],
  FEED: ['feed', 'fodder', 'silage', 'concentrate', 'forage', 'grazing'],
  FINANCIAL: ['Budget', ' Review','Annual', 'Profit', 'Revenue recording', 'Expense Recording', 'p&l', 'Working Capital'],
};

const classify = (name = '', desc = '') => {
  const text = `${name} ${desc}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return category;
  }
  return 'OPERATIONAL';
};

// Known KPI names that map to the "Expected Annual Output" summary block
const OUTPUT_KPI_MAP = {
  cattleFattenedCount: 'Number of Cattle Fattened',
  salesCyclesCount: 'Number of Sales Cycles',
  estimatedAnnualRevenue: 'Estimated Annual Revenue',
  estimatedAnnualGrossProfit: 'Estimated Annual Gross Profit',
};

// ═══════════════════ FARM CALENDAR REPORT (fully derived, no schema change) ═══════════════════
export const getFarmCalendarReport = async (calendarId) => {
  const conn = await getConnection();
  try {
    // 1. Header
    const headerResult = await conn.execute(
      `SELECT CALENDAR_ID, CALENDAR_YEAR, FARM_NAME, STATUS, DESCRIPTION,
              CREATED_BY, TO_CHAR(CREATED_DATE,'YYYY-MM-DD') AS CREATED_DATE
       FROM FARM_CALENDAR_H
       WHERE CALENDAR_ID = :calendarId`,
      { calendarId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const header = headerResult.rows[0] ?? null;
    if (!header) return null;

    // 2. All month-specific activities (unchanged query — no CALENDAR_TYPE column)
    const monthActivities = await conn.execute(
      `SELECT
         DETAIL_ID, ACTIVITY_MONTH, ACTIVITY_NAME, ACTIVITY_DESC,
         RESPONSIBLE_PERSON, STATUS, FARM_TYPE, REMARKS,
         CASE WHEN ACTIVITY_MONTH BETWEEN 1 AND 6 THEN 1 ELSE 2 END AS CYCLE_NO
       FROM FARM_CALENDAR_D
       WHERE CALENDAR_ID = :calendarId
         AND ACTIVITY_MONTH IS NOT NULL
       ORDER BY ACTIVITY_MONTH`,
      { calendarId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 3. Routine activities — recurring, no fixed month
//    const routineActivities = await conn.execute(
//   `SELECT DETAIL_ID, ACTIVITY_NAME, ACTIVITY_DESC, FREQUENCY, FARM_TYPE, ACTIVITY_MONTH, REMARKS
//    FROM FARM_CALENDAR_D
//    WHERE CALENDAR_ID = :calendarId
//    ORDER BY DETAIL_ID`,
//   { calendarId },
//   { outFormat: oracledb.OUT_FORMAT_OBJECT }
// );

    // 4. KPI targets vs actuals (also source for Expected Annual Output)
    const kpiTargets = await conn.execute(
      `SELECT KPI_ID, FARM_TYPE, KPI_NAME, TARGET_VALUE, UNIT, ACTUAL_VALUE, REMARKS
       FROM FARM_KPI_TARGET
       WHERE CALENDAR_ID = :calendarId
       ORDER BY KPI_ID`,
      { calendarId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 5. Actual performance summary
    const actualSummary = await conn.execute(
      `SELECT
         COUNT(DISTINCT CASE WHEN d.ACTIVITY_MONTH BETWEEN 1 AND 6 THEN 1 ELSE 2 END) AS CYCLES_COMPLETED,
         SUM(l.ACTUAL_QTY)     AS TOTAL_ACTUAL_QTY,
         SUM(l.ACTUAL_COST)    AS TOTAL_ACTUAL_COST,
         SUM(l.ACTUAL_REVENUE) AS TOTAL_ACTUAL_REVENUE
       FROM FARM_ACTIVITY_LOG l
       JOIN FARM_CALENDAR_D d ON d.DETAIL_ID = l.DETAIL_ID
       WHERE d.CALENDAR_ID = :calendarId
         AND l.COMPLETION_STATUS = 'COMPLETED'`,
      { calendarId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const withMonthName = (rows) =>
      rows.map((r) => ({ ...r, MONTH_NAME: MONTH_NAMES[r.ACTIVITY_MONTH] ?? null }));

    // ── Derive category buckets from keyword classification ────────────
    const allRows = withMonthName(monthActivities.rows);
    const byCategory = { OPERATIONAL: [], VACCINATION: [], FEED: [], FINANCIAL: [] };
    for (const row of allRows) {
      const cat = classify(row.ACTIVITY_NAME, row.ACTIVITY_DESC);
      byCategory[cat].push(row);
    }

    // ── Derive Expected Annual Output from named KPI rows, if present ──
    const kpiByName = Object.fromEntries(
      kpiTargets.rows.map((k) => [k.KPI_NAME?.trim().toLowerCase(), k])
    );
    const expectedAnnualOutput = Object.fromEntries(
      Object.entries(OUTPUT_KPI_MAP).map(([key, kpiName]) => [
        key,
        kpiByName[kpiName.toLowerCase()]?.TARGET_VALUE ?? null,
      ])
    );

    return {
      header,
      operationalCalendar: {
        cycle1: {
          title: 'Cycle 1 (January – June)',
          activities: byCategory.OPERATIONAL.filter((r) => r.CYCLE_NO === 1),
        },
        cycle2: {
          title: 'Cycle 2 (July – December)',
          activities: byCategory.OPERATIONAL.filter((r) => r.CYCLE_NO === 2),
        },
      },
      routineActivities: routineActivities.rows,
      vaccinationCalendar: byCategory.VACCINATION,
      feedCalendar: byCategory.FEED,
      financialCalendar: byCategory.FINANCIAL,
      kpiTargets: kpiTargets.rows,
      actualPerformance: actualSummary.rows[0] ?? null,
      expectedAnnualOutput, // null fields if matching KPI rows aren't entered
    };
  } finally {
    await conn.close();
  }
};