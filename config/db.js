// import "dotenv/config";
// import oracledb from "oracledb";

// let thickModeInitialized = false;

// function initThickMode() {
//   if (thickModeInitialized) return;
//   const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
//   try {
//     if (libDir) {
//       oracledb.initOracleClient({ libDir });
//     } else {
//       oracledb.initOracleClient();
//     }
//     thickModeInitialized = true;
//     oracledb.fetchAsString = [oracledb.DATE];
//   } catch (err) {
//     const message = String(err?.message || "");
//     if (message.includes("already been initialized")) {
//       thickModeInitialized = true;
//       return;
//     }
//     if (message.includes("DPI-1047")) {
//       // Keep server booting; runtime DB calls will report the error.
//       console.warn("Oracle Thick Mode client not available:", message);
//       return;
//     }
//     throw err;
//   }
// }

// export async function getConnection() {
//   try {
//     initThickMode();
//     return await oracledb.getConnection({
//       user: process.env.DB_USER,
//       password: process.env.DB_PASSWORD,
//       connectString: process.env.DB_CONNECT
//     });
//   } catch (error) {
//     const message = error?.message || "Unknown Oracle connection error";
//     throw new Error(`Oracle connection failed: ${message}`);
//   }
// }

// export async function withConnection(work) {
//   const connection = await getConnection();
//   try {
//     return await work(connection);
//   } finally {
//     await connection.close();
//   }
// }

// export function toMmDdYyyy(input) {
//   const [year, month, day] = String(input).split("-");
//   return `${month}-${day}-${year}`;
// }

// export function currentMmDdYyyy() {
//   const d = new Date();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   const yyyy = d.getFullYear();
//   return `${mm}-${dd}-${yyyy}`;
// }

// export async function checkDatabaseConnection() {
//   const connection = await getConnection();
//   try {
//     await connection.execute("SELECT 1 FROM dual");
//     return true;
//   } finally {
//     await connection.close();
//   }
// }

// export { oracledb };

import "dotenv/config";
import oracledb from "oracledb";

let pool = null;

function initThickMode() {
  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
  try {
    if (libDir && String(libDir).trim() !== "") {
      oracledb.initOracleClient({ libDir: String(libDir).trim() });
    } else {
      oracledb.initOracleClient();
    }
  } catch (err) {
    const msg = err && err.message ? String(err.message) : "";
    if (msg.includes("already been initialized")) {
      return;
    }
    throw err;
  }
}

export async function initDb() {
  initThickMode();
  oracledb.fetchAsString = [oracledb.CLOB, oracledb.DATE];
  oracledb.fetchAsBuffer = [oracledb.BLOB];

  const connectString = process.env.DB_CONNECT_STRING || process.env.DB_CONNECT;
  if (!process.env.DB_USER || !connectString) {
    throw new Error("Missing DB_USER or DB_CONNECT (or DB_CONNECT_STRING) in environment.");
  }

  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
    connectString,
    poolMin: Number(process.env.DB_POOL_MIN || 1),
    poolMax: Number(process.env.DB_POOL_MAX || 10),
    poolIncrement: Number(process.env.DB_POOL_INCREMENT || 1),
    stmtCacheSize: 30,
  });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.execute("SELECT 1 FROM DUAL");
    console.log("Database connected successfully");
  } catch (e) {
    const detail = e && e.message ? e.message : String(e);
    console.error("Database connection failed:", detail);
    try {
      await pool.close(10);
    } catch {
      // ignore
    }
    pool = null;
    throw new Error(`Oracle connection check failed: ${detail}`);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {
        // ignore
      }
    }
  }
  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool is not initialized. Call initDb() first.");
  }
  return pool;
}

// ── পুরনো কোডের সাথে compatibility রাখতে getConnection() নাম অপরিবর্তিত ──
export async function getConnection() {
  const p = getPool();
  return p.getConnection();
}

export async function poolExecute(sql, binds, options) {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    return await conn.execute(sql, binds ?? {}, options ?? {});
  } finally {
    await conn.close();
  }
}

// ── পুরনো ফাইলে থাকা helper — কোনো মডিউল ব্যবহার করলে ভাঙবে না ──
export async function withConnection(work) {
  const connection = await getConnection();
  try {
    return await work(connection);
  } finally {
    await connection.close();
  }
}

export function toMmDdYyyy(input) {
  const [year, month, day] = String(input).split("-");
  return `${month}-${day}-${year}`;
}

export function currentMmDdYyyy() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

// ── পুরনো checkDatabaseConnection() কল যেসব জায়গায় হয়, সেগুলো এখন pool init করবে ──
export async function checkDatabaseConnection() {
  if (!pool) {
    await initDb();
  }
  return true;
}

export async function closeDb() {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}

export const initializePool = initDb;
export const closePool = closeDb;
export { oracledb };