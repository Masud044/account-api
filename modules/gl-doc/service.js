// import oracledb from "oracledb";
// import { getConnection } from "../../config/db.js";

// // ── Create ────────────────────────────────────────────────────────────────────
// export async function createGldoc(data) {
//   const connection = await getConnection();
//   try {
//     const result = await connection.execute(
//       `INSERT INTO GLDOC (
//         DOC_FILE, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID
//       ) VALUES (
//         :DOC_FILE, SYSDATE, :CREATION_BY, NULL, NULL, :GLMASTERID
//       )`,
//       {
//         DOC_FILE:    data.DOC_FILE,
//         CREATION_BY: data.CREATION_BY ?? null,
//         GLMASTERID:  data.GLMASTERID,
//       },
//       { autoCommit: true }
//     );
//     return result.rowsAffected;
//   } finally {
//     await connection.close();
//   }
// }

// // ── Read (by ID or by GLMASTERID) ─────────────────────────────────────────────
// export async function getGldocs({ id, glmasterId } = {}) {
//   const connection = await getConnection();
//   try {
//     let sql;
//     let binds = {};

//     if (id) {
//       sql    = "SELECT ID, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID FROM GLDOC WHERE ID = :id";
//       binds  = { id: Number(id) };
//     } else if (glmasterId) {
//       sql    = "SELECT ID, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID FROM GLDOC WHERE GLMASTERID = :glmasterId ORDER BY ID";
//       binds  = { glmasterId: Number(glmasterId) };
//     } else {
//       sql    = "SELECT ID, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID FROM GLDOC ORDER BY ID";
//     }

//     const result = await connection.execute(sql, binds, {
//       outFormat: oracledb.OUT_FORMAT_OBJECT,
//     });
//     return result.rows || [];
//   } finally {
//     await connection.close();
//   }
// }

// // ── Read file (BLOB) by ID ────────────────────────────────────────────────────
// export async function getGldocFile(id) {
//   const connection = await getConnection();
//   try {
//     const result = await connection.execute(
//       "SELECT ID, DOC_FILE FROM GLDOC WHERE ID = :id",
//       { id: Number(id) },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const row = result.rows?.[0];
//     if (!row) return null;

//     // Read BLOB into Buffer
//     const lob  = row.DOC_FILE;
//     if (!lob) return { id: row.ID, buffer: null };

//     const buffer = await lobToBuffer(lob);
//     return { id: row.ID, buffer };
//   } finally {
//     await connection.close();
//   }
// }

// // ── Update ────────────────────────────────────────────────────────────────────
// export async function updateGldoc(id, data) {
//   const connection = await getConnection();
//   try {
//     const binds = {
//       id:         Number(id),
//       UPDATED_BY: data.UPDATED_BY ?? null,
//     };

//     const set = ["UPDATED_DATE = SYSDATE", "UPDATED_BY = :UPDATED_BY"];

//     if (data.DOC_FILE !== undefined) {
//       set.push("DOC_FILE = :DOC_FILE");
//       binds.DOC_FILE = data.DOC_FILE;
//     }
//     if (data.GLMASTERID !== undefined) {
//       set.push("GLMASTERID = :GLMASTERID");
//       binds.GLMASTERID = Number(data.GLMASTERID);
//     }

//     const sql    = `UPDATE GLDOC SET ${set.join(", ")} WHERE ID = :id`;
//     const result = await connection.execute(sql, binds, { autoCommit: true });
//     return result.rowsAffected;
//   } finally {
//     await connection.close();
//   }
// }

// // ── Delete ────────────────────────────────────────────────────────────────────
// export async function deleteGldoc(id) {
//   const connection = await getConnection();
//   try {
//     const result = await connection.execute(
//       "DELETE FROM GLDOC WHERE ID = :id",
//       { id: Number(id) },
//       { autoCommit: true }
//     );
//     return result.rowsAffected;
//   } finally {
//     await connection.close();
//   }
// }

