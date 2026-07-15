import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE ────────────────────────────────────────────────────────────────
// data: { lot, fishNumber, fishType, creationBy, details: [{ fishName, numOfFish, productionStartDate }] }
export const createFishProject = async (data) => {
  const conn = await getConnection();
  try {
    // 1) Insert header
    const headerResult = await conn.execute(
      `INSERT INTO FISH_PROJECT (
        LOT, FISH_NUMBER, FISH_TYPE, CREATION_BY
      ) VALUES (
        :lot, :fishNumber, :fishType, :creationBy
      ) RETURNING ID INTO :outId`,
      {
        lot:        data.lot ?? null,
        fishNumber: data.fishNumber ?? null,
        fishType:   data.fishType ?? null,
        creationBy: data.creationBy ?? null,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );

    const headerId = headerResult.outBinds.outId[0];

    // 2) Insert details (if any)
    const details = Array.isArray(data.details) ? data.details : [];
    for (const d of details) {
      await conn.execute(
        `INSERT INTO FISH_PROJECT_DETAILS (
          H_ID, FISH_NAME, NUM_OF_FISH, PRODUCTION_START_DATE
        ) VALUES (
          :hId, :fishName, :numOfFish, :productionStartDate
        )`,
        {
          hId:                 headerId,
          fishName:            d.fishName ?? null,
          numOfFish:           d.numOfFish ?? null,
          productionStartDate: d.productionStartDate ?? null,
        },
        { autoCommit: false }
      );
    }

    await conn.commit();
    return { id: headerId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── GET ALL ───────────────────────────────────────────────────────────────
export const getAllFishProjects = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         ID,
         LOT,
         FISH_NUMBER,
         FISH_TYPE
       FROM FISH_PROJECT
       ORDER BY ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE (header + details) ─────────────────────────────────────────
export const getFishProjectById = async (id) => {
  const conn = await getConnection();
  try {
    const headerResult = await conn.execute(
      `SELECT
         ID,
         LOT,
         FISH_NUMBER,
         FISH_TYPE
       FROM FISH_PROJECT
       WHERE ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const header = headerResult.rows[0] ?? null;
    if (!header) return null;

    const detailsResult = await conn.execute(
      `SELECT
         ID,
         H_ID,
         FISH_NAME,
         NUM_OF_FISH,
         PRODUCTION_START_DATE
       FROM FISH_PROJECT_DETAILS
       WHERE H_ID = :id
       ORDER BY ID`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return { ...header, details: detailsResult.rows };
  } finally {
    await conn.close();
  }
};

// ─── UPDATE (header + diff-based details upsert) ───────────────────────────
// data: { lot, fishNumber, fishType, updateBy, details: [{ id?, fishName, numOfFish, productionStartDate }] }
export const updateFishProject = async (id, data) => {
  const conn = await getConnection();
  try {
    // 1) Update header
    const headerUpdate = await conn.execute(
      `UPDATE FISH_PROJECT
         SET LOT         = :lot,
             FISH_NUMBER = :fishNumber,
             FISH_TYPE   = :fishType,
             UPDATE_DATE = SYSDATE,
             UPDATE_BY   = :updateBy
       WHERE ID = :id`,
      {
        lot:        data.lot ?? null,
        fishNumber: data.fishNumber ?? null,
        fishType:   data.fishType ?? null,
        updateBy:   data.updateBy ?? null,
        id,
      },
      { autoCommit: false }
    );
    if (headerUpdate.rowsAffected === 0) throw new Error('Fish project not found.');

    // 2) Diff-based upsert for details
    const incomingDetails = Array.isArray(data.details) ? data.details : [];

    const existingResult = await conn.execute(
      `SELECT ID FROM FISH_PROJECT_DETAILS WHERE H_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const existingIds = existingResult.rows.map((r) => r.ID);
    const incomingIds = incomingDetails.filter((d) => d.id).map((d) => Number(d.id));

    // 2a) Delete rows removed on the client
    const idsToDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
    for (const delId of idsToDelete) {
      await conn.execute(
        `DELETE FROM FISH_PROJECT_DETAILS WHERE ID = :delId`,
        { delId },
        { autoCommit: false }
      );
    }

    // 2b) Update existing / Insert new
    for (const d of incomingDetails) {
      if (d.id && existingIds.includes(Number(d.id))) {
        await conn.execute(
          `UPDATE FISH_PROJECT_DETAILS
             SET FISH_NAME             = :fishName,
                 NUM_OF_FISH           = :numOfFish,
                 PRODUCTION_START_DATE = :productionStartDate
           WHERE ID = :detailId`,
          {
            fishName:            d.fishName ?? null,
            numOfFish:           d.numOfFish ?? null,
            productionStartDate: d.productionStartDate ?? null,
            detailId:            Number(d.id),
          },
          { autoCommit: false }
        );
      } else {
        await conn.execute(
          `INSERT INTO FISH_PROJECT_DETAILS (
            H_ID, FISH_NAME, NUM_OF_FISH, PRODUCTION_START_DATE
          ) VALUES (
            :hId, :fishName, :numOfFish, :productionStartDate
          )`,
          {
            hId:                 id,
            fishName:            d.fishName ?? null,
            numOfFish:           d.numOfFish ?? null,
            productionStartDate: d.productionStartDate ?? null,
          },
          { autoCommit: false }
        );
      }
    }

    await conn.commit();
    return { id, rowsAffected: headerUpdate.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── DELETE (header + cascade details) ─────────────────────────────────────
export const deleteFishProject = async (id) => {
  const conn = await getConnection();
  try {
    // Details age delete korte hobe (FK constraint na thakle explicit dorkar)
    await conn.execute(
      `DELETE FROM FISH_PROJECT_DETAILS WHERE H_ID = :id`,
      { id },
      { autoCommit: false }
    );

    const result = await conn.execute(
      `DELETE FROM FISH_PROJECT WHERE ID = :id`,
      { id },
      { autoCommit: false }
    );

    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};