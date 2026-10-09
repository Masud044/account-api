// Reporting endpoints: AP/AR aging, outstanding balance summary, a party statement,
// and a GL summary by account — all read-only, built on the same tables the rest
// of the app already uses.
import { getConnection, oracledb } from '../../config/db.js';

// partyTable is the company's real master data (SUPPLIER_INFO / CUSTOMER_INFO,
// copied over from the BWA instance) — STATUS there is a NUMBER (1 = active).
function modCfg(module) {
  if (module === 'AR') {
    return {
      invH: 'XX_AR_INVOICE_H_T', advT: 'XX_AR_ADVANCE_T', jrnH: 'XX_AR_JOURNAL_H_T',
      partyTable: 'CUSTOMER_INFO', partyCol: 'CUSTOMER_ID', partyNameCol: 'CUSTOMER_NAME',
    };
  }
  return {
    invH: 'XX_AP_INVOICE_H_T', advT: 'XX_AP_ADVANCE_T', jrnH: 'XX_AP_JOURNAL_H_T',
    partyTable: 'SUPPLIER_INFO', partyCol: 'SUPPLIER_ID', partyNameCol: 'SUPPLIER_NAME',
  };
}

// ---------------------------------------------------------------- aging report
export const getAging = async (params) => {
  const module = (params.module || 'AP').toUpperCase() === 'AR' ? 'AR' : 'AP';
  const c = modCfg(module);

  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`
        SELECT i.${c.partyCol} AS "partyId", p.${c.partyNameCol} AS "partyName",
               TO_CHAR(i.DUE_DATE,'YYYY-MM-DD') AS "due", i.BALANCE_DUE AS "balance", i.INVOICE_NO AS "no"
          FROM ${c.invH} i JOIN ${c.partyTable} p ON p.${c.partyCol} = i.${c.partyCol}
         WHERE i.STATUS NOT IN ('Cancelled') AND i.BALANCE_DUE > 0.001
         ORDER BY p.${c.partyNameCol}, i.DUE_DATE
      `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const byParty = {};
  for (const r of rows) {
    const due = new Date(r.due);
    const daysOverdue = Math.floor((today - due) / 86400000);
    let bucket = 'current';
    if (daysOverdue > 90) bucket = 'd90';
    else if (daysOverdue > 60) bucket = 'd6190';
    else if (daysOverdue > 30) bucket = 'd3160';
    else if (daysOverdue > 0) bucket = 'd130';

    if (!byParty[r.partyId]) {
      byParty[r.partyId] = { partyId: r.partyId, partyName: r.partyName, current: 0, d130: 0, d3160: 0, d6190: 0, d90: 0, total: 0, invoices: [] };
    }
    const b = Number(r.balance);
    byParty[r.partyId][bucket] += b;
    byParty[r.partyId].total += b;
    byParty[r.partyId].invoices.push({ no: r.no, due: r.due, balance: b, bucket });
  }

  const parties = Object.values(byParty).sort((a, b) => a.partyName.localeCompare(b.partyName));
  const totals = parties.reduce((acc, p) => {
    acc.current += p.current; acc.d130 += p.d130; acc.d3160 += p.d3160; acc.d6190 += p.d6190; acc.d90 += p.d90; acc.total += p.total;
    return acc;
  }, { current: 0, d130: 0, d3160: 0, d6190: 0, d90: 0, total: 0 });

  return { status: 200, body: { module, parties, totals } };
};

// ---------------------------------------------------------------- outstanding balance summary
export const getOutstanding = async (params) => {
  const module = (params.module || 'AP').toUpperCase() === 'AR' ? 'AR' : 'AP';
  const c = modCfg(module);

  let parties, outstandingRows, advanceRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT ${c.partyCol} AS "id", ${c.partyNameCol} AS "name" FROM ${c.partyTable} WHERE STATUS=1 ORDER BY ${c.partyNameCol}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      parties = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT ${c.partyCol} AS "id", SUM(BALANCE_DUE) AS "amt" FROM ${c.invH} WHERE STATUS NOT IN ('Cancelled') GROUP BY ${c.partyCol}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      outstandingRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT ${c.partyCol} AS "id", SUM(BALANCE_AMOUNT) AS "amt" FROM ${c.advT} WHERE STATUS != 'Cancelled' GROUP BY ${c.partyCol}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      advanceRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  const outMap = Object.fromEntries(outstandingRows.map((r) => [r.id, Number(r.amt)]));
  const advMap = Object.fromEntries(advanceRows.map((r) => [r.id, Number(r.amt)]));

  const rows = parties.map((p) => ({
    id: p.id, name: p.name,
    outstanding: outMap[p.id] || 0,
    advanceBalance: advMap[p.id] || 0,
  })).filter((r) => r.outstanding > 0.001 || r.advanceBalance > 0.001);

  const totals = rows.reduce((acc, r) => { acc.outstanding += r.outstanding; acc.advanceBalance += r.advanceBalance; return acc; }, { outstanding: 0, advanceBalance: 0 });

  return { status: 200, body: { module, rows, totals } };
};

// ---------------------------------------------------------------- party statement (full transaction history)
export const getStatement = async (params) => {
  const module = (params.module || 'AP').toUpperCase() === 'AR' ? 'AR' : 'AP';
  const partyId = parseInt(params.partyId, 10);
  if (!partyId) return { status: 400, body: { ok: false, error: 'partyId is required' } };
  const c = modCfg(module);

  let party;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT ${c.partyNameCol} AS "name" FROM ${c.partyTable} WHERE ${c.partyCol} = :id`, { id: partyId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      party = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  if (!party.length) return { status: 400, body: { ok: false, error: 'Not found' } };

  // A single running balance across ADVANCE/INVOICE/PAYMENT/REFUND entries isn't a
  // meaningful accounting figure (an "advance applied" entry and the invoice it
  // applies to represent different things that happen to share an amount) — so this
  // is a plain chronological transaction list, not a cumulative balance. Outstanding
  // and Advance balance on the main page remain the authoritative figures.
  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`
        SELECT TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date", h.JOURNAL_NO AS "no", h.SOURCE_TYPE AS "sourceType",
               h.DESCRIPTION AS "description", h.TOTAL_AMOUNT AS "amount"
          FROM ${c.jrnH} h WHERE h.${c.partyCol} = :id ORDER BY h.JOURNAL_ID
      `, { id: partyId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  return { status: 200, body: { module, partyId, partyName: party[0].name, rows } };
};

// ---------------------------------------------------------------- GL summary by account
export const getGlSummary = async (params) => {
  const module = (params.module || '').toUpperCase();
  const from = params.from || '';
  const to = params.to || '';

  const where = ["h.VOUCHERNO LIKE 'JRN-%'"];
  const binds = {};
  if (module === 'AP') where.push("h.VOUCHERNO NOT LIKE 'JRN-AR-%'");
  if (module === 'AR') where.push("h.VOUCHERNO LIKE 'JRN-AR-%'");
  if (from) { where.push(`h.TRANS_DATE >= TO_DATE(:p_from,'YYYY-MM-DD')`); binds.p_from = from; }
  if (to) { where.push(`h.TRANS_DATE <= TO_DATE(:p_to,'YYYY-MM-DD')`); binds.p_to = to; }

  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`
        SELECT d.CODE AS "code", a.ACCOUNT_NAME AS "name", SUM(d.DEBIT) AS "debit", SUM(d.CREDIT) AS "credit"
          FROM GLDETAILS d
          JOIN GLMASTER h ON h.ID = d.GLMASTERID
          JOIN CHART_OF_ACCOUNT a ON a.ACCOUNT_ID = d.CODE
         WHERE ${where.join(' AND ')}
         GROUP BY d.CODE, a.ACCOUNT_NAME
         ORDER BY 1
      `, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  const data = rows.map((r) => ({ code: r.code, name: r.name, debit: Number(r.debit), credit: Number(r.credit), net: Number(r.debit) - Number(r.credit) }));
  const totals = data.reduce((acc, r) => { acc.debit += r.debit; acc.credit += r.credit; return acc; }, { debit: 0, credit: 0 });

  return { status: 200, body: { rows: data, totals } };
};
