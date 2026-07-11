import "dotenv/config";
import oracledb from "oracledb";

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
    oracledb.fetchAsString = [oracledb.DATE];
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
    initThickMode();
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