// // ── Helper: LOB → Buffer ──────────────────────────────────────────────────────
// function lobToBuffer(lob) {
//   return new Promise((resolve, reject) => {
//     const chunks = [];
//     lob.on("data",  (chunk) => chunks.push(chunk));
//     lob.on("end",   ()      => resolve(Buffer.concat(chunks)));
//     lob.on("error", (err)   => reject(err));
//   });
// }

import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ── Create ────────────────────────────────────────────────────────────────────
export async function createGldoc(data) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO GLDOC (
        DOC_FILE, FILE_TYPE, FILE_NAME, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID
      ) VALUES (
        :DOC_FILE, :FILE_TYPE, :FILE_NAME, SYSDATE, :CREATION_BY, NULL, NULL, :GLMASTERID
      )`,
      {
        DOC_FILE:    data.DOC_FILE,
        FILE_TYPE:   data.FILE_TYPE ?? null,
        FILE_NAME:   data.FILE_NAME ?? null,
        CREATION_BY: data.CREATION_BY ?? null,
        GLMASTERID:  data.GLMASTERID,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}

// ── Read (by ID or by GLMASTERID) ─────────────────────────────────────────────
export async function getGldocs({ id, glmasterId } = {}) {
  const connection = await getConnection();
  try {
    let sql;
    let binds = {};

    if (id) {
      sql    = "SELECT ID, FILE_TYPE, FILE_NAME, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID FROM GLDOC WHERE ID = :id";
      binds  = { id: Number(id) };
    } else if (glmasterId) {
      sql    = "SELECT ID, FILE_TYPE, FILE_NAME, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID FROM GLDOC WHERE GLMASTERID = :glmasterId ORDER BY ID";
      binds  = { glmasterId: Number(glmasterId) };
    } else {
      sql    = "SELECT ID, FILE_TYPE, FILE_NAME, CREATION_DATE, CREATION_BY, UPDATED_BY, UPDATED_DATE, GLMASTERID FROM GLDOC ORDER BY ID";
    }

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ── Read file (BLOB) by ID ────────────────────────────────────────────────────
export async function getGldocFile(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "SELECT ID, DOC_FILE, FILE_TYPE, FILE_NAME FROM GLDOC WHERE ID = :id",
      { id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row = result.rows?.[0];
    if (!row) return null;

    // Read BLOB into Buffer
    const lob = row.DOC_FILE;
    if (!lob) {
      return { id: row.ID, buffer: null, fileType: row.FILE_TYPE, fileName: row.FILE_NAME };
    }

    const buffer = await lobToBuffer(lob);
    return { id: row.ID, buffer, fileType: row.FILE_TYPE, fileName: row.FILE_NAME };
  } finally {
    await connection.close();
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateGldoc(id, data) {
  const connection = await getConnection();
  try {
    const binds = {
      id:         Number(id),
      UPDATED_BY: data.UPDATED_BY ?? null,
    };

    const set = ["UPDATED_DATE = SYSDATE", "UPDATED_BY = :UPDATED_BY"];

    if (data.DOC_FILE !== undefined) {
      set.push("DOC_FILE = :DOC_FILE");
      binds.DOC_FILE = data.DOC_FILE;
    }
    if (data.FILE_TYPE !== undefined) {
      set.push("FILE_TYPE = :FILE_TYPE");
      binds.FILE_TYPE = data.FILE_TYPE;
    }
    if (data.FILE_NAME !== undefined) {
      set.push("FILE_NAME = :FILE_NAME");
      binds.FILE_NAME = data.FILE_NAME;
    }
    if (data.GLMASTERID !== undefined) {
      set.push("GLMASTERID = :GLMASTERID");
      binds.GLMASTERID = Number(data.GLMASTERID);
    }

    const sql    = `UPDATE GLDOC SET ${set.join(", ")} WHERE ID = :id`;
    const result = await connection.execute(sql, binds, { autoCommit: true });
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteGldoc(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM GLDOC WHERE ID = :id",
      { id: Number(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}

// ── Helper: LOB → Buffer ──────────────────────────────────────────────────────
function lobToBuffer(lob) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    lob.on("data",  (chunk) => chunks.push(chunk));
    lob.on("end",   ()      => resolve(Buffer.concat(chunks)));
    lob.on("error", (err)   => reject(err));
  });
}