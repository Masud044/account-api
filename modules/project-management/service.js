import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════ PROJECTS (Header, includes Executive Summary) ═══════════════════
export const createProject = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.PROJECTS (
        PROJECT_NAME, PROJECT_LOCATION, OWNER_NAME, CONTACT_NUMBER,
        BUSINESS_TYPE, DURATION_DESC, EXECUTIVE_SUMMARY
      ) VALUES (
        :projectName, :projectLocation, :ownerName, :contactNumber,
        :businessType, :durationDesc, :executiveSummary
      ) RETURNING PROJECT_ID INTO :outId`,
      {
        projectName:      data.projectName ?? null,
        projectLocation:  data.projectLocation ?? null,
        ownerName:        data.ownerName ?? null,
        contactNumber:    data.contactNumber ?? null,
        businessType:     data.businessType ?? null,
        durationDesc:     data.durationDesc ?? null,
        executiveSummary: data.executiveSummary ?? null,
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

export const getAllProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT PROJECT_ID, PROJECT_NAME, PROJECT_LOCATION, OWNER_NAME, CONTACT_NUMBER,
              BUSINESS_TYPE, DURATION_DESC,
              TO_CHAR(CREATED_AT, 'YYYY-MM-DD') AS CREATED_AT
       FROM BWA.PROJECTS
       ORDER BY PROJECT_ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT PROJECT_ID, PROJECT_NAME, PROJECT_LOCATION, OWNER_NAME, CONTACT_NUMBER,
              BUSINESS_TYPE, DURATION_DESC, EXECUTIVE_SUMMARY,
              TO_CHAR(CREATED_AT, 'YYYY-MM-DD') AS CREATED_AT,
              TO_CHAR(UPDATED_AT, 'YYYY-MM-DD') AS UPDATED_AT
       FROM BWA.PROJECTS
       WHERE PROJECT_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateProject = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.PROJECTS
         SET PROJECT_NAME      = :projectName,
             PROJECT_LOCATION  = :projectLocation,
             OWNER_NAME        = :ownerName,
             CONTACT_NUMBER    = :contactNumber,
             BUSINESS_TYPE     = :businessType,
             DURATION_DESC     = :durationDesc,
             EXECUTIVE_SUMMARY = :executiveSummary,
             UPDATED_AT        = CURRENT_TIMESTAMP
       WHERE PROJECT_ID = :id`,
      {
        projectName:      data.projectName ?? null,
        projectLocation:  data.projectLocation ?? null,
        ownerName:        data.ownerName ?? null,
        contactNumber:    data.contactNumber ?? null,
        businessType:     data.businessType ?? null,
        durationDesc:     data.durationDesc ?? null,
        executiveSummary: data.executiveSummary ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Project not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteProject = async (id) => {
  const conn = await getConnection();
  try {
    // cascade: delete all child rows across the report tables first
    const childTables = [
      'PROJECT_OBJECTIVES', 'PROJECT_CAPACITY', 'INFRASTRUCTURE_REQUIREMENTS',
      'PROJECT_INVESTMENTS', 'PRODUCTION_SCHEDULES', 'MARKETING_CHANNEL',
      'FINANCIAL_PROJECTIONS', 'RISK_MANAGEMENT', 'SOCIAL_ECONOMIC_BENEFITS', 'CONCLUSION',
    ];
    for (const table of childTables) {
      await conn.execute(`DELETE FROM BWA.${table} WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
    }
    const result = await conn.execute(`DELETE FROM BWA.PROJECTS WHERE PROJECT_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PROJECT_OBJECTIVES ═══════════════════
export const createObjective = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.PROJECT_OBJECTIVES (PROJECT_ID, SEQUENCE_NO, OBJECTIVE_DESC, TARGET_INDICATOR)
       VALUES (:projectId, :sequenceNo, :objectiveDesc, :targetIndicator)
       RETURNING OBJECTIVE_ID INTO :outId`,
      {
        projectId:       data.projectId ?? null,
        sequenceNo:      data.sequenceNo ?? null,
        objectiveDesc:   data.objectiveDesc ?? null,
        targetIndicator: data.targetIndicator ?? null,
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

export const getObjectivesByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT OBJECTIVE_ID, PROJECT_ID, SEQUENCE_NO, OBJECTIVE_DESC, TARGET_INDICATOR
       FROM BWA.PROJECT_OBJECTIVES
       WHERE PROJECT_ID = :projectId
       ORDER BY SEQUENCE_NO NULLS LAST, OBJECTIVE_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateObjective = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.PROJECT_OBJECTIVES
         SET SEQUENCE_NO      = :sequenceNo,
             OBJECTIVE_DESC   = :objectiveDesc,
             TARGET_INDICATOR = :targetIndicator
       WHERE OBJECTIVE_ID = :id`,
      {
        sequenceNo:      data.sequenceNo ?? null,
        objectiveDesc:   data.objectiveDesc ?? null,
        targetIndicator: data.targetIndicator ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Objective not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteObjective = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.PROJECT_OBJECTIVES WHERE OBJECTIVE_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PROJECT_CAPACITY ═══════════════════
export const createCapacity = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.PROJECT_CAPACITY (PROJECT_ID, METRIC_DESCRIPTION, QUANTITY_VALUE)
       VALUES (:projectId, :metricDescription, :quantityValue)
       RETURNING CAPACITY_ID INTO :outId`,
      {
        projectId:         data.projectId ?? null,
        metricDescription: data.metricDescription ?? null,
        quantityValue:     data.quantityValue ?? null,
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

export const getCapacityByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT CAPACITY_ID, PROJECT_ID, METRIC_DESCRIPTION, QUANTITY_VALUE
       FROM BWA.PROJECT_CAPACITY
       WHERE PROJECT_ID = :projectId
       ORDER BY CAPACITY_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateCapacity = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.PROJECT_CAPACITY
         SET METRIC_DESCRIPTION = :metricDescription,
             QUANTITY_VALUE     = :quantityValue
       WHERE CAPACITY_ID = :id`,
      {
        metricDescription: data.metricDescription ?? null,
        quantityValue:     data.quantityValue ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Capacity record not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteCapacity = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.PROJECT_CAPACITY WHERE CAPACITY_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ INFRASTRUCTURE_REQUIREMENTS ═══════════════════
export const createInfrastructure = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.INFRASTRUCTURE_REQUIREMENTS (PROJECT_ID, ITEM_NAME, SPECIFICATION, QUANTITY, UNIT_COST_BDT)
       VALUES (:projectId, :itemName, :specification, :quantity, :unitCostBdt)
       RETURNING INFRA_ID INTO :outId`,
      {
        projectId:     data.projectId ?? null,
        itemName:      data.itemName ?? null,
        specification: data.specification ?? null,
        quantity:      data.quantity ?? 1,
        unitCostBdt:   data.unitCostBdt ?? 0,
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

export const getInfrastructureByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT INFRA_ID, PROJECT_ID, ITEM_NAME, SPECIFICATION, QUANTITY, UNIT_COST_BDT, TOTAL_COST_BDT
       FROM BWA.INFRASTRUCTURE_REQUIREMENTS
       WHERE PROJECT_ID = :projectId
       ORDER BY INFRA_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateInfrastructure = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.INFRASTRUCTURE_REQUIREMENTS
         SET ITEM_NAME     = :itemName,
             SPECIFICATION = :specification,
             QUANTITY      = :quantity,
             UNIT_COST_BDT = :unitCostBdt
       WHERE INFRA_ID = :id`,
      {
        itemName:      data.itemName ?? null,
        specification: data.specification ?? null,
        quantity:      data.quantity ?? 1,
        unitCostBdt:   data.unitCostBdt ?? 0,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Infrastructure item not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteInfrastructure = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.INFRASTRUCTURE_REQUIREMENTS WHERE INFRA_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PROJECT_INVESTMENTS ═══════════════════
export const createInvestment = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.PROJECT_INVESTMENTS (PROJECT_ID, INVESTMENT_TYPE, PARTICULARS, AMOUNT_BDT)
       VALUES (:projectId, :investmentType, :particulars, :amountBdt)
       RETURNING INVESTMENT_ID INTO :outId`,
      {
        projectId:      data.projectId ?? null,
        investmentType: data.investmentType ?? null, // 'FIXED' / 'WORKING_CAPITAL'
        particulars:    data.particulars ?? null,
        amountBdt:      data.amountBdt ?? 0,
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

export const getInvestmentsByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT INVESTMENT_ID, PROJECT_ID, INVESTMENT_TYPE, PARTICULARS, AMOUNT_BDT
       FROM BWA.PROJECT_INVESTMENTS
       WHERE PROJECT_ID = :projectId
       ORDER BY INVESTMENT_TYPE, INVESTMENT_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateInvestment = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.PROJECT_INVESTMENTS
         SET INVESTMENT_TYPE = :investmentType,
             PARTICULARS     = :particulars,
             AMOUNT_BDT      = :amountBdt
       WHERE INVESTMENT_ID = :id`,
      {
        investmentType: data.investmentType ?? null,
        particulars:    data.particulars ?? null,
        amountBdt:      data.amountBdt ?? 0,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Investment record not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteInvestment = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.PROJECT_INVESTMENTS WHERE INVESTMENT_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ PRODUCTION_SCHEDULES ═══════════════════
export const createSchedule = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.PRODUCTION_SCHEDULES (PROJECT_ID, TIME_PERIOD, ITEM_DESCRIPTION)
       VALUES (:projectId, :timePeriod, :itemDescription)
       RETURNING SCHEDULE_ID INTO :outId`,
      {
        projectId:       data.projectId ?? null,
        timePeriod:      data.timePeriod ?? null, // e.g. Morning / Noon / Evening
        itemDescription: data.itemDescription ?? null,
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

export const getSchedulesByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT SCHEDULE_ID, PROJECT_ID, TIME_PERIOD, ITEM_DESCRIPTION
       FROM BWA.PRODUCTION_SCHEDULES
       WHERE PROJECT_ID = :projectId
       ORDER BY SCHEDULE_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateSchedule = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.PRODUCTION_SCHEDULES
         SET TIME_PERIOD      = :timePeriod,
             ITEM_DESCRIPTION = :itemDescription
       WHERE SCHEDULE_ID = :id`,
      {
        timePeriod:      data.timePeriod ?? null,
        itemDescription: data.itemDescription ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Schedule not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteSchedule = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.PRODUCTION_SCHEDULES WHERE SCHEDULE_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ MARKETING_CHANNEL ═══════════════════
export const createMarketingChannel = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.MARKETING_CHANNEL (PROJECT_ID, CHANNEL_NAME, REMARKS)
       VALUES (:projectId, :channelName, :remarks)
       RETURNING CHANNEL_ID INTO :outId`,
      {
        projectId:   data.projectId ?? null,
        channelName: data.channelName ?? null,
        remarks:     data.remarks ?? null,
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

export const getMarketingChannelsByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT CHANNEL_ID, PROJECT_ID, CHANNEL_NAME, REMARKS
       FROM BWA.MARKETING_CHANNEL
       WHERE PROJECT_ID = :projectId
       ORDER BY CHANNEL_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateMarketingChannel = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.MARKETING_CHANNEL
         SET CHANNEL_NAME = :channelName,
             REMARKS      = :remarks
       WHERE CHANNEL_ID = :id`,
      {
        channelName: data.channelName ?? null,
        remarks:     data.remarks ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Marketing channel not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteMarketingChannel = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.MARKETING_CHANNEL WHERE CHANNEL_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ FINANCIAL_PROJECTIONS ═══════════════════
export const createFinancialProjection = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.FINANCIAL_PROJECTIONS (PROJECT_ID, PROJECTION_SCOPE, REVENUE_AMOUNT, OPERATING_COST)
       VALUES (:projectId, :projectionScope, :revenueAmount, :operatingCost)
       RETURNING PROJECTION_ID INTO :outId`,
      {
        projectId:       data.projectId ?? null,
        projectionScope: data.projectionScope ?? null, // 'PER_CYCLE' / 'ANNUAL'
        revenueAmount:   data.revenueAmount ?? 0,
        operatingCost:   data.operatingCost ?? 0,
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
      `SELECT PROJECTION_ID, PROJECT_ID, PROJECTION_SCOPE, REVENUE_AMOUNT, OPERATING_COST, GROSS_PROFIT
       FROM BWA.FINANCIAL_PROJECTIONS
       WHERE PROJECT_ID = :projectId
       ORDER BY PROJECTION_SCOPE, PROJECTION_ID`,
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
    const result = await conn.execute(
      `UPDATE BWA.FINANCIAL_PROJECTIONS
         SET PROJECTION_SCOPE = :projectionScope,
             REVENUE_AMOUNT   = :revenueAmount,
             OPERATING_COST   = :operatingCost
       WHERE PROJECTION_ID = :id`,
      {
        projectionScope: data.projectionScope ?? null,
        revenueAmount:   data.revenueAmount ?? 0,
        operatingCost:   data.operatingCost ?? 0,
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
    const result = await conn.execute(`DELETE FROM BWA.FINANCIAL_PROJECTIONS WHERE PROJECTION_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ RISK_MANAGEMENT ═══════════════════
export const createRisk = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.RISK_MANAGEMENT (PROJECT_ID, RISK_CATEGORY, RISK_DESCRIPTION, LIKELIHOOD, IMPACT, MITIGATION_STRATEGY)
       VALUES (:projectId, :riskCategory, :riskDescription, :likelihood, :impact, :mitigationStrategy)
       RETURNING RISK_ID INTO :outId`,
      {
        projectId:          data.projectId ?? null,
        riskCategory:       data.riskCategory ?? null,
        riskDescription:    data.riskDescription ?? null,
        likelihood:         data.likelihood ?? null, // Low / Medium / High
        impact:             data.impact ?? null,     // Low / Medium / High
        mitigationStrategy: data.mitigationStrategy ?? null,
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

export const getRisksByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT RISK_ID, PROJECT_ID, RISK_CATEGORY, RISK_DESCRIPTION, LIKELIHOOD, IMPACT, MITIGATION_STRATEGY
       FROM BWA.RISK_MANAGEMENT
       WHERE PROJECT_ID = :projectId
       ORDER BY RISK_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateRisk = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.RISK_MANAGEMENT
         SET RISK_CATEGORY       = :riskCategory,
             RISK_DESCRIPTION    = :riskDescription,
             LIKELIHOOD          = :likelihood,
             IMPACT              = :impact,
             MITIGATION_STRATEGY = :mitigationStrategy
       WHERE RISK_ID = :id`,
      {
        riskCategory:       data.riskCategory ?? null,
        riskDescription:    data.riskDescription ?? null,
        likelihood:         data.likelihood ?? null,
        impact:             data.impact ?? null,
        mitigationStrategy: data.mitigationStrategy ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Risk record not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteRisk = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.RISK_MANAGEMENT WHERE RISK_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ SOCIAL_ECONOMIC_BENEFITS ═══════════════════
export const createSocialBenefit = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.SOCIAL_ECONOMIC_BENEFITS (PROJECT_ID, BENEFIT_CATEGORY, DESCRIPTION)
       VALUES (:projectId, :benefitCategory, :description)
       RETURNING BENEFIT_ID INTO :outId`,
      {
        projectId:       data.projectId ?? null,
        benefitCategory: data.benefitCategory ?? null,
        description:     data.description ?? null,
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

export const getSocialBenefitsByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT BENEFIT_ID, PROJECT_ID, BENEFIT_CATEGORY, DESCRIPTION
       FROM BWA.SOCIAL_ECONOMIC_BENEFITS
       WHERE PROJECT_ID = :projectId
       ORDER BY BENEFIT_ID`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateSocialBenefit = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.SOCIAL_ECONOMIC_BENEFITS
         SET BENEFIT_CATEGORY = :benefitCategory,
             DESCRIPTION      = :description
       WHERE BENEFIT_ID = :id`,
      {
        benefitCategory: data.benefitCategory ?? null,
        description:     data.description ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Social benefit not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteSocialBenefit = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.SOCIAL_ECONOMIC_BENEFITS WHERE BENEFIT_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ CONCLUSION ═══════════════════
export const createConclusion = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO BWA.CONCLUSION (PROJECT_ID, CONCLUSION_TEXT)
       VALUES (:projectId, :conclusionText)
       RETURNING CONCLUSION_ID INTO :outId`,
      {
        projectId:      data.projectId ?? null,
        conclusionText: data.conclusionText ?? null,
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

export const getConclusionByProjectId = async (projectId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT CONCLUSION_ID, PROJECT_ID, CONCLUSION_TEXT,
              TO_CHAR(CREATED_DATE, 'YYYY-MM-DD') AS CREATED_DATE
       FROM BWA.CONCLUSION
       WHERE PROJECT_ID = :projectId
       ORDER BY CONCLUSION_ID DESC`,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const updateConclusion = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BWA.CONCLUSION
         SET CONCLUSION_TEXT = :conclusionText
       WHERE CONCLUSION_ID = :id`,
      { conclusionText: data.conclusionText ?? null, id },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error('Conclusion not found.');
    await conn.commit();
    return { id, rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const deleteConclusion = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`DELETE FROM BWA.CONCLUSION WHERE CONCLUSION_ID = :id`, { id }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════ FULL PROJECT REPORT (all tables combined) ═══════════════════
export const getFullProjectReport = async (projectId) => {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const [
    objectives, capacity, infrastructure, investments,
    schedules, marketingChannels, financialProjections,
    risks, socialBenefits, conclusion,
  ] = await Promise.all([
    getObjectivesByProjectId(projectId),
    getCapacityByProjectId(projectId),
    getInfrastructureByProjectId(projectId),
    getInvestmentsByProjectId(projectId),
    getSchedulesByProjectId(projectId),
    getMarketingChannelsByProjectId(projectId),
    getFinancialProjectionsByProjectId(projectId),
    getRisksByProjectId(projectId),
    getSocialBenefitsByProjectId(projectId),
    getConclusionByProjectId(projectId),
  ]);

  return {
    project, objectives, capacity, infrastructure, investments,
    schedules, marketingChannels, financialProjections,
    risks, socialBenefits, conclusion,
  };
};