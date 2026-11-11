import oracledb from "oracledb";
import "dotenv/config";

const SCHEMA_CONFIG = {
  BWA: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT,
  },
  PM: {
    user: process.env.PM_DB_USER,
    password: process.env.PM_DB_PASSWORD,
    connectString: process.env.PM_DB_CONNECT,
  },
};

const MAX_ROWS = 1000;

// Allowlist, not a blocklist: CREATE/ALTER/DROP on these object types, plus
// INSERT/UPDATE/DELETE/TRUNCATE TABLE/SELECT, may run through this console.
// Anything else — GRANT/REVOKE, CREATE USER/ROLE/SYNONYM/PACKAGE/TYPE,
// ALTER SESSION/SYSTEM/USER, anonymous DECLARE/BEGIN blocks (which could
// otherwise smuggle arbitrary dynamic SQL past this check via EXECUTE
// IMMEDIATE), etc. — is rejected by default. Ask directly if one of those is
// genuinely needed. The cross-schema check below (checkForeignSchemaReference)
// is what actually keeps DROP/DELETE/TRUNCATE confined to BWA/PM's own objects.
const ALLOWED_DDL_OBJECTS = ["TABLE", "VIEW", "PROCEDURE", "FUNCTION", "SEQUENCE", "TRIGGER", "INDEX"];

function classifyStatement(stmt) {
  const head = stmt.trim().replace(/\s+/g, " ").toUpperCase();

  let m = head.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNIQUE\s+|BITMAP\s+)?(TABLE|VIEW|PROCEDURE|FUNCTION|SEQUENCE|TRIGGER|INDEX)\b/);
  if (m) return { action: "CREATE", objectType: m[1] };

  m = head.match(/^ALTER\s+(TABLE|VIEW|PROCEDURE|FUNCTION|SEQUENCE|TRIGGER|INDEX)\b/);
  if (m) return { action: "ALTER", objectType: m[1] };

  m = head.match(/^DROP\s+(TABLE|VIEW|PROCEDURE|FUNCTION|SEQUENCE|TRIGGER|INDEX)\b/);
  if (m) return { action: "DROP", objectType: m[1] };

  if (/^TRUNCATE\s+TABLE\b/.test(head)) return { action: "TRUNCATE", objectType: "TABLE" };

  if (/^INSERT\b/.test(head)) return { action: "INSERT" };
  if (/^UPDATE\b/.test(head)) return { action: "UPDATE" };
  if (/^DELETE\b/.test(head)) return { action: "DELETE" };
  if (/^SELECT\b/.test(head)) return { action: "SELECT" };

  return null;
}

function checkStatementAllowed(stmt) {
  const parsed = classifyStatement(stmt);
  if (!parsed) {
    return (
      "Statement type not allowed. This console only allows CREATE/ALTER/DROP on " +
      ALLOWED_DDL_OBJECTS.join(", ") +
      ", plus INSERT, UPDATE, DELETE, TRUNCATE TABLE and SELECT."
    );
  }
  return null;
}

