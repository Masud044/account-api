import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ FINANCIAL PROJECTIONS ═══════════════════
// NOTE: GROSS_PROFIT is a VIRTUAL/GENERATED column in FINANCIAL_PROJECTIONS
// (e.g. GROSS_PROFIT GENERATED ALWAYS AS (REVENUE_AMOUNT - OPERATING_COST) VIRTUAL).
// Oracle throws ORA-54013 if you try to INSERT/UPDATE it directly — so it must
// NEVER appear in the INSERT column list or UPDATE SET clause. We just SELECT it
// back afterwards since Oracle computes it automatically.

export const createFinancialProjection = async (data) => {
  const conn = await getConnection();
  try {
    const revenueAmount = data.revenueAmount ?? 0;
    const operatingCost = data.operatingCost ?? 0;

    const result = await conn.execute(
      `INSERT INTO FINANCIAL_PROJECTIONS (
        PROJECT_ID, PROJECTION_SCOPE, REVENUE_AMOUNT, OPERATING_COST
      ) VALUES (
        :projectId, :projectionScope, :revenueAmount, :operatingCost
      ) RETURNING PROJECTION_ID INTO :outId`,
      {
        projectId:       data.projectId ?? null,
        projectionScope: data.projectionScope ?? null,
        revenueAmount,
        operatingCost,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    await conn.commit();
    return { id: result.outBinds.outId[0] };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// Standalone list — no projectId filter. Joins PROJECT_NAME from BWA.PROJECTS
// so the frontend doesn't need to build its own lookup map.
export const getAllFinancialProjections = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         FP.PROJECTION_ID, FP.PROJECT_ID, FP.PROJECTION_SCOPE,
         FP.REVENUE_AMOUNT, FP.OPERATING_COST, FP.GROSS_PROFIT,
         P.PROJECT_NAME
       FROM FINANCIAL_PROJECTIONS FP
       LEFT JOIN BWA.PROJECTS P ON P.PROJECT_ID = FP.PROJECT_ID
       ORDER BY FP.PROJECTION_ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateFinancialProjection = async (id, data) => {
  const conn = await getConnection();
  try {
    const revenueAmount = data.revenueAmount ?? 0;
    const operatingCost = data.operatingCost ?? 0;

    const result = await conn.execute(
      `UPDATE FINANCIAL_PROJECTIONS
         SET PROJECT_ID       = :projectId,
             PROJECTION_SCOPE = :projectionScope,
             REVENUE_AMOUNT   = :revenueAmount,
             OPERATING_COST   = :operatingCost
       WHERE PROJECTION_ID = :id`,
      {
        projectId: data.projectId ?? null,
        projectionScope: data.projectionScope ?? null,
        revenueAmount,
        operatingCost,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Financial projection not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFinancialProjection = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM FINANCIAL_PROJECTIONS WHERE PROJECTION_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};