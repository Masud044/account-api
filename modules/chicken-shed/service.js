import { withConnection, oracledb } from "../../config/db.js";

const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

const normalizeCode = (code) => String(code ?? "").trim().toUpperCase();

export async function listSheds() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `SELECT ID, SHED_CODE, TO_CHAR(CREATION_DATE, 'YYYY-MM-DD') AS CREATION_DATE
         FROM CHICKEN_SHED
        ORDER BY SHED_CODE`,
      {},
      opts
    );
    return result.rows;
  });
}

export async function getShedById(id) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `SELECT ID, SHED_CODE, TO_CHAR(CREATION_DATE, 'YYYY-MM-DD') AS CREATION_DATE
         FROM CHICKEN_SHED
        WHERE ID = :id`,
      { id: Number(id) },
      opts
    );
    return result.rows[0] || null;
  });
}

export async function createShed(input) {
  const code = normalizeCode(input.shed_code);
  if (!code) {
    const err = new Error("Shed code is required");
    err.statusCode = 400;
    throw err;
  }
  if (code.length > 10) {
    const err = new Error("Shed code cannot be longer than 10 characters");
    err.statusCode = 400;
    throw err;
  }

  return withConnection(async (connection) => {
    const result = await connection.execute(
      `INSERT INTO CHICKEN_SHED (SHED_CODE)
       VALUES (:code)
       RETURNING ID INTO :id`,
      { code, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
      { autoCommit: true }
    );
    return { id: result.outBinds.id[0], shed_code: code };
  });
}

export async function updateShed(id, input) {
  const code = normalizeCode(input.shed_code);
  if (!code) {
    const err = new Error("Shed code is required");
    err.statusCode = 400;
    throw err;
  }
  if (code.length > 10) {
    const err = new Error("Shed code cannot be longer than 10 characters");
    err.statusCode = 400;
    throw err;
  }

  return withConnection(async (connection) => {
    const result = await connection.execute(
      `UPDATE CHICKEN_SHED SET SHED_CODE = :code WHERE ID = :id`,
      { code, id: Number(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  });
}

export async function deleteShed(id) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `DELETE FROM CHICKEN_SHED WHERE ID = :id`,
      { id: Number(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  });
}