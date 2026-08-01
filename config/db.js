

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
//     // Both CLOB and DATE fetched as plain strings — combined in one array,
//     // NOT set separately, otherwise the second assignment wipes out the first.
//     oracledb.fetchAsString = [oracledb.CLOB, oracledb.DATE];
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
//     // Both CLOB and DATE fetched as plain strings — combined in one array,
//     // NOT set separately, otherwise the second assignment wipes out the first.
//     oracledb.fetchAsString = [oracledb.CLOB, oracledb.DATE];
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
//     // 👇👇👇 EXACTLY HERE 👇👇👇
//     if (process.env.ORACLE_THICK_MODE === 'true') {
//       initThickMode();
//     }
//     // 👆👆👆 EXACTLY HERE 👆👆👆
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

// ── Always fetch CLOB and DATE as plain strings ──
// This must run regardless of thick/thin mode, so it's set here at module load,
// NOT inside initThickMode() (which may never run if ORACLE_THICK_MODE !== 'true').
oracledb.fetchAsString = [oracledb.CLOB, oracledb.DATE];

let thickModeInitialized = false;

function initThickMode() {
  if (thickModeInitialized) return;
  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
  try {
    if (libDir) {
      oracledb.initOracleClient({ libDir });
    } else {
      oracledb.initOracleClient();
    }
    thickModeInitialized = true;
  } catch (err) {
    const message = String(err?.message || "");
    if (message.includes("already been initialized")) {
      thickModeInitialized = true;
      return;
    }
    if (message.includes("DPI-1047")) {
      // Keep server booting; runtime DB calls will report the error.
      console.warn("Oracle Thick Mode client not available:", message);
      return;
    }
    throw err;
  }
}

export async function getConnection() {
  try {
    if (process.env.ORACLE_THICK_MODE === 'true') {
      initThickMode();
    }
    return await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT
    });
  } catch (error) {
    const message = error?.message || "Unknown Oracle connection error";
    throw new Error(`Oracle connection failed: ${message}`);
  }
}

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

export async function checkDatabaseConnection() {
  const connection = await getConnection();
  try {
    await connection.execute("SELECT 1 FROM dual");
    return true;
  } finally {
    await connection.close();
  }
}

export { oracledb };