// Live list of every other schema in the instance, fetched once per script
// run. BWA and PM both carry broad system privileges, so the DB itself won't
// reliably stop a statement that explicitly qualifies an object with another
// schema's name — this check catches that in the SQL text before it ever
// reaches Oracle.
async function getForeignSchemaRegex(connection) {
  const result = await connection.execute(
    `SELECT username FROM all_users WHERE username NOT IN ('BWA','PM')`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const names = result.rows.map((r) => r.USERNAME);
  if (names.length === 0) return null;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\s*\\.`, "i");
}

function checkForeignSchemaReference(stmt, foreignRegex) {
  if (!foreignRegex) return null;
  const match = stmt.match(foreignRegex);
  if (match) {
    return `Statement references schema '${match[1].toUpperCase()}'. This console only allows BWA and PM.`;
  }
  return null;
}

// node-oracledb (thin mode) renders DATE columns via JS's own Date.toString()
// instead of honoring NLS_DATE_FORMAT, e.g. "Sun Oct 18 2026 05:43:54 GMT+0000
// (Coordinated Universal Time)". Detect that shape and reformat to a plain
// 'YYYY-MM-DD HH24:MI:SS' string for display.
const JS_DATE_TOSTRING_RE = /^[A-Za-z]{3} [A-Za-z]{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4}/;

function normalizeValue(value) {
  if (typeof value === "string" && JS_DATE_TOSTRING_RE.test(value)) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 19).replace("T", " ");
    }
  }
  return value;
}

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = normalizeValue(value);
  }
  return out;
}

// Splits a SQL*Plus-style script into individual executable statements.
// Plain statements end with ';' (stripped — oracledb rejects a trailing ';'
// on non-PLSQL execute calls). PL/SQL blocks (CREATE PROCEDURE/FUNCTION/
// TRIGGER/PACKAGE, or a DECLARE/BEGIN anonymous block) end with a line that
// contains only '/', same convention as a SQL*Plus script.
export function splitStatements(script) {
  const lines = script.split(/\r?\n/);
  const statements = [];
  let buffer = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (text.length > 0) statements.push(text);
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === "/") {
      flush();
      continue;
    }
    buffer.push(rawLine);
    const firstLine = buffer[0] || "";
    const isBlock =
      /^\s*(CREATE\s+OR\s+REPLACE\s+|CREATE\s+)?(PROCEDURE|FUNCTION|PACKAGE|PACKAGE\s+BODY|TRIGGER)\b/i.test(firstLine) ||
      /^\s*(DECLARE|BEGIN)\b/i.test(firstLine);
    if (!isBlock && trimmed.endsWith(";")) {
      buffer[buffer.length - 1] = rawLine.replace(/;\s*$/, "");
      flush();
    }
  }
  flush();
  return statements;
}

export async function getSchemaConnection(schema) {
  const config = SCHEMA_CONFIG[schema];
  if (!config || !config.user) {
    throw new Error(`Unknown or unconfigured schema '${schema}'. Only BWA and PM are allowed.`);
  }
  const connection = await oracledb.getConnection(config);
  await connection.execute(`ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD'`);
  return connection;
}

export async function runScript(schema, script) {
  const statements = splitStatements(script);
  if (statements.length === 0) {
    return { results: [], error: "No statements found in script." };
  }

  const connection = await getSchemaConnection(schema);
  const results = [];
  try {
    const foreignRegex = await getForeignSchemaRegex(connection);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const blockedReason = checkStatementAllowed(stmt);
      if (blockedReason) {
        results.push({ index: i + 1, statement: stmt, status: "BLOCKED", message: blockedReason });
        return { results, stoppedAt: i + 1 };
      }

      const foreignReason = checkForeignSchemaReference(stmt, foreignRegex);
      if (foreignReason) {
        results.push({ index: i + 1, statement: stmt, status: "BLOCKED", message: foreignReason });
        return { results, stoppedAt: i + 1 };
      }

      try {
        const result = await connection.execute(stmt, [], {
          autoCommit: true,
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          maxRows: MAX_ROWS + 1,
        });

        if (result.rows) {
          const truncated = result.rows.length > MAX_ROWS;
          const rows = (truncated ? result.rows.slice(0, MAX_ROWS) : result.rows).map(normalizeRow);
          results.push({
            index: i + 1,
            statement: stmt,
            status: "OK",
            rows,
            rowCount: result.rows.length,
            truncated,
          });
        } else {
          results.push({
            index: i + 1,
            statement: stmt,
            status: "OK",
            rowsAffected: result.rowsAffected ?? 0,
          });
        }
      } catch (err) {
        results.push({ index: i + 1, statement: stmt, status: "ERROR", message: err.message });
        return { results, stoppedAt: i + 1 };
      }
    }
    return { results };
  } finally {
    await connection.close().catch(() => {});
  }
}
