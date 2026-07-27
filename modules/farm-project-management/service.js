// import { getConnection, oracledb } from '../../config/db.js';

// // ═══════════════════ FARM PROJECT (Header) ═══════════════════
// export const createFarmProject = async (data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO FARM_PROJECT (
//         PROJECT_CODE, PROJECT_NAME, PROJECT_TYPE, START_DATE, END_DATE, BUDGET_AMOUNT, STATUS
//       ) VALUES (
//         :projectCode, :projectName, :projectType, :startDate, :endDate, :budgetAmount, :status
//       ) RETURNING PROJECT_ID INTO :outId`,
//       {
//         projectCode:  data.projectCode ?? null,
//         projectName:  data.projectName ?? null,
//         projectType:  data.projectType ?? null,
//         startDate:    data.startDate ?? null,
//         endDate:      data.endDate ?? null,
//         budgetAmount: data.budgetAmount ?? null,
//         status:       data.status ?? 'PLANNED',
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getAllFarmProjects = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PROJECT_ID,
//          PROJECT_CODE,
//          PROJECT_NAME,
//          PROJECT_TYPE,
//          TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
//          TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
//          BUDGET_AMOUNT,
//          STATUS
//        FROM FARM_PROJECT
//        ORDER BY PROJECT_ID DESC`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getFarmProjectById = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PROJECT_ID,
//          PROJECT_CODE,
//          PROJECT_NAME,
//          PROJECT_TYPE,
//          TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
//          TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
//          BUDGET_AMOUNT,
//          STATUS
//        FROM FARM_PROJECT
//        WHERE PROJECT_ID = :id`,
//       { id },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFarmProject = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE FARM_PROJECT
//          SET PROJECT_CODE  = :projectCode,
//              PROJECT_NAME  = :projectName,
//              PROJECT_TYPE  = :projectType,
//              START_DATE    = :startDate,
//              END_DATE      = :endDate,
//              BUDGET_AMOUNT = :budgetAmount,
//              STATUS        = :status
//        WHERE PROJECT_ID = :id`,
//       {
//         projectCode:  data.projectCode ?? null,
//         projectName:  data.projectName ?? null,
//         projectType:  data.projectType ?? null,
//         startDate:    data.startDate ?? null,
//         endDate:      data.endDate ?? null,
//         budgetAmount: data.budgetAmount ?? null,
//         status:       data.status ?? 'PLANNED',
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Farm project not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFarmProject = async (id) => {
//   const conn = await getConnection();
//   try {
//     // cascade: activities -> phases -> financial projections -> project
//     await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM FARM_PROJECT_PHASE WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM FINANCIAL_PROJECTIONS WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     const result = await conn.execute(`DELETE FROM FARM_PROJECT WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════ FARM PROJECT PHASE ═══════════════════
// export const createFarmProjectPhase = async (data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO FARM_PROJECT_PHASE (
//         PROJECT_ID, PHASE_NAME, START_DATE, END_DATE, STATUS
//       ) VALUES (
//         :projectId, :phaseName, :startDate, :endDate, :status
//       ) RETURNING PHASE_ID INTO :outId`,
//       {
//         projectId: data.projectId ?? null,
//         phaseName: data.phaseName ?? null,
//         startDate: data.startDate ?? null,
//         endDate:   data.endDate ?? null,
//         status:    data.status ?? 'PLANNED',
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getPhasesByProjectId = async (projectId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PHASE_ID, PROJECT_ID, PHASE_NAME,
//          TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
//          TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
//          STATUS
//        FROM FARM_PROJECT_PHASE
//        WHERE PROJECT_ID = :projectId
//        ORDER BY PHASE_ID`,
//       { projectId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFarmProjectPhase = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE FARM_PROJECT_PHASE
//          SET PHASE_NAME = :phaseName,
//              START_DATE = :startDate,
//              END_DATE   = :endDate,
//              STATUS     = :status
//        WHERE PHASE_ID = :id`,
//       {
//         phaseName: data.phaseName ?? null,
//         startDate: data.startDate ?? null,
//         endDate:   data.endDate ?? null,
//         status:    data.status ?? 'PLANNED',
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Farm project phase not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFarmProjectPhase = async (id) => {
//   const conn = await getConnection();
//   try {
//     // cascade: activities -> phase
//     await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE PHASE_ID = :id`, { id }, { autoCommit: false });
//     const result = await conn.execute(`DELETE FROM FARM_PROJECT_PHASE WHERE PHASE_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════ FARM PROJECT ACTIVITY ═══════════════════
// export const createFarmProjectActivity = async (data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO FARM_PROJECT_ACTIVITY (
//         PROJECT_ID, PHASE_ID, ACTIVITY_NAME, PLAN_START_DATE, PLAN_END_DATE, STATUS
//       ) VALUES (
//         :projectId, :phaseId, :activityName, :planStartDate, :planEndDate, :status
//       ) RETURNING ACTIVITY_ID INTO :outId`,
//       {
//         projectId:     data.projectId ?? null,
//         phaseId:       data.phaseId ?? null,
//         activityName:  data.activityName ?? null,
//         planStartDate: data.planStartDate ?? null,
//         planEndDate:   data.planEndDate ?? null,
//         status:        data.status ?? 'PLANNED',
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getActivitiesByPhaseId = async (phaseId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          ACTIVITY_ID, PROJECT_ID, PHASE_ID, ACTIVITY_NAME,
//          TO_CHAR(PLAN_START_DATE, 'YYYY-MM-DD') AS PLAN_START_DATE,
//          TO_CHAR(PLAN_END_DATE, 'YYYY-MM-DD')   AS PLAN_END_DATE,
//          STATUS
//        FROM FARM_PROJECT_ACTIVITY
//        WHERE PHASE_ID = :phaseId
//        ORDER BY ACTIVITY_ID`,
//       { phaseId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getActivitiesByProjectId = async (projectId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          ACTIVITY_ID, PROJECT_ID, PHASE_ID, ACTIVITY_NAME,
//          TO_CHAR(PLAN_START_DATE, 'YYYY-MM-DD') AS PLAN_START_DATE,
//          TO_CHAR(PLAN_END_DATE, 'YYYY-MM-DD')   AS PLAN_END_DATE,
//          STATUS
//        FROM FARM_PROJECT_ACTIVITY
//        WHERE PROJECT_ID = :projectId
//        ORDER BY PHASE_ID, ACTIVITY_ID`,
//       { projectId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFarmProjectActivity = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE FARM_PROJECT_ACTIVITY
//          SET ACTIVITY_NAME   = :activityName,
//              PLAN_START_DATE = :planStartDate,
//              PLAN_END_DATE   = :planEndDate,
//              STATUS          = :status
//        WHERE ACTIVITY_ID = :id`,
//       {
//         activityName:  data.activityName ?? null,
//         planStartDate: data.planStartDate ?? null,
//         planEndDate:   data.planEndDate ?? null,
//         status:        data.status ?? 'PLANNED',
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Farm project activity not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFarmProjectActivity = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE ACTIVITY_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════ FINANCIAL PROJECTIONS ═══════════════════
// export const createFinancialProjection = async (data) => {
//   const conn = await getConnection();
//   try {
//     const revenueAmount  = data.revenueAmount ?? 0;
//     const operatingCost  = data.operatingCost ?? 0;
//     const grossProfit    = revenueAmount - operatingCost;

//     const result = await conn.execute(
//       `INSERT INTO FINANCIAL_PROJECTIONS (
//         PROJECT_ID, PROJECTION_SCOPE, REVENUE_AMOUNT, OPERATING_COST, GROSS_PROFIT
//       ) VALUES (
//         :projectId, :projectionScope, :revenueAmount, :operatingCost, :grossProfit
//       ) RETURNING PROJECTION_ID INTO :outId`,
//       {
//         projectId:       data.projectId ?? null,
//         projectionScope: data.projectionScope ?? null,
//         revenueAmount,
//         operatingCost,
//         grossProfit,
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getFinancialProjectionsByProjectId = async (projectId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PROJECTION_ID, PROJECT_ID, PROJECTION_SCOPE,
//          REVENUE_AMOUNT, OPERATING_COST, GROSS_PROFIT
//        FROM FINANCIAL_PROJECTIONS
//        WHERE PROJECT_ID = :projectId
//        ORDER BY PROJECTION_ID`,
//       { projectId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFinancialProjection = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const revenueAmount = data.revenueAmount ?? 0;
//     const operatingCost = data.operatingCost ?? 0;
//     const grossProfit   = revenueAmount - operatingCost;

//     const result = await conn.execute(
//       `UPDATE FINANCIAL_PROJECTIONS
//          SET PROJECTION_SCOPE = :projectionScope,
//              REVENUE_AMOUNT   = :revenueAmount,
//              OPERATING_COST   = :operatingCost,
//              GROSS_PROFIT     = :grossProfit
//        WHERE PROJECTION_ID = :id`,
//       {
//         projectionScope: data.projectionScope ?? null,
//         revenueAmount,
//         operatingCost,
//         grossProfit,
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Financial projection not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFinancialProjection = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(`DELETE FROM FINANCIAL_PROJECTIONS WHERE PROJECTION_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };


// import { getConnection, oracledb } from '../../config/db.js';

// // ═══════════════════ FARM PROJECT (Header) ═══════════════════
// export const createFarmProject = async (data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO FARM_PROJECT (
//         PROJECT_CODE, PROJECT_NAME, PROJECT_TYPE, START_DATE, END_DATE, BUDGET_AMOUNT, STATUS
//       ) VALUES (
//         :projectCode, :projectName, :projectType,
//         TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'),
//         :budgetAmount, :status
//       ) RETURNING PROJECT_ID INTO :outId`,
//       {
//         projectCode:  data.projectCode ?? null,
//         projectName:  data.projectName ?? null,
//         projectType:  data.projectType ?? null,
//         startDate:    data.startDate ?? null,
//         endDate:      data.endDate ?? null,
//         budgetAmount: data.budgetAmount ?? null,
//         status:       data.status ?? 'PLANNED',
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getAllFarmProjects = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PROJECT_ID,
//          PROJECT_CODE,
//          PROJECT_NAME,
//          PROJECT_TYPE,
//          TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
//          TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
//          BUDGET_AMOUNT,
//          STATUS
//        FROM FARM_PROJECT
//        ORDER BY PROJECT_ID DESC`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getFarmProjectById = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PROJECT_ID,
//          PROJECT_CODE,
//          PROJECT_NAME,
//          PROJECT_TYPE,
//          TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
//          TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
//          BUDGET_AMOUNT,
//          STATUS
//        FROM FARM_PROJECT
//        WHERE PROJECT_ID = :id`,
//       { id },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFarmProject = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE FARM_PROJECT
//          SET PROJECT_CODE  = :projectCode,
//              PROJECT_NAME  = :projectName,
//              PROJECT_TYPE  = :projectType,
//              START_DATE    = TO_DATE(:startDate, 'YYYY-MM-DD'),
//              END_DATE      = TO_DATE(:endDate, 'YYYY-MM-DD'),
//              BUDGET_AMOUNT = :budgetAmount,
//              STATUS        = :status
//        WHERE PROJECT_ID = :id`,
//       {
//         projectCode:  data.projectCode ?? null,
//         projectName:  data.projectName ?? null,
//         projectType:  data.projectType ?? null,
//         startDate:    data.startDate ?? null,
//         endDate:      data.endDate ?? null,
//         budgetAmount: data.budgetAmount ?? null,
//         status:       data.status ?? 'PLANNED',
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Farm project not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFarmProject = async (id) => {
//   const conn = await getConnection();
//   try {
//     // cascade: activities -> phases -> financial projections -> project
//     await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM FARM_PROJECT_PHASE WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     await conn.execute(`DELETE FROM FINANCIAL_PROJECTIONS WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     const result = await conn.execute(`DELETE FROM FARM_PROJECT WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════ FARM PROJECT PHASE ═══════════════════
// export const createFarmProjectPhase = async (data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO FARM_PROJECT_PHASE (
//         PROJECT_ID, PHASE_NAME, START_DATE, END_DATE, STATUS
//       ) VALUES (
//         :projectId, :phaseName,
//         TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'),
//         :status
//       ) RETURNING PHASE_ID INTO :outId`,
//       {
//         projectId: data.projectId ?? null,
//         phaseName: data.phaseName ?? null,
//         startDate: data.startDate ?? null,
//         endDate:   data.endDate ?? null,
//         status:    data.status ?? 'PLANNED',
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getPhasesByProjectId = async (projectId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PHASE_ID, PROJECT_ID, PHASE_NAME,
//          TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
//          TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
//          STATUS
//        FROM FARM_PROJECT_PHASE
//        WHERE PROJECT_ID = :projectId
//        ORDER BY PHASE_ID`,
//       { projectId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFarmProjectPhase = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE FARM_PROJECT_PHASE
//          SET PHASE_NAME = :phaseName,
//              START_DATE = TO_DATE(:startDate, 'YYYY-MM-DD'),
//              END_DATE   = TO_DATE(:endDate, 'YYYY-MM-DD'),
//              STATUS     = :status
//        WHERE PHASE_ID = :id`,
//       {
//         phaseName: data.phaseName ?? null,
//         startDate: data.startDate ?? null,
//         endDate:   data.endDate ?? null,
//         status:    data.status ?? 'PLANNED',
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Farm project phase not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFarmProjectPhase = async (id) => {
//   const conn = await getConnection();
//   try {
//     // cascade: activities -> phase
//     await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE PHASE_ID = :id`, { id }, { autoCommit: false });
//     const result = await conn.execute(`DELETE FROM FARM_PROJECT_PHASE WHERE PHASE_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════ FARM PROJECT ACTIVITY ═══════════════════
// export const createFarmProjectActivity = async (data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `INSERT INTO FARM_PROJECT_ACTIVITY (
//         PROJECT_ID, PHASE_ID, ACTIVITY_NAME, PLAN_START_DATE, PLAN_END_DATE, STATUS
//       ) VALUES (
//         :projectId, :phaseId, :activityName,
//         TO_DATE(:planStartDate, 'YYYY-MM-DD'), TO_DATE(:planEndDate, 'YYYY-MM-DD'),
//         :status
//       ) RETURNING ACTIVITY_ID INTO :outId`,
//       {
//         projectId:     data.projectId ?? null,
//         phaseId:       data.phaseId ?? null,
//         activityName:  data.activityName ?? null,
//         planStartDate: data.planStartDate ?? null,
//         planEndDate:   data.planEndDate ?? null,
//         status:        data.status ?? 'PLANNED',
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getActivitiesByPhaseId = async (phaseId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          ACTIVITY_ID, PROJECT_ID, PHASE_ID, ACTIVITY_NAME,
//          TO_CHAR(PLAN_START_DATE, 'YYYY-MM-DD') AS PLAN_START_DATE,
//          TO_CHAR(PLAN_END_DATE, 'YYYY-MM-DD')   AS PLAN_END_DATE,
//          STATUS
//        FROM FARM_PROJECT_ACTIVITY
//        WHERE PHASE_ID = :phaseId
//        ORDER BY ACTIVITY_ID`,
//       { phaseId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const getActivitiesByProjectId = async (projectId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          ACTIVITY_ID, PROJECT_ID, PHASE_ID, ACTIVITY_NAME,
//          TO_CHAR(PLAN_START_DATE, 'YYYY-MM-DD') AS PLAN_START_DATE,
//          TO_CHAR(PLAN_END_DATE, 'YYYY-MM-DD')   AS PLAN_END_DATE,
//          STATUS
//        FROM FARM_PROJECT_ACTIVITY
//        WHERE PROJECT_ID = :projectId
//        ORDER BY PHASE_ID, ACTIVITY_ID`,
//       { projectId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFarmProjectActivity = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE FARM_PROJECT_ACTIVITY
//          SET ACTIVITY_NAME   = :activityName,
//              PLAN_START_DATE = TO_DATE(:planStartDate, 'YYYY-MM-DD'),
//              PLAN_END_DATE   = TO_DATE(:planEndDate, 'YYYY-MM-DD'),
//              STATUS          = :status
//        WHERE ACTIVITY_ID = :id`,
//       {
//         activityName:  data.activityName ?? null,
//         planStartDate: data.planStartDate ?? null,
//         planEndDate:   data.planEndDate ?? null,
//         status:        data.status ?? 'PLANNED',
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Farm project activity not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFarmProjectActivity = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE ACTIVITY_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════ FINANCIAL PROJECTIONS ═══════════════════
// // NOTE: GROSS_PROFIT is a VIRTUAL/GENERATED column in FINANCIAL_PROJECTIONS
// // (e.g. GROSS_PROFIT GENERATED ALWAYS AS (REVENUE_AMOUNT - OPERATING_COST) VIRTUAL).
// // Oracle throws ORA-54013 if you try to INSERT/UPDATE it directly — so it must
// // NEVER appear in the INSERT column list or UPDATE SET clause. We just SELECT it
// // back afterwards since Oracle computes it automatically.
// export const createFinancialProjection = async (data) => {
//   const conn = await getConnection();
//   try {
//     const revenueAmount = data.revenueAmount ?? 0;
//     const operatingCost = data.operatingCost ?? 0;

//     const result = await conn.execute(
//       `INSERT INTO FINANCIAL_PROJECTIONS (
//         PROJECT_ID, PROJECTION_SCOPE, REVENUE_AMOUNT, OPERATING_COST
//       ) VALUES (
//         :projectId, :projectionScope, :revenueAmount, :operatingCost
//       ) RETURNING PROJECTION_ID INTO :outId`,
//       {
//         projectId:       data.projectId ?? null,
//         projectionScope: data.projectionScope ?? null,
//         revenueAmount,
//         operatingCost,
//         outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     await conn.commit();
//     return { id: result.outBinds.outId[0] };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const getFinancialProjectionsByProjectId = async (projectId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//          PROJECTION_ID, PROJECT_ID, PROJECTION_SCOPE,
//          REVENUE_AMOUNT, OPERATING_COST, GROSS_PROFIT
//        FROM FINANCIAL_PROJECTIONS
//        WHERE PROJECT_ID = :projectId
//        ORDER BY PROJECTION_ID`,
//       { projectId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateFinancialProjection = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const revenueAmount = data.revenueAmount ?? 0;
//     const operatingCost = data.operatingCost ?? 0;

//     const result = await conn.execute(
//       `UPDATE FINANCIAL_PROJECTIONS
//          SET PROJECTION_SCOPE = :projectionScope,
//              REVENUE_AMOUNT   = :revenueAmount,
//              OPERATING_COST   = :operatingCost
//        WHERE PROJECTION_ID = :id`,
//       {
//         projectionScope: data.projectionScope ?? null,
//         revenueAmount,
//         operatingCost,
//         id,
//       },
//       { autoCommit: false }
//     );
//     if (result.rowsAffected === 0) throw new Error('Financial projection not found.');
//     await conn.commit();
//     return { id, rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// export const deleteFinancialProjection = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(`DELETE FROM FINANCIAL_PROJECTIONS WHERE PROJECTION_ID = :id`, { id }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };


import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ FARM PROJECT (Header) ═══════════════════
export const createFarmProject = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_PROJECT (
        PROJECT_CODE, PROJECT_NAME, PROJECT_TYPE, START_DATE, END_DATE, BUDGET_AMOUNT, STATUS
      ) VALUES (
        :projectCode, :projectName, :projectType,
        TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'),
        :budgetAmount, :status
      ) RETURNING PROJECT_ID INTO :outId`,
      {
        projectCode:  data.projectCode ?? null,
        projectName:  data.projectName ?? null,
        projectType:  data.projectType ?? null,
        startDate:    data.startDate ?? null,
        endDate:      data.endDate ?? null,
        budgetAmount: data.budgetAmount ?? null,
        status:       data.status ?? 'PLANNED',
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

export const getAllFarmProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         PROJECT_ID,
         PROJECT_CODE,
         PROJECT_NAME,
         PROJECT_TYPE,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
         BUDGET_AMOUNT,
         STATUS
       FROM FARM_PROJECT
       ORDER BY PROJECT_ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getFarmProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         PROJECT_ID,
         PROJECT_CODE,
         PROJECT_NAME,
         PROJECT_TYPE,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
         BUDGET_AMOUNT,
         STATUS
       FROM FARM_PROJECT
       WHERE PROJECT_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateFarmProject = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_PROJECT
         SET PROJECT_CODE  = :projectCode,
             PROJECT_NAME  = :projectName,
             PROJECT_TYPE  = :projectType,
             START_DATE    = TO_DATE(:startDate, 'YYYY-MM-DD'),
             END_DATE      = TO_DATE(:endDate, 'YYYY-MM-DD'),
             BUDGET_AMOUNT = :budgetAmount,
             STATUS        = :status
       WHERE PROJECT_ID = :id`,
      {
        projectCode:  data.projectCode ?? null,
        projectName:  data.projectName ?? null,
        projectType:  data.projectType ?? null,
        startDate:    data.startDate ?? null,
        endDate:      data.endDate ?? null,
        budgetAmount: data.budgetAmount ?? null,
        status:       data.status ?? 'PLANNED',
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Farm project not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFarmProject = async (id) => {
  const conn = await getConnection();
  try {
    // cascade: activities -> phases -> financial projections -> project
    await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM FARM_PROJECT_PHASE WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
    await conn.execute(`DELETE FROM FINANCIAL_PROJECTIONS WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
    const result = await conn.execute(`DELETE FROM FARM_PROJECT WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ FARM PROJECT PHASE ═══════════════════
export const createFarmProjectPhase = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_PROJECT_PHASE (
        PROJECT_ID, PHASE_NAME, START_DATE, END_DATE, STATUS
      ) VALUES (
        :projectId, :phaseName,
        TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'),
        :status
      ) RETURNING PHASE_ID INTO :outId`,
      {
        projectId: data.projectId ?? null,
        phaseName: data.phaseName ?? null,
        startDate: data.startDate ?? null,
        endDate:   data.endDate ?? null,
        status:    data.status ?? 'PLANNED',
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

export const getPhasesByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         PHASE_ID, PROJECT_ID, PHASE_NAME,
         TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE,
         TO_CHAR(END_DATE, 'YYYY-MM-DD')   AS END_DATE,
         STATUS
       FROM FARM_PROJECT_PHASE
       WHERE PROJECT_ID = :projectId
       ORDER BY PHASE_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateFarmProjectPhase = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_PROJECT_PHASE
         SET PROJECT_ID = :projectId,
             PHASE_NAME = :phaseName,
             START_DATE = TO_DATE(:startDate, 'YYYY-MM-DD'),
             END_DATE   = TO_DATE(:endDate, 'YYYY-MM-DD'),
             STATUS     = :status
       WHERE PHASE_ID = :id`,
      {
        projectId: data.projectId ?? null,
        phaseName: data.phaseName ?? null,
        startDate: data.startDate ?? null,
        endDate:   data.endDate ?? null,
        status:    data.status ?? 'PLANNED',
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Farm project phase not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFarmProjectPhase = async (id) => {
  const conn = await getConnection();
  try {
    // cascade: activities -> phase
    await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE PHASE_ID = :id`, { id }, { autoCommit: false });
    const result = await conn.execute(`DELETE FROM FARM_PROJECT_PHASE WHERE PHASE_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ FARM PROJECT ACTIVITY ═══════════════════
export const createFarmProjectActivity = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_PROJECT_ACTIVITY (
        PROJECT_ID, PHASE_ID, ACTIVITY_NAME, PLAN_START_DATE, PLAN_END_DATE, STATUS
      ) VALUES (
        :projectId, :phaseId, :activityName,
        TO_DATE(:planStartDate, 'YYYY-MM-DD'), TO_DATE(:planEndDate, 'YYYY-MM-DD'),
        :status
      ) RETURNING ACTIVITY_ID INTO :outId`,
      {
        projectId:     data.projectId ?? null,
        phaseId:       data.phaseId ?? null,
        activityName:  data.activityName ?? null,
        planStartDate: data.planStartDate ?? null,
        planEndDate:   data.planEndDate ?? null,
        status:        data.status ?? 'PLANNED',
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

export const getActivitiesByPhaseId = async (phaseId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ACTIVITY_ID, PROJECT_ID, PHASE_ID, ACTIVITY_NAME,
         TO_CHAR(PLAN_START_DATE, 'YYYY-MM-DD') AS PLAN_START_DATE,
         TO_CHAR(PLAN_END_DATE, 'YYYY-MM-DD')   AS PLAN_END_DATE,
         STATUS
       FROM FARM_PROJECT_ACTIVITY
       WHERE PHASE_ID = :phaseId
       ORDER BY ACTIVITY_ID`,
      { phaseId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getActivitiesByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ACTIVITY_ID, PROJECT_ID, PHASE_ID, ACTIVITY_NAME,
         TO_CHAR(PLAN_START_DATE, 'YYYY-MM-DD') AS PLAN_START_DATE,
         TO_CHAR(PLAN_END_DATE, 'YYYY-MM-DD')   AS PLAN_END_DATE,
         STATUS
       FROM FARM_PROJECT_ACTIVITY
       WHERE PROJECT_ID = :projectId
       ORDER BY PHASE_ID, ACTIVITY_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateFarmProjectActivity = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_PROJECT_ACTIVITY
         SET PROJECT_ID      = :projectId,
             PHASE_ID        = :phaseId,
             ACTIVITY_NAME   = :activityName,
             PLAN_START_DATE = TO_DATE(:planStartDate, 'YYYY-MM-DD'),
             PLAN_END_DATE   = TO_DATE(:planEndDate, 'YYYY-MM-DD'),
             STATUS          = :status
       WHERE ACTIVITY_ID = :id`,
      {
        projectId:     data.projectId ?? null,
        phaseId:       data.phaseId ?? null,
        activityName:  data.activityName ?? null,
        planStartDate: data.planStartDate ?? null,
        planEndDate:   data.planEndDate ?? null,
        status:        data.status ?? 'PLANNED',
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Farm project activity not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteFarmProjectActivity = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM FARM_PROJECT_ACTIVITY WHERE ACTIVITY_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

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

export const getFinancialProjectionsByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         PROJECTION_ID, PROJECT_ID, PROJECTION_SCOPE,
         REVENUE_AMOUNT, OPERATING_COST, GROSS_PROFIT
       FROM FINANCIAL_PROJECTIONS
       WHERE PROJECT_ID = :projectId
       ORDER BY PROJECTION_ID`,
      { projectId },
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