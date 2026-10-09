// Journal (own XX_AP/AR_JOURNAL_*) and General Ledger (the company's pre-existing
// GLMASTER/GLDETAILS) read-only views. Both read account codes directly from the
// single real chart (CHART_OF_ACCOUNT) — there is no separate synthetic chart or
// crosswalk anymore.
import { getConnection, oracledb } from '../../config/db.js';

export const listJournal = async (params) => {
  const module = (params.module || 'AP').toUpperCase() === 'AR' ? 'AR' : 'AP';
  const partyId = parseInt(params.partyId, 10) || 0;

  const hTable = module === 'AP' ? 'XX_AP_JOURNAL_H_T' : 'XX_AR_JOURNAL_H_T';
  const lTable = module === 'AP' ? 'XX_AP_JOURNAL_L_T' : 'XX_AR_JOURNAL_L_T';
  const partyTable = module === 'AP' ? 'SUPPLIER_INFO' : 'CUSTOMER_INFO';
  const partyCol = module === 'AP' ? 'SUPPLIER_ID' : 'CUSTOMER_ID';
  const partyNameCol = module === 'AP' ? 'SUPPLIER_NAME' : 'CUSTOMER_NAME';

  const where = partyId ? `WHERE h.${partyCol} = :pid` : '';
  const binds = partyId ? { pid: partyId } : {};

  let headers;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT h.JOURNAL_ID AS "id", h.JOURNAL_NO AS "no", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
                h.SOURCE_TYPE AS "sourceType", h.DESCRIPTION AS "description", h.TOTAL_AMOUNT AS "total",
                p.${partyNameCol} AS "partyName"
           FROM ${hTable} h LEFT JOIN ${partyTable} p ON p.${partyCol} = h.${partyCol}
           ${where}
          ORDER BY h.JOURNAL_ID DESC FETCH FIRST 100 ROWS ONLY`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      headers = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  const lines = {};
  if (headers.length) {
    const ids = headers.map((h) => h.id).join(',');
    let rows;
    {
      const conn = await getConnection();
      try {
        const result = await conn.execute(
          `SELECT l.JOURNAL_ID AS "jid", l.ACCOUNT_CODE AS "code", c.ACCOUNT_NAME AS "name",
                  l.DEBIT_AMOUNT AS "debit", l.CREDIT_AMOUNT AS "credit", l.DESCRIPTION AS "desc"
             FROM ${lTable} l JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = l.ACCOUNT_CODE
            WHERE l.JOURNAL_ID IN (${ids}) ORDER BY l.JOURNAL_ID, l.LINE_NO`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        rows = result.rows || [];
      } finally {
        await conn.close();
      }
    }
    for (const r of rows) (lines[r.jid] ||= []).push(r);
  }
  for (const h of headers) h.lines = lines[h.id] || [];

  return { status: 200, body: headers };
};

export const listGeneralLedger = async (params) => {
  const module = (params.module || '').toUpperCase();
  const accountCode = params.account || '';
  const from = params.from || '';
  const to = params.to || '';

  const where = ["h.VOUCHERNO LIKE 'JRN-%'"];
  const binds = {};
  if (module === 'AP') where.push("h.VOUCHERNO NOT LIKE 'JRN-AR-%'");
  if (module === 'AR') where.push("h.VOUCHERNO LIKE 'JRN-AR-%'");
  if (from) { where.push(`h.TRANS_DATE >= TO_DATE(:p_from,'YYYY-MM-DD')`); binds.p_from = from; }
  if (to) { where.push(`h.TRANS_DATE <= TO_DATE(:p_to,'YYYY-MM-DD')`); binds.p_to = to; }
  if (accountCode) {
    where.push(`EXISTS (SELECT 1 FROM GLDETAILS d WHERE d.GLMASTERID = h.ID AND d.CODE = :acc)`);
    binds.acc = accountCode;
  }

  let headers;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT h.ID AS "id", h.VOUCHERNO AS "no", TO_CHAR(h.TRANS_DATE,'YYYY-MM-DD') AS "date",
                h.VOUCHER_TYPE AS "voucherType", h.DESCRIPTION AS "description", h.POSTED AS "posted", h.CASHACCOUNT AS "cashAccount"
           FROM GLMASTER h WHERE ${where.join(' AND ')} ORDER BY h.ID DESC FETCH FIRST 200 ROWS ONLY`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      headers = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  const lines = {};
  let totalDr = 0, totalCr = 0;
  if (headers.length) {
    const ids = headers.map((h) => h.id).join(',');
    let rows;
    {
      const conn = await getConnection();
      try {
        const result = await conn.execute(
          `SELECT d.GLMASTERID AS "gid", d.CODE AS "code",
                  d.DEBIT AS "debit", d.CREDIT AS "credit", d.CODEDESCRIPTION AS "codeDesc", d.DESCRIPTION AS "desc"
             FROM GLDETAILS d
            WHERE d.GLMASTERID IN (${ids}) ORDER BY d.GLMASTERID, d.ID`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        rows = result.rows || [];
      } finally {
        await conn.close();
      }
    }
    for (const r of rows) {
      (lines[r.gid] ||= []).push(r);
      totalDr += Number(r.debit);
      totalCr += Number(r.credit);
    }
  }
  for (const h of headers) h.lines = lines[h.id] || [];

  return { status: 200, body: { headers, totalDr, totalCr } };
};

export const listGlAccounts = async () => {
  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`
        SELECT DISTINCT d.CODE AS "code", c.ACCOUNT_NAME AS "name"
          FROM GLDETAILS d JOIN GLMASTER h ON h.ID = d.GLMASTERID
          JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = d.CODE
         WHERE h.VOUCHERNO LIKE 'JRN-%'
         ORDER BY c.ACCOUNT_NAME
      `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return { status: 200, body: rows };
};
