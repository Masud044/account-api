import { getConnection, oracledb } from '../../config/db.js';

export const createFarmType = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO FARM_TYPE_MST (
        FARM_TYPE_NAME, FARM_TYPE_CODE
      ) VALUES (
        :farmTypeName, :farmTypeCode
      ) RETURNING FARM_TYPE_ID INTO :outId`,
      {
        farmTypeName: data.farmTypeName ?? null,
        farmTypeCode: data.farmTypeCode ?? null,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: true }
    );
    return { id: result.outBinds.outId[0] };
  } finally {
    await conn.close();
  }
};

export const getAllFarmTypes = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT FARM_TYPE_ID, FARM_TYPE_NAME, FARM_TYPE_CODE
       FROM FARM_TYPE_MST
       ORDER BY FARM_TYPE_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const updateFarmType = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE FARM_TYPE_MST
         SET FARM_TYPE_NAME = :farmTypeName,
             FARM_TYPE_CODE = :farmTypeCode
       WHERE FARM_TYPE_ID = :id`,
      {
        farmTypeName: data.farmTypeName ?? null,
        farmTypeCode: data.farmTypeCode ?? null,
        id,
      },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw new Error('Farm type not found.');
    return { id, rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

export const deleteFarmType = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM FARM_TYPE_MST WHERE FARM_TYPE_ID = :id`,
      { id },
      { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};