import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ FARM BUDGET (Header) ═══════════════════
export const createFarmBudget = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_BUDGET_H (
        B_MONTH, BUDGET_YEAR, FARM_NAME, CREATED_BY
      ) VALUES (
        :bMonth, :budgetYear, :farmName, :createdBy
      ) RETURNING BUDGET_ID INTO :outId`,
      {
        bMonth:     data.bMonth ?? null,
        budgetYear: data.budgetYear ?? null,
        farmName:   data.farmName ?? null,
        createdBy:  data.createdBy ?? null,
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

export const getAllFarmBudgets = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         BUDGET_ID,
         B_MONTH,
         BUDGET_YEAR,
         FARM_NAME,
         STATUS,
         CREATED_BY,
         TO_CHAR(CREATED_DATE, 'YYYY-MM-DD') AS CREATED_DATE
       FROM FARM_BUDGET_H
       ORDER BY BUDGET_ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getFarmBudgetById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         BUDGET_ID,
         B_MONTH,
         BUDGET_YEAR,
         FARM_NAME,
         STATUS,
         CREATED_BY,
         TO_CHAR(CREATED_DATE, 'YYYY-MM-DD') AS CREATED_DATE
       FROM FARM_BUDGET_H
       WHERE BUDGET_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateFarmBudget = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_BUDGET_H
         SET B_MONTH     = :bMonth,
             BUDGET_YEAR = :budgetYear,
             FARM_NAME   = :farmName,
             STATUS      = :status
       WHERE BUDGET_ID = :id`,
      {
        bMonth:     data.bMonth ?? null,
        budgetYear: data.budgetYear ?? null,
        farmName:   data.farmName ?? null,
        status:     data.status ?? 'DRAFT',
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Farm budget not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFarmBudget = async (id) => {
  const conn = await getConnection();
  try {
    // cascade: details -> header
    await conn.execute(`DELETE FROM FARM_BUDGET_D WHERE BUDGET_ID = :id`, { id }, { autoCommit: false });
    const result = await conn.execute(`DELETE FROM FARM_BUDGET_H WHERE BUDGET_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ COUNTS (for tab badges) ═══════════════════
export const getFarmBudgetCounts = async (budgetId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         (SELECT COUNT(*) FROM FARM_BUDGET_D WHERE BUDGET_ID = :budgetId) AS DETAILS_COUNT
       FROM DUAL`,
      { budgetId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

// ═══════════════════ FARM BUDGET DETAILS (Expense Lines) ═══════════════════
export const createFarmBudgetDetail = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_BUDGET_D (
        BUDGET_ID, FARM_TYPE, EXPENSE_HEAD, BUDGET_MONTH, EXPENSE_CODE, BUDGET_AMOUNT
      ) VALUES (
        :budgetId, :farmType, :expenseHead, :budgetMonth, :expenseCode, :budgetAmount
      ) RETURNING BUDGET_DETAIL_ID INTO :outId`,
      {
        budgetId:     data.budgetId ?? null,
        farmType:     data.farmType ?? null,
        expenseHead:  data.expenseHead ?? null,
        budgetMonth:  data.budgetMonth ?? null,
        expenseCode:  data.expenseCode ?? null,
        budgetAmount: data.budgetAmount ?? null,
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

export const getDetailsByBudgetId = async (budgetId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         BUDGET_DETAIL_ID, BUDGET_ID, FARM_TYPE, EXPENSE_HEAD,
         BUDGET_MONTH, EXPENSE_CODE, BUDGET_AMOUNT
       FROM FARM_BUDGET_D
       WHERE BUDGET_ID = :budgetId
       ORDER BY BUDGET_DETAIL_ID`,
      { budgetId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateFarmBudgetDetail = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_BUDGET_D
         SET FARM_TYPE     = :farmType,
             EXPENSE_HEAD  = :expenseHead,
             BUDGET_MONTH  = :budgetMonth,
             EXPENSE_CODE  = :expenseCode,
             BUDGET_AMOUNT = :budgetAmount
       WHERE BUDGET_DETAIL_ID = :id`,
      {
        farmType:     data.farmType ?? null,
        expenseHead:  data.expenseHead ?? null,
        budgetMonth:  data.budgetMonth ?? null,
        expenseCode:  data.expenseCode ?? null,
        budgetAmount: data.budgetAmount ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Budget detail not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFarmBudgetDetail = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM FARM_BUDGET_D WHERE BUDGET_DETAIL_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ EXPENSE ACCOUNTS (COA leaf nodes under Expense) ═══════════════════
export const getExpenseAccounts = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ACCOUNT_ID, FULL_PATH
         FROM COA
        WHERE IS_LEAF = 1
          AND ROOT_ACCOUNT = 'Expense'
        ORDER BY FULL_PATH`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};