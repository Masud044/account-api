// Accounts Receivable routes — a direct port of D:\xampp\htdocs\hms\receivable\api.php.
import { getConnection, oracledb } from '../../config/db.js';
import { postJournal, isPosted } from '../gl/service.js';

// Real CHART_OF_ACCOUNT leaf accounts added specifically for this module.
const AR_RECEIVABLE_ACCOUNT = '1020120000'; // Accounts Receivable - Trade (asset)
const AR_ADVANCE_ACCOUNT = '3020030000';    // Advance from Customers (liability) — clearing account
// The AP side's equivalent control accounts — excluded from AR's own account
// pickers below, for the same reason AR's are excluded from AP's (see ap.js).
const AP_PAYABLE_ACCOUNT = '3020020000';
const AP_ADVANCE_ACCOUNT = '1020130000';

// ---------------------------------------------------------------- customers
// Reads the company's real customer master (CUSTOMER_INFO, copied over from the
// BWA instance) — not a synthetic table of this module's own. STATUS there is a
// NUMBER (1 = active), unlike this app's own earlier 'Y'/'N' convention.
export const listCustomers = async () => {
  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT CUSTOMER_ID AS "id", CUSTOMER_NAME AS "name" FROM CUSTOMER_INFO WHERE STATUS=1 ORDER BY CUSTOMER_NAME`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return { status: 200, body: rows };
};

// ---------------------------------------------------------------- chart of accounts (same real chart as AP)
export const getCoa = async () => {
  // Excludes all four control accounts (both AR's own and AP's) — a line is
  // always a real posting/revenue-type account, never one of the clearing
  // accounts the app manages automatically.
  let revenue;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
          WHERE LASTLEVEL = 1 AND ENABLED = 1 AND NVL(ACCOUNT_TYPE,0) != 1
            AND ACCOUNT_ID NOT IN (:rec, :arAdv, :apPay, :apAdv) ORDER BY ACCOUNT_NAME`,
        { rec: AR_RECEIVABLE_ACCOUNT, arAdv: AR_ADVANCE_ACCOUNT, apPay: AP_PAYABLE_ACCOUNT, apAdv: AP_ADVANCE_ACCOUNT },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      revenue = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  let bank;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_TYPE = 1 AND ENABLED = 1 ORDER BY ACCOUNT_NAME`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      bank = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  // A receivable invoice records real revenue — scoped to just Income accounts
  // (code starting '4', this chart's convention), unlike the broader 'revenue'
  // list above which Advance lines use for free-form earmarking.
  let invoiceRevenue;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
          WHERE LASTLEVEL = 1 AND ENABLED = 1 AND ACCOUNT_ID LIKE '4%' ORDER BY ACCOUNT_NAME`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      invoiceRevenue = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return { status: 200, body: { revenue, invoiceRevenue, bank } };
};

// ---------------------------------------------------------------- one customer's full picture
export const getCustomer = async (params) => {
  const customerId = parseInt(params.id, 10);
  if (!customerId) return { status: 400, body: { ok: false, error: 'id is required' } };

  let cust;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT CUSTOMER_NAME FROM CUSTOMER_INFO WHERE CUSTOMER_ID = :id`, { id: customerId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      cust = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  if (!cust.length) return { status: 400, body: { ok: false, error: 'Customer not found' } };

  let invoiceRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT INVOICE_ID AS "id", INVOICE_NO AS "no",
                TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", TOTAL_AMOUNT AS "total", BALANCE_DUE AS "balance",
                ADVANCE_ADJUSTED AS "advanceAdjusted", RECEIVED_AMOUNT AS "received", STATUS AS "status", REMARKS AS "note"
           FROM XX_AR_INVOICE_H_T WHERE CUSTOMER_ID = :id AND STATUS != 'Cancelled' ORDER BY DUE_DATE`,
        { id: customerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      invoiceRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  let linkRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT aa.INVOICE_ID AS "invoiceId", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amt"
           FROM XX_AR_ADVANCE_ADJUSTMENT_T aa JOIN XX_AR_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
          WHERE a.CUSTOMER_ID = :id`,
        { id: customerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      linkRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  const linksByInvoice = {};
  for (const l of linkRows) (linksByInvoice[l.invoiceId] ||= []).push({ advNo: l.advNo, amt: Number(l.amt) });
  for (const inv of invoiceRows) inv.links = linksByInvoice[inv.id] || [];

  let advanceRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT ADVANCE_ID AS "id", ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date",
                ADVANCE_AMOUNT AS "total", ADJUSTED_AMOUNT AS "used", BALANCE_AMOUNT AS "balance", STATUS AS "status"
           FROM XX_AR_ADVANCE_T WHERE CUSTOMER_ID = :id AND STATUS != 'Cancelled' ORDER BY ADVANCE_DATE DESC`,
        { id: customerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      advanceRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  let receiptRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT RECEIPT_ID AS "id", RECEIPT_NO AS "no", TO_CHAR(RECEIPT_DATE,'YYYY-MM-DD') AS "date",
                TOTAL_AMOUNT AS "total", STATUS AS "status"
           FROM XX_AR_RECEIPT_H_T WHERE CUSTOMER_ID = :id ORDER BY RECEIPT_ID DESC`,
        { id: customerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      receiptRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  let refundRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT r.REFUND_ID AS "id", r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date",
                r.REFUND_AMOUNT AS "amount", r.STATUS AS "status", a.ADVANCE_NO AS "advNo"
           FROM XX_AR_ADVANCE_REFUND_T r JOIN XX_AR_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
          WHERE a.CUSTOMER_ID = :id ORDER BY r.REFUND_ID DESC`,
        { id: customerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      refundRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  let ledgerRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT h.DESCRIPTION AS "description", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
                h.TOTAL_AMOUNT AS "amount", h.SOURCE_TYPE AS "sourceType"
           FROM XX_AR_JOURNAL_H_T h WHERE h.CUSTOMER_ID = :id ORDER BY h.JOURNAL_ID DESC FETCH FIRST 8 ROWS ONLY`,
        { id: customerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      ledgerRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  for (const l of ledgerRows) l.positive = l.sourceType === 'ADVANCE';

  let outstanding = 0, advanceBalance = 0;
  for (const i of invoiceRows) outstanding += Number(i.balance);
  for (const a of advanceRows) advanceBalance += Number(a.balance);

  return {
    status: 200,
    body: {
      id: customerId,
      name: cust[0].CUSTOMER_NAME,
      outstanding,
      advanceBalance,
      invoices: invoiceRows,
      advances: advanceRows,
      receipts: receiptRows,
      refunds: refundRows,
      ledger: ledgerRows,
    },
  };
};

// ---------------------------------------------------------------- add a customer
// CUSTOMER_INFO.CUSTOMER_ID is assigned by its own CUST_AUTONUMBER trigger
// (CUST_SEQ), so it's omitted here — reading CUST_SEQ.CURRVAL right after the
// insert (same connection, before anything else touches that sequence) gives
// back the id that was just generated.
export const createCustomer = async (body) => {
  const name = (body.name || '').trim();
  if (!name) return { status: 400, body: { ok: false, error: 'Customer name is required' } };
  let result;
  let id;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO CUSTOMER_INFO (CUSTOMER_NAME, CONTACT_PERSON, PHONE, EMAIL, ADDRESS, STATUS)
         VALUES (:name, :contact, :phone, :email, :address, 1)`,
        { name, contact: body.contact || null, phone: body.phone || null, email: body.email || null, address: body.address || null }
      );
      // CURRVAL is session-scoped — read it on this same connection, otherwise
      // a pooled reconnect raises ORA-08002.
      const r = await conn.execute(`SELECT CUST_SEQ.CURRVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      id = (r.rows || [])[0].id;
      await conn.commit();
      result = { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      result = { ok: false, error: e.message };
    } finally {
      await conn.close();
    }
  }
  if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };
  return { status: 200, body: { ok: true, id } };
};

// ---------------------------------------------------------------- record a new advance receipt
export const recordAdvance = async (body) => {
  const customerId = parseInt(body.customer_id, 10);
  const date = (body.date || '').trim();
  const bankAccount = (body.bank_account_code || '').trim();
  const method = body.method || '';
  const ref = (body.reference_no || '').trim();
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!customerId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'customer_id, date and bank_account_code are required' } };

  const validLines = [];
  let total = 0;
  for (const l of lines) {
    const amt = Number(l.amount || 0);
    const acc = (l.account || '').trim();
    if (!acc || amt <= 0) continue;
    validLines.push({ account: acc, desc: (l.desc || '').trim(), amount: amt });
    total += amt;
  }
  if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

  let advanceId;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT XX_AR_ADVANCE_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      advanceId = (r.rows || [])[0].id;
    } finally {
      await conn.close();
    }
  }
  const advanceNo = 'ADV-R-' + String(advanceId).padStart(6, '0');

  let result;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO XX_AR_ADVANCE_T (ADVANCE_ID, ADVANCE_NO, CUSTOMER_ID, ADVANCE_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, ADVANCE_AMOUNT)
         VALUES (:id, :no, :cid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :total)`,
        { id: advanceId, no: advanceNo, cid: customerId, p_date: date, bank: bankAccount, method, ref, total }
      );
      await conn.commit();
      result = { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      result = { ok: false, error: e.message };
    } finally {
      await conn.close();
    }
  }
  if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };

  // The journal side always credits the fixed Advance-from-Customers control
  // account (AR_ADVANCE_ACCOUNT) — not each line's own account. The per-line
  // account is purely descriptive earmarking, stored on XX_AR_ADVANCE_L_T for
  // reference; it was a bug for it to also drive the journal, since the later
  // invoice-apply step always debits AR_ADVANCE_ACCOUNT specifically — debiting an
  // account that was never credited by the original advance, so its balance never
  // reflected real advance balances and only ever went negative as advances were
  // applied.
  let lineNo = 1;
  const journalLines = [{ account: bankAccount, debit: total, desc: `Advance ${advanceNo} received` }];
  for (const line of validLines) {
    let lineId;
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AR_ADVANCE_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        lineId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AR_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT) VALUES (:id, :aid, :lno, :acc, :desc, :amt)`,
          { id: lineId, aid: advanceId, lno: lineNo, acc: line.account, desc: line.desc, amt: line.amount }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    journalLines.push({ account: AR_ADVANCE_ACCOUNT, credit: line.amount, desc: line.desc });
    lineNo++;
  }
  const jrn = await postJournal('AR', 'ADVANCE', advanceId, customerId, date, `Advance receipt ${advanceNo}` + (ref ? ` (${ref})` : ''), journalLines);

  return { status: 200, body: { ok: true, advanceId, advanceNo, total, journalOk: jrn.ok } };
};

// ---------------------------------------------------------------- save a new receivable invoice (optionally linking an advance)
export const saveInvoice = async (body) => {
  const customerId = parseInt(body.customer_id, 10);
  const invoiceNo = (body.invoice_no || '').trim();
  const invoiceDate = (body.invoice_date || '').trim();
  const dueDate = (body.due_date || '').trim() || invoiceDate;
  const note = (body.note || '').trim();
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const linkAdvanceId = parseInt(body.link_advance_id, 10) || 0;
  const applyAmount = Number(body.apply_amount || 0);

  if (!customerId || !invoiceDate) return { status: 400, body: { ok: false, error: 'customer_id and invoice_date are required' } };
  if (!invoiceNo) return { status: 400, body: { ok: false, error: 'Invoice number is required' } };

  let dup;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT 1 FROM XX_AR_INVOICE_H_T WHERE CUSTOMER_ID = :cid AND UPPER(INVOICE_NO) = UPPER(:no)`, { cid: customerId, no: invoiceNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      dup = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  if (dup.length) return { status: 400, body: { ok: false, error: `${invoiceNo} already exists for this customer` } };

  const validLines = [];
  let gross = 0;
  for (const l of lines) {
    const amt = Number(l.amount || 0);
    const acc = (l.account || '').trim();
    if (!acc || amt <= 0) continue;
    validLines.push({ account: acc, desc: (l.desc || '').trim(), amount: amt });
    gross += amt;
  }
  if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

  let advance = null;
  if (linkAdvanceId) {
    let advRows;
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT * FROM XX_AR_ADVANCE_T WHERE ADVANCE_ID = :id AND CUSTOMER_ID = :cid`, { id: linkAdvanceId, cid: customerId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        advRows = r.rows || [];
      } finally {
        await conn.close();
      }
    }
    advance = advRows[0] || null;
    if (!advance) return { status: 400, body: { ok: false, error: 'Selected advance not found for this customer' } };
    if (applyAmount <= 0) return { status: 400, body: { ok: false, error: 'Enter an amount to apply from the linked advance' } };
    if (applyAmount > Math.min(Number(advance.BALANCE_AMOUNT), gross) + 0.001) {
      return { status: 400, body: { ok: false, error: 'Apply amount exceeds the advance balance or the invoice total' } };
    }
  }

  let invoiceId;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT XX_AR_INVOICE_H_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      invoiceId = (r.rows || [])[0].id;
    } finally {
      await conn.close();
    }
  }
  let result;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO XX_AR_INVOICE_H_T (INVOICE_ID, INVOICE_NO, CUSTOMER_ID, INVOICE_DATE, DUE_DATE, GROSS_AMOUNT, REMARKS)
         VALUES (:id, :no, :cid, TO_DATE(:p_date,'YYYY-MM-DD'), TO_DATE(:p_due,'YYYY-MM-DD'), :gross, :p_note)`,
        { id: invoiceId, no: invoiceNo, cid: customerId, p_date: invoiceDate, p_due: dueDate, gross, p_note: note }
      );
      await conn.commit();
      result = { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      result = { ok: false, error: e.message };
    } finally {
      await conn.close();
    }
  }
  if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };

  let lineNo = 1;
  const journalLines = [{ account: AR_RECEIVABLE_ACCOUNT, debit: gross, desc: `Invoice ${invoiceNo}` }];
  for (const line of validLines) {
    let lineId;
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AR_INVOICE_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        lineId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AR_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
           VALUES (:id, :iid, :lno, :acc, :desc, 1, :price)`,
          { id: lineId, iid: invoiceId, lno: lineNo, acc: line.account, desc: line.desc, price: line.amount }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    journalLines.push({ account: line.account, credit: line.amount, desc: line.desc });
    lineNo++;
  }
  await postJournal('AR', 'INVOICE', invoiceId, customerId, invoiceDate, `Receivable invoice ${invoiceNo}`, journalLines);

  if (advance && applyAmount > 0) {
    let adjId;
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AR_ADV_ADJ_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        adjId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AR_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT) VALUES (:id, :aid, :iid, :amt)`,
          { id: adjId, aid: advance.ADVANCE_ID, iid: invoiceId, amt: applyAmount }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AR_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
             STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
             LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :aid`,
          { amt: applyAmount, aid: advance.ADVANCE_ID }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AR_INVOICE_H_T SET ADVANCE_ADJUSTED = :amt,
             STATUS = CASE WHEN GROSS_AMOUNT - :amt <= 0 THEN 'Received' ELSE 'Partially Received' END,
             LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
          { amt: applyAmount, iid: invoiceId }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    await postJournal('AR', 'INVOICE', invoiceId, customerId, invoiceDate, `Advance ${advance.ADVANCE_NO} applied to ${invoiceNo}`, [
      { account: AR_ADVANCE_ACCOUNT, debit: applyAmount, desc: `Advance ${advance.ADVANCE_NO}` },
      { account: AR_RECEIVABLE_ACCOUNT, credit: applyAmount, desc: 'Advance applied' },
    ]);
  }

  return { status: 200, body: { ok: true, invoiceId, invoiceNo, total: gross, appliedFromAdvance: advance ? applyAmount : 0, advanceNo: advance ? advance.ADVANCE_NO : null } };
};

// ---------------------------------------------------------------- receive against selected invoices
export const settle = async (body) => {
  const customerId = parseInt(body.customer_id, 10);
  const date = (body.date || '').trim();
  const method = body.method || '';
  const bankAccount = (body.bank_account_code || '').trim();
  const applications = Array.isArray(body.applications) ? body.applications : [];

  if (!customerId || !date) return { status: 400, body: { ok: false, error: 'customer_id and date are required' } };

  let totalCash = 0, totalFromAdvance = 0;
  for (const a of applications) {
    totalCash += Number(a.payNow || 0);
    totalFromAdvance += Number(a.fromAdvance || 0);
  }
  if (totalCash > 0 && !bankAccount) return { status: 400, body: { ok: false, error: 'Select a Deposit To account for the cash portion' } };
  if (totalCash <= 0 && totalFromAdvance <= 0) return { status: 400, body: { ok: false, error: 'Nothing to receive' } };

  let openAdvances;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(
        `SELECT ADVANCE_ID, BALANCE_AMOUNT FROM XX_AR_ADVANCE_T WHERE CUSTOMER_ID = :cid AND STATUS != 'Cancelled' AND BALANCE_AMOUNT > 0 ORDER BY ADVANCE_DATE, ADVANCE_ID`,
        { cid: customerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      openAdvances = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const availableAdvance = openAdvances.reduce((s, a) => s + Number(a.BALANCE_AMOUNT), 0);
  if (totalFromAdvance > availableAdvance + 0.001) return { status: 400, body: { ok: false, error: 'Requested advance offset exceeds available advance balance' } };

  let receiptId = null, receiptNo = null;
  if (totalCash > 0) {
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AR_RECEIPT_H_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        receiptId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    receiptNo = 'RCPT-' + String(receiptId).padStart(6, '0');
    let result;
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AR_RECEIPT_H_T (RECEIPT_ID, RECEIPT_NO, CUSTOMER_ID, RECEIPT_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, TOTAL_AMOUNT)
           VALUES (:id, :no, :cid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :total)`,
          { id: receiptId, no: receiptNo, cid: customerId, p_date: date, bank: bankAccount, method, total: totalCash }
        );
        await conn.commit();
        result = { ok: true };
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
        result = { ok: false, error: e.message };
      } finally {
        await conn.close();
      }
    }
    if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };
  }

  const advanceRemaining = openAdvances.map((a) => ({ ...a }));
  for (const a of applications) {
    const invoiceId = parseInt(a.invoiceId, 10);
    const payNow = Number(a.payNow || 0);
    const fromAdvance = Number(a.fromAdvance || 0);
    if (!invoiceId || (payNow <= 0 && fromAdvance <= 0)) continue;

    if (payNow > 0 && receiptId) {
      let lineId;
      {
        const conn = await getConnection();
        try {
          const r = await conn.execute(`SELECT XX_AR_RECEIPT_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
          lineId = (r.rows || [])[0].id;
        } finally {
          await conn.close();
        }
      }
      {
        const conn = await getConnection();
        try {
          await conn.execute(`INSERT INTO XX_AR_RECEIPT_L_T (RECEIPT_LINE_ID, RECEIPT_ID, INVOICE_ID, APPLIED_AMOUNT) VALUES (:id, :rid, :iid, :amt)`, { id: lineId, rid: receiptId, iid: invoiceId, amt: payNow });
          await conn.commit();
        } catch (e) {
          try { await conn.rollback(); } catch (_) { /* ignore */ }
        } finally {
          await conn.close();
        }
      }
      {
        const conn = await getConnection();
        try {
          await conn.execute(`UPDATE XX_AR_INVOICE_H_T SET RECEIVED_AMOUNT = RECEIVED_AMOUNT + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: payNow, iid: invoiceId });
          await conn.commit();
        } catch (e) {
          try { await conn.rollback(); } catch (_) { /* ignore */ }
        } finally {
          await conn.close();
        }
      }
    }

    if (fromAdvance > 0) {
      let left = fromAdvance;
      for (const adv of advanceRemaining) {
        if (left <= 0) break;
        const take = Math.min(left, Number(adv.BALANCE_AMOUNT));
        if (take <= 0) continue;
        let adjId;
        {
          const conn = await getConnection();
          try {
            const r = await conn.execute(`SELECT XX_AR_ADV_ADJ_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            adjId = (r.rows || [])[0].id;
          } finally {
            await conn.close();
          }
        }
        {
          const conn = await getConnection();
          try {
            await conn.execute(
              `INSERT INTO XX_AR_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT, RECEIPT_ID) VALUES (:id, :advid, :iid, :amt, :rid)`,
              { id: adjId, advid: adv.ADVANCE_ID, iid: invoiceId, amt: take, rid: receiptId }
            );
            await conn.commit();
          } catch (e) {
            try { await conn.rollback(); } catch (_) { /* ignore */ }
          } finally {
            await conn.close();
          }
        }
        {
          const conn = await getConnection();
          try {
            await conn.execute(
              `UPDATE XX_AR_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
                 STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
                 LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
              { amt: take, advid: adv.ADVANCE_ID }
            );
            await conn.commit();
          } catch (e) {
            try { await conn.rollback(); } catch (_) { /* ignore */ }
          } finally {
            await conn.close();
          }
        }
        {
          const conn = await getConnection();
          try {
            await conn.execute(`UPDATE XX_AR_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: take, iid: invoiceId });
            await conn.commit();
          } catch (e) {
            try { await conn.rollback(); } catch (_) { /* ignore */ }
          } finally {
            await conn.close();
          }
        }
        adv.BALANCE_AMOUNT = Number(adv.BALANCE_AMOUNT) - take;
        left -= take;
      }
    }

    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AR_INVOICE_H_T SET STATUS = CASE
             WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - RECEIVED_AMOUNT <= 0 THEN 'Received'
             WHEN ADVANCE_ADJUSTED + RECEIVED_AMOUNT > 0 THEN 'Partially Received'
             ELSE STATUS END WHERE INVOICE_ID = :iid`,
          { iid: invoiceId }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
  }

  const journalLines = [];
  if (totalCash + totalFromAdvance > 0) journalLines.push({ account: AR_RECEIVABLE_ACCOUNT, credit: totalCash + totalFromAdvance, desc: 'Invoices received' });
  if (totalCash > 0) journalLines.push({ account: bankAccount, debit: totalCash, desc: receiptNo || 'Receipt' });
  if (totalFromAdvance > 0) journalLines.push({ account: AR_ADVANCE_ACCOUNT, debit: totalFromAdvance, desc: 'Advance applied' });
  await postJournal('AR', 'RECEIPT', receiptId || 0, customerId, date, 'Receipt' + (receiptNo ? ` ${receiptNo}` : ''), journalLines);

  return { status: 200, body: { ok: true, receiptNo, totalCash, totalFromAdvance } };
};

// ---------------------------------------------------------------- cancel an invoice
export const cancelInvoice = async (body) => {
  const invoiceId = parseInt(body.invoice_id, 10);
  if (!invoiceId) return { status: 400, body: { ok: false, error: 'invoice_id is required' } };

  let rows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const invoice = rows[0];
  if (!invoice) return { status: 400, body: { ok: false, error: 'Invoice not found' } };
  if (invoice.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Invoice is already cancelled' } };
  if (Number(invoice.RECEIVED_AMOUNT) > 0) return { status: 400, body: { ok: false, error: 'This invoice has cash receipts recorded — cancel the related receipt(s) first.' } };
  if (await isPosted('AR', 'INVOICE', invoiceId)) return { status: 400, body: { ok: false, error: 'This invoice has already been posted to the general ledger and can no longer be cancelled.' } };

  let adjustments;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      adjustments = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  for (const adj of adjustments) {
    if (adj.RECEIPT_ID !== null) return { status: 400, body: { ok: false, error: 'This invoice has an advance applied via a receipt — cancel that receipt first.' } };
  }

  for (const adj of adjustments) {
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AR_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
             STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
             LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
          { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(`DELETE FROM XX_AR_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
  }

  let lines;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT ACCOUNT_CODE AS "code", LINE_AMOUNT AS "amount", ITEM_DESCRIPTION AS "desc" FROM XX_AR_INVOICE_L_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      lines = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const journalLines = [{ account: AR_RECEIVABLE_ACCOUNT, credit: Number(invoice.GROSS_AMOUNT) + Number(invoice.TAX_AMOUNT), desc: 'Invoice cancelled' }];
  for (const l of lines) journalLines.push({ account: l.code, debit: l.amount, desc: l.desc });
  await postJournal('AR', 'INVOICE', invoiceId, invoice.CUSTOMER_ID, new Date().toISOString().slice(0, 10), `Invoice ${invoice.INVOICE_NO} cancelled`, journalLines);

  {
    const conn = await getConnection();
    try {
      await conn.execute(`UPDATE XX_AR_INVOICE_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { id: invoiceId });
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

  return { status: 200, body: { ok: true, invoiceNo: invoice.INVOICE_NO } };
};

// ---------------------------------------------------------------- cancel a receipt
export const cancelReceipt = async (body) => {
  const receiptId = parseInt(body.receipt_id, 10);
  if (!receiptId) return { status: 400, body: { ok: false, error: 'receipt_id is required' } };

  let rows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_RECEIPT_H_T WHERE RECEIPT_ID = :id`, { id: receiptId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const receipt = rows[0];
  if (!receipt) return { status: 400, body: { ok: false, error: 'Receipt not found' } };
  if (receipt.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Receipt is already cancelled' } };
  if (await isPosted('AR', 'RECEIPT', receiptId)) return { status: 400, body: { ok: false, error: 'This receipt has already been posted to the general ledger and can no longer be cancelled.' } };

  let rcptLines;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_RECEIPT_L_T WHERE RECEIPT_ID = :id`, { id: receiptId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rcptLines = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  let advAdjustments;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_ADVANCE_ADJUSTMENT_T WHERE RECEIPT_ID = :id`, { id: receiptId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      advAdjustments = r.rows || [];
    } finally {
      await conn.close();
    }
  }

  let totalCash = 0, totalAdvance = 0;

  for (const rl of rcptLines) {
    totalCash += Number(rl.APPLIED_AMOUNT);
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AR_INVOICE_H_T SET RECEIVED_AMOUNT = RECEIVED_AMOUNT - :amt,
             STATUS = CASE
               WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - (RECEIVED_AMOUNT - :amt) <= 0 THEN 'Received'
               WHEN ADVANCE_ADJUSTED + (RECEIVED_AMOUNT - :amt) > 0 THEN 'Partially Received'
               ELSE 'Draft' END,
             LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
          { amt: rl.APPLIED_AMOUNT, iid: rl.INVOICE_ID }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
  }

  for (const adj of advAdjustments) {
    totalAdvance += Number(adj.ADJUSTED_AMOUNT);
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AR_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
             STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
             LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
          { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AR_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED - :amt,
             STATUS = CASE
               WHEN GROSS_AMOUNT + TAX_AMOUNT - (ADVANCE_ADJUSTED - :amt) - RECEIVED_AMOUNT <= 0 THEN 'Received'
               WHEN (ADVANCE_ADJUSTED - :amt) + RECEIVED_AMOUNT > 0 THEN 'Partially Received'
               ELSE 'Draft' END,
             LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
          { amt: adj.ADJUSTED_AMOUNT, iid: adj.INVOICE_ID }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(`DELETE FROM XX_AR_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
  }

  const journalLines = [];
  if (totalCash + totalAdvance > 0) journalLines.push({ account: AR_RECEIVABLE_ACCOUNT, debit: totalCash + totalAdvance, desc: 'Receipt reversed' });
  if (totalCash > 0) journalLines.push({ account: receipt.BANK_ACCOUNT_CODE, credit: totalCash, desc: `Receipt ${receipt.RECEIPT_NO} cancelled` });
  if (totalAdvance > 0) journalLines.push({ account: AR_ADVANCE_ACCOUNT, credit: totalAdvance, desc: 'Advance restored' });
  if (journalLines.length) await postJournal('AR', 'RECEIPT', receiptId, receipt.CUSTOMER_ID, new Date().toISOString().slice(0, 10), `Receipt ${receipt.RECEIPT_NO} cancelled`, journalLines);

  {
    const conn = await getConnection();
    try {
      await conn.execute(`UPDATE XX_AR_RECEIPT_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE RECEIPT_ID = :id`, { id: receiptId });
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

  return { status: 200, body: { ok: true, receiptNo: receipt.RECEIPT_NO } };
};

// ---------------------------------------------------------------- refund an advance
export const refundAdvance = async (body) => {
  const advanceId = parseInt(body.advance_id, 10);
  const date = (body.date || '').trim();
  const bankAccount = (body.bank_account_code || '').trim();
  const method = body.method || '';
  const ref = (body.reference_no || '').trim();
  const amount = Number(body.amount || 0);
  const remarks = (body.remarks || '').trim();

  if (!advanceId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'advance_id, date and bank_account_code are required' } };
  if (amount <= 0) return { status: 400, body: { ok: false, error: 'Enter a refund amount greater than zero' } };

  let rows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const advance = rows[0];
  if (!advance) return { status: 400, body: { ok: false, error: 'Advance not found' } };
  if (advance.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'This advance is cancelled' } };
  if (amount > Number(advance.BALANCE_AMOUNT) + 0.001) return { status: 400, body: { ok: false, error: 'Refund amount exceeds the available (unadjusted) advance balance' } };

  let refundId;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT XX_AR_ADV_REFUND_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      refundId = (r.rows || [])[0].id;
    } finally {
      await conn.close();
    }
  }
  const refundNo = 'REF-R-' + String(refundId).padStart(6, '0');

  let result;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO XX_AR_ADVANCE_REFUND_T (REFUND_ID, REFUND_NO, ADVANCE_ID, REFUND_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, REFUND_AMOUNT, REMARKS)
         VALUES (:id, :no, :advid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :amt, :p_remarks)`,
        { id: refundId, no: refundNo, advid: advanceId, p_date: date, bank: bankAccount, method, ref, amt: amount, p_remarks: remarks }
      );
      await conn.commit();
      result = { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      result = { ok: false, error: e.message };
    } finally {
      await conn.close();
    }
  }
  if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };

  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `UPDATE XX_AR_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT + :amt,
           STATUS = CASE
             WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT + :amt) > 0 THEN 'Partially Adjusted'
             WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted'
             ELSE 'Refunded' END,
           LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
        { amt: amount, advid: advanceId }
      );
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

  const jrn = await postJournal('AR', 'REFUND', refundId, advance.CUSTOMER_ID, date, `Advance ${advance.ADVANCE_NO} refunded` + (ref ? ` (${ref})` : ''), [
    { account: AR_ADVANCE_ACCOUNT, debit: amount, desc: `Advance ${advance.ADVANCE_NO} refunded` },
    { account: bankAccount, credit: amount, desc: `Refund ${refundNo}` },
  ]);

  return { status: 200, body: { ok: true, refundId, refundNo, amount, journalOk: jrn.ok } };
};

// ---------------------------------------------------------------- cancel an advance refund
export const cancelRefund = async (body) => {
  const refundId = parseInt(body.refund_id, 10);
  if (!refundId) return { status: 400, body: { ok: false, error: 'refund_id is required' } };

  let rows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_ADVANCE_REFUND_T WHERE REFUND_ID = :id`, { id: refundId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const refund = rows[0];
  if (!refund) return { status: 400, body: { ok: false, error: 'Refund not found' } };
  if (refund.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Refund is already cancelled' } };
  if (await isPosted('AR', 'REFUND', refundId)) return { status: 400, body: { ok: false, error: 'This refund has already been posted to the general ledger and can no longer be cancelled.' } };

  let advRows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AR_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: refund.ADVANCE_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      advRows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const advance = advRows[0];
  if (!advance) return { status: 400, body: { ok: false, error: 'Related advance not found' } };

  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `UPDATE XX_AR_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT - :amt,
           STATUS = CASE
             WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT - :amt) <= 0 THEN
               CASE WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted' ELSE 'Refunded' END
             WHEN ADJUSTED_AMOUNT > 0 OR (REFUNDED_AMOUNT - :amt) > 0 THEN 'Partially Adjusted'
             ELSE 'Open' END,
           LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
        { amt: refund.REFUND_AMOUNT, advid: refund.ADVANCE_ID }
      );
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

  await postJournal('AR', 'REFUND', refundId, advance.CUSTOMER_ID, new Date().toISOString().slice(0, 10), `Refund ${refund.REFUND_NO} cancelled`, [
    { account: refund.BANK_ACCOUNT_CODE, debit: refund.REFUND_AMOUNT, desc: `Refund ${refund.REFUND_NO} cancelled` },
    { account: AR_ADVANCE_ACCOUNT, credit: refund.REFUND_AMOUNT, desc: 'Advance refund reversed' },
  ]);

  {
    const conn = await getConnection();
    try {
      await conn.execute(`UPDATE XX_AR_ADVANCE_REFUND_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`, { id: refundId });
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

  return { status: 200, body: { ok: true, refundNo: refund.REFUND_NO } };
};
