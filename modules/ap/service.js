

// // Accounts Payable routes — a direct port of D:\xampp\htdocs\hms\payable\api.php.
// import { getConnection, withConnection, oracledb } from '../../config/db.js';
// import { postJournal, isPosted, rewriteJournalTx } from '../gl/service.js';

// // Real CHART_OF_ACCOUNT leaf accounts added specifically for this module.
// const AP_PAYABLE_ACCOUNT = '3020020000'; // Accounts Payable - Trade (liability)
// const AP_ADVANCE_ACCOUNT = '1020120000'; // Advances to Suppliers (asset) — clearing account
// // The AR side's equivalent control accounts — excluded from AP's own account pickers.
// const AR_RECEIVABLE_ACCOUNT = '1020120000';
// const AR_ADVANCE_ACCOUNT = '3020030000';

// // XX_AP_ADVANCE_L_T.ACCOUNT_CODE has a foreign key to CHART_OF_ACCOUNT.ACCOUNT_ID
// // (XX_AP_ADV_L_ACC_FK2), and so do the AP journal lines. Never assume a hard-coded
// // control account exists in the live chart: resolve the Advances-to-Suppliers
// // account against CHART_OF_ACCOUNT first, so a missing code cannot surface as a
// // raw ORA-02291 and a selected account is always saved as a real ACCOUNT_ID.
// const ADVANCE_ACCOUNT_MISSING =
//   'No "advances to suppliers" account was found in CHART_OF_ACCOUNT. Set AP_ADVANCE_ACCOUNT_CODE to an existing account code.';
// const roundCents = (v) => Math.round((Number(v) || 0) * 100) / 100;
// let advanceAccountPromise;
// async function resolveAdvanceAccount() {
//   if (advanceAccountPromise === undefined) {
//     advanceAccountPromise = (async () => {
//       const wanted = [...new Set([String(process.env.AP_ADVANCE_ACCOUNT_CODE || '').trim(), AP_ADVANCE_ACCOUNT].filter(Boolean))];
//       for (const code of wanted) {
//         const rows = await runSelect(
//           `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//             WHERE ACCOUNT_ID = :code AND NVL(ENABLED,1) = 1`,
//           { code }
//         );
//         if (rows.length) return { code: String(rows[0].code), name: rows[0].name };
//       }
//       // The configured/legacy code is not in this chart — use the chart's own
//       // advance account if there is exactly one, never a guessed/hard-coded code.
//       const rows = await runSelect(
//         `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//           WHERE LASTLEVEL = 1 AND NVL(ENABLED,1) = 1 AND NVL(ACCOUNT_TYPE,0) != 1
//             AND UPPER(ACCOUNT_NAME) LIKE '%ADVANCE%' ORDER BY ACCOUNT_ID`
//       );
//       return rows.length === 1 ? { code: String(rows[0].code), name: rows[0].name } : null;
//     })().catch(() => null);
//   }
//   const found = await advanceAccountPromise;
//   if (!found) advanceAccountPromise = undefined; // allow a later retry (e.g. account just created)
//   return found;
// }

// // Readable error (instead of a raw ORA-02291) when a journal account code is not in CHART_OF_ACCOUNT.
// async function assertAccountsExist(codes) {
//   const list = [...new Set(codes.map((c) => String(c || '').trim()).filter(Boolean))];
//   if (!list.length) return;
//   const binds = {};
//   list.forEach((c, i) => { binds['c' + i] = c; });
//   const rows = await runSelect(`SELECT ACCOUNT_ID AS "code" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_ID IN (${list.map((_, i) => ':c' + i).join(',')})`, binds);
//   const have = new Set(rows.map((r) => String(r.code)));
//   const missing = list.filter((c) => !have.has(c));
//   if (missing.length) throw new Error(`Account ${missing.join(', ')} was not found in CHART_OF_ACCOUNT.`);
// }

// // The invoice's Description (stored in REMARKS) is carried into every journal
// // description / line so it shows up everywhere (recent activity, GL voucher, reports).
// // Capped so it can never overflow a narrow DESCRIPTION column.
// const withNote = (base, note) => {
//   const n = String(note || '').trim();
//   const t = n ? `${base} - ${n}` : base;
//   return t.length > 150 ? t.slice(0, 147) + '...' : t;
// };

// const num = (v) => Number(v || 0);
// const today = () => new Date().toISOString().slice(0, 10);

// // ---------------------------------------------------------------- small DB helpers
// // Each helper opens its own pooled connection and always closes it.
// async function runSelect(sql, binds = {}) {
//   const conn = await getConnection();
//   try {
//     const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return r.rows || [];
//   } finally {
//     await conn.close();
//   }
// }

// async function nextVal(seq) {
//   const rows = await runSelect(`SELECT ${seq}.NEXTVAL AS "id" FROM DUAL`);
//   return rows[0].id;
// }

// // Single write + commit. Returns { ok, error } and never throws (same best-effort
// // behaviour the original per-statement blocks had).
// async function runWrite(sql, binds = {}) {
//   const conn = await getConnection();
//   try {
//     await conn.execute(sql, binds);
//     await conn.commit();
//     return { ok: true };
//   } catch (e) {
//     try { await conn.rollback(); } catch (_) { /* ignore */ }
//     return { ok: false, error: e.message };
//   } finally {
//     await conn.close();
//   }
// }

// // Descriptions (REMARKS) of the given invoices, de-duplicated.
// async function invoiceNotes(ids) {
//   const list = [...new Set((ids || []).map((x) => parseInt(x, 10)).filter(Boolean))];
//   if (!list.length) return [];
//   const binds = {};
//   list.forEach((id, i) => { binds['i' + i] = id; });
//   const rows = await runSelect(`SELECT DISTINCT REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID IN (${list.map((_, i) => ':i' + i).join(',')})`, binds);
//   return rows.map((r) => r.note).filter(Boolean);
// }

// // Distinct line descriptions of an advance (what the user typed as "Description").
// async function advanceNotes(advanceId) {
//   const id = parseInt(advanceId, 10);
//   if (!id) return [];
//   const rows = await runSelect(`SELECT DISTINCT DESCRIPTION AS "note" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id });
//   return rows.map((r) => r.note).filter(Boolean);
// }

// // ---------------------------------------------------------------- vendors
// export const listVendors = async () => {
//   const rows = await runSelect(`SELECT SUPPLIER_ID AS "id", SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE STATUS=1 ORDER BY SUPPLIER_NAME`);
//   return { status: 200, body: rows };
// };

// // ---------------------------------------------------------------- chart of accounts
// export const getCoa = async () => {
//   const advanceAccount = await resolveAdvanceAccount();
//   const expense = await runSelect(
//     `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//       WHERE LASTLEVEL = 1 AND ENABLED = 1 AND NVL(ACCOUNT_TYPE,0) != 1
//         AND ACCOUNT_ID NOT IN (:pay, :apAdv, :arRec, :arAdv) ORDER BY ACCOUNT_NAME`,
//     {
//       pay: AP_PAYABLE_ACCOUNT,
//       apAdv: advanceAccount ? advanceAccount.code : AP_ADVANCE_ACCOUNT,
//       arRec: AR_RECEIVABLE_ACCOUNT,
//       arAdv: AR_ADVANCE_ACCOUNT,
//     }
//   );
//   const bank = await runSelect(`SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_TYPE = 1 AND ENABLED = 1 ORDER BY ACCOUNT_NAME`);
//   // A payable invoice records a real expense — only Expense accounts (code starting '5').
//   const invoiceExpense = await runSelect(
//     `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//       WHERE LASTLEVEL = 1 AND ENABLED = 1 AND ACCOUNT_ID LIKE '5%' ORDER BY ACCOUNT_NAME`
//   );
//   // The resolved advance control account, so the UI labels the account that is
//   // actually posted instead of assuming the hard-coded code exists.
//   return { status: 200, body: { expense, invoiceExpense, bank, advanceAccount } };
// };

// // ---------------------------------------------------------------- one vendor's full picture
// export const getVendor = async (params) => {
//   const supplierId = parseInt(params.id, 10);
//   if (!supplierId) return { status: 400, body: { ok: false, error: 'id is required' } };

//   const sup = await runSelect(`SELECT SUPPLIER_NAME FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId });
//   if (!sup.length) return { status: 400, body: { ok: false, error: 'Vendor not found' } };

//   const invoiceRows = await runSelect(
//     `SELECT INVOICE_ID AS "id", INVOICE_NO AS "no", SUPPLIER_INVOICE_NO AS "supNo",
//             TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", TOTAL_AMOUNT AS "total", BALANCE_DUE AS "balance",
//             ADVANCE_ADJUSTED AS "advanceAdjusted", PAID_AMOUNT AS "paid", STATUS AS "status", REMARKS AS "note"
//        FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY DUE_DATE`,
//     { id: supplierId }
//   );

//   const linkRows = await runSelect(
//     `SELECT aa.INVOICE_ID AS "invoiceId", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amt"
//        FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
//       WHERE a.SUPPLIER_ID = :id`,
//     { id: supplierId }
//   );
//   const linksByInvoice = {};
//   for (const l of linkRows) (linksByInvoice[l.invoiceId] ||= []).push({ advNo: l.advNo, amt: Number(l.amt) });
//   for (const inv of invoiceRows) inv.links = linksByInvoice[inv.id] || [];

//   const advanceRows = await runSelect(
//     `SELECT ADVANCE_ID AS "id", ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date",
//             ADVANCE_AMOUNT AS "total", ADJUSTED_AMOUNT AS "used", BALANCE_AMOUNT AS "balance", STATUS AS "status"
//        FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY ADVANCE_DATE DESC`,
//     { id: supplierId }
//   );

//   const ledgerRows = await runSelect(
//     `SELECT h.JOURNAL_ID AS "journalId", h.JOURNAL_NO AS "journalNo", h.SOURCE_ID AS "sourceId",
//             h.DESCRIPTION AS "description", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
//             h.TOTAL_AMOUNT AS "amount", h.SOURCE_TYPE AS "sourceType"
//        FROM XX_AP_JOURNAL_H_T h WHERE h.SUPPLIER_ID = :id ORDER BY h.JOURNAL_ID DESC FETCH FIRST 20 ROWS ONLY`,
//     { id: supplierId }
//   );
//   for (const l of ledgerRows) l.positive = l.sourceType === 'ADVANCE';

//   // which ledger rows show the edit pencil.
//   // An invoice that had an advance linked at creation owns 2 journals
//   // ("Payable invoice ..." and "Advance ... applied to ..."); both rows get the pencil.
//   {
//     const conn = await getConnection();
//     try {
//       for (const l of ledgerRows) {
//         l.editable = false;
//         if (l.sourceType !== 'ADVANCE') continue; // only the advance-creation row is editable from the UI
//         // advance-only settlement: journaled with SOURCE_ID = 0, so it is identified by its journal id
//         const isSettle = l.sourceType === 'PAYMENT' && Number(l.sourceId) === 0;
//         const st = await checkEditable(conn, isSettle ? 'SETTLEMENT' : l.sourceType, isSettle ? Number(l.journalId) : Number(l.sourceId));
//         l.editable = st.editable && st.journals.some((j) => Number(j.journalId) === Number(l.journalId));
//       }
//     } finally {
//       await conn.close();
//     }
//   }

//   const paymentRows = await runSelect(
//     `SELECT PAYMENT_ID AS "id", PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date",
//             TOTAL_AMOUNT AS "total", STATUS AS "status"
//        FROM XX_AP_PAYMENT_H_T WHERE SUPPLIER_ID = :id ORDER BY PAYMENT_ID DESC`,
//     { id: supplierId }
//   );

//   // Which payments show the edit pencil. Same rules as checkEditable('PAYMENT'):
//   // not cancelled, exactly one journal, not posted to the GL, no advance applied.
//   // The update endpoint re-checks them on the locked row before writing.
//   if (paymentRows.length) {
//     const flags = await runSelect(
//       `SELECT p.PAYMENT_ID AS "id",
//               CASE WHEN NVL(p.STATUS,'Active') = 'Cancelled' THEN 0
//                    WHEN EXISTS (SELECT 1 FROM XX_AP_ADVANCE_ADJUSTMENT_T aa WHERE aa.PAYMENT_ID = p.PAYMENT_ID) THEN 0
//                    WHEN (SELECT COUNT(*) FROM XX_AP_JOURNAL_H_T h WHERE h.SOURCE_TYPE = 'PAYMENT' AND h.SOURCE_ID = p.PAYMENT_ID) <> 1 THEN 0
//                    WHEN EXISTS (SELECT 1 FROM XX_AP_JOURNAL_H_T h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
//                                  WHERE h.SOURCE_TYPE = 'PAYMENT' AND h.SOURCE_ID = p.PAYMENT_ID AND g.POSTED = 1) THEN 0
//                    ELSE 1 END AS "editable"
//          FROM XX_AP_PAYMENT_H_T p WHERE p.SUPPLIER_ID = :id`,
//       { id: supplierId }
//     );
//     const editableById = {};
//     for (const f of flags) editableById[f.id] = Number(f.editable) === 1;
//     for (const p of paymentRows) p.editable = !!editableById[p.id];
//   }

//   {
//     const noteRows = await runSelect(
//       `SELECT pl.PAYMENT_ID AS "pid", i.REMARKS AS "note"
//          FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
//         WHERE i.SUPPLIER_ID = :id
//        UNION
//        SELECT aa.PAYMENT_ID, i.REMARKS
//          FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
//         WHERE i.SUPPLIER_ID = :id AND aa.PAYMENT_ID IS NOT NULL`,
//       { id: supplierId }
//     );
//     const byPay = {};
//     for (const r of noteRows) if (r.note) (byPay[r.pid] ||= []).push(r.note);
//     for (const p of paymentRows) p.note = (byPay[p.id] || []).join('; ');
//   }

//   const refundRows = await runSelect(
//     `SELECT r.REFUND_ID AS "id", r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date",
//             r.REFUND_AMOUNT AS "amount", r.STATUS AS "status", a.ADVANCE_NO AS "advNo"
//        FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
//       WHERE a.SUPPLIER_ID = :id ORDER BY r.REFUND_ID DESC`,
//     { id: supplierId }
//   );

//   let outstanding = 0, advanceBalance = 0;
//   for (const i of invoiceRows) outstanding += Number(i.balance);
//   for (const a of advanceRows) advanceBalance += Number(a.balance);

//   return {
//     status: 200,
//     body: {
//       id: supplierId,
//       name: sup[0].SUPPLIER_NAME,
//       outstanding,
//       advanceBalance,
//       invoices: invoiceRows,
//       advances: advanceRows,
//       payments: paymentRows,
//       refunds: refundRows,
//       ledger: ledgerRows,
//     },
//   };
// };

// // ---------------------------------------------------------------- add a vendor
// // SUPPLIER_ID comes from the SUPPLIER_AUTONUMBER trigger (SUPPLIER_SEQ); CURRVAL is
// // session-scoped so it must be read on the same connection as the insert.
// export const createVendor = async (body) => {
//   const name = (body.name || '').trim();
//   if (!name) return { status: 400, body: { ok: false, error: 'Vendor name is required' } };
//   const conn = await getConnection();
//   try {
//     await conn.execute(
//       `INSERT INTO SUPPLIER_INFO (SUPPLIER_NAME, CONTACT_PERSON, PHONE, EMAIL, ADDRESS, STATUS)
//        VALUES (:name, :contact, :phone, :email, :address, 1)`,
//       { name, contact: body.contact || null, phone: body.phone || null, email: body.email || null, address: body.address || null }
//     );
//     const r = await conn.execute(`SELECT SUPPLIER_SEQ.CURRVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     const id = (r.rows || [])[0].id;
//     await conn.commit();
//     return { status: 200, body: { ok: true, id } };
//   } catch (e) {
//     try { await conn.rollback(); } catch (_) { /* ignore */ }
//     return { status: 400, body: { ok: false, error: e.message } };
//   } finally {
//     await conn.close();
//   }
// };

// // ---------------------------------------------------------------- record a new advance
// // Header + lines are saved in ONE transaction. Line account is always the fixed
// // Advances-to-Suppliers control account (the journal debits it too).
// export const recordAdvance = async (body) => {
//   const supplierId = parseInt(body.supplier_id, 10);
//   const date = (body.date || '').trim();
//   const bankAccount = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   const ref = (body.reference_no || '').trim();
//   const lines = Array.isArray(body.lines) ? body.lines : [];

//   if (!supplierId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'supplier_id, date and bank_account_code are required' } };

//   // The line account must already exist in CHART_OF_ACCOUNT (FK XX_AP_ADV_L_ACC_FK2).
//   const advanceAccount = await resolveAdvanceAccount();
//   if (!advanceAccount) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const validLines = [];
//   let total = 0;
//   for (const l of lines) {
//     const amt = roundCents(l.amount);
//     if (amt <= 0) continue;
//     const d = (l.desc || '').trim();
//     if (!d) return { status: 400, body: { ok: false, error: 'Description is required on every advance line' } };
//     validLines.push({ account: advanceAccount.code, desc: d, amount: amt });
//     total += amt;
//   }
//   total = roundCents(total);
//   if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an amount greater than zero' } };

//   const o = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
//   let advanceId, advanceNo;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT XX_AP_ADVANCE_S.NEXTVAL AS "id" FROM DUAL`, {}, o);
//       advanceId = (r.rows || [])[0].id;
//       advanceNo = 'ADV-' + String(advanceId).padStart(6, '0');
//       await conn.execute(
//         `INSERT INTO XX_AP_ADVANCE_T (ADVANCE_ID, ADVANCE_NO, SUPPLIER_ID, ADVANCE_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, ADVANCE_AMOUNT)
//          VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :total)`,
//         { id: advanceId, no: advanceNo, sid: supplierId, p_date: date, bank: bankAccount, method, ref, total }, o);
//       let n = 0;
//       for (const line of validLines) {
//         await conn.execute(
//           `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT)
//            VALUES (XX_AP_ADVANCE_L_S.NEXTVAL, :aid, :lno, :acc, :p_desc, :amt)`,
//           { aid: advanceId, lno: ++n, acc: line.account, p_desc: line.desc, amt: line.amount }, o);
//       }
//       await conn.commit();
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//       return { status: 400, body: { ok: false, error: e.message } };
//     } finally {
//       await conn.close();
//     }
//   }

//   const advNote = [...new Set(validLines.map((x) => x.desc))].join('; ');
//   const journalLines = validLines.map((l) => ({ account: advanceAccount.code, debit: l.amount, desc: l.desc }));
//   journalLines.push({ account: bankAccount, credit: total, desc: withNote(`Advance ${advanceNo} paid`, advNote) });
//   const jrn = await postJournal('AP', 'ADVANCE', advanceId, supplierId, date, withNote(`Advance payment ${advanceNo}`, advNote) + (ref ? ` (${ref})` : ''), journalLines);

//   if (!jrn.ok) {
//     // never keep a half-saved advance
//     const conn = await getConnection();
//     try {
//       await conn.execute(`DELETE FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id: advanceId }, o);
//       await conn.execute(`DELETE FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }, o);
//       await conn.commit();
//     } catch (_) {
//       try { await conn.rollback(); } catch (__) { /* ignore */ }
//     } finally {
//       await conn.close();
//     }
//     return { status: 400, body: { ok: false, error: jrn.error || 'Journal posting failed' } };
//   }

//   return { status: 200, body: { ok: true, advanceId, advanceNo, total, journalOk: true } };
// };

// // ---------------------------------------------------------------- save a new payable invoice (optionally linking an advance)
// export const saveInvoice = async (body) => {
//   const supplierId = parseInt(body.supplier_id, 10);
//   const invoiceNo = (body.invoice_no || '').trim();
//   const invoiceDate = (body.invoice_date || '').trim();
//   const dueDate = (body.due_date || '').trim() || invoiceDate;
//   const note = (body.note || '').trim();
//   const lines = Array.isArray(body.lines) ? body.lines : [];
//   const linkAdvanceId = parseInt(body.link_advance_id, 10) || 0;
//   const applyAmount = Number(body.apply_amount || 0);

//   if (!supplierId || !invoiceDate) return { status: 400, body: { ok: false, error: 'supplier_id and invoice_date are required' } };
//   if (!invoiceNo) return { status: 400, body: { ok: false, error: 'Invoice number is required' } };
//   if (!note) return { status: 400, body: { ok: false, error: 'Description is required' } };

//   const dup = await runSelect(`SELECT 1 FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :sid AND UPPER(INVOICE_NO) = UPPER(:no)`, { sid: supplierId, no: invoiceNo });
//   if (dup.length) return { status: 400, body: { ok: false, error: `${invoiceNo} already exists for this vendor` } };

//   const validLines = [];
//   let gross = 0;
//   for (const l of lines) {
//     const amt = Number(l.amount || 0);
//     const acc = (l.account || '').trim();
//     if (!acc || amt <= 0) continue;
//     validLines.push({ account: acc, desc: (l.desc || '').trim() || note, amount: amt });
//     gross += amt;
//   }
//   if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

//   let advance = null;
//   if (linkAdvanceId) {
//     const advRows = await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id AND SUPPLIER_ID = :sid`, { id: linkAdvanceId, sid: supplierId });
//     advance = advRows[0] || null;
//     if (!advance) return { status: 400, body: { ok: false, error: 'Selected advance not found for this vendor' } };
//     if (!(await resolveAdvanceAccount())) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };
//     if (applyAmount <= 0) return { status: 400, body: { ok: false, error: 'Enter an amount to apply from the linked advance' } };
//     if (applyAmount > Math.min(Number(advance.BALANCE_AMOUNT), gross) + 0.001) {
//       return { status: 400, body: { ok: false, error: 'Apply amount exceeds the advance balance or the invoice total' } };
//     }
//   }

//   const invoiceId = await nextVal('XX_AP_INVOICE_H_S');
//   const head = await runWrite(
//     `INSERT INTO XX_AP_INVOICE_H_T (INVOICE_ID, INVOICE_NO, SUPPLIER_ID, INVOICE_DATE, DUE_DATE, GROSS_AMOUNT, REMARKS)
//      VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), TO_DATE(:p_due,'YYYY-MM-DD'), :gross, :p_note)`,
//     { id: invoiceId, no: invoiceNo, sid: supplierId, p_date: invoiceDate, p_due: dueDate, gross, p_note: note }
//   );
//   if (!head.ok) return { status: 400, body: { ok: false, error: head.error } };

//   let lineNo = 1;
//   const journalLines = [];
//   for (const line of validLines) {
//     const lineId = await nextVal('XX_AP_INVOICE_L_S');
//     await runWrite(
//       `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
//        VALUES (:id, :iid, :lno, :acc, :p_desc, 1, :price)`,
//       { id: lineId, iid: invoiceId, lno: lineNo, acc: line.account, p_desc: line.desc, price: line.amount }
//     );
//     journalLines.push({ account: line.account, debit: line.amount, desc: line.desc });
//     lineNo++;
//   }
//   journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: withNote(`Invoice ${invoiceNo}`, note) });
//   await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, withNote(`Payable invoice ${invoiceNo}`, note), journalLines);

//   if (advance && applyAmount > 0) {
//     const adjId = await nextVal('XX_AP_ADV_ADJ_S');
//     await runWrite(
//       `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT) VALUES (:id, :aid, :iid, :amt)`,
//       { id: adjId, aid: advance.ADVANCE_ID, iid: invoiceId, amt: applyAmount }
//     );
//     await runWrite(
//       `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
//          STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :aid`,
//       { amt: applyAmount, aid: advance.ADVANCE_ID }
//     );
//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = :amt,
//          STATUS = CASE WHEN GROSS_AMOUNT - :amt <= 0 THEN 'Paid' ELSE 'Partially Paid' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//       { amt: applyAmount, iid: invoiceId }
//     );
//     await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, withNote(`Advance ${advance.ADVANCE_NO} applied to ${invoiceNo}`, note), [
//       { account: AP_PAYABLE_ACCOUNT, debit: applyAmount, desc: 'Advance applied' },
//       { account: (await resolveAdvanceAccount()).code, credit: applyAmount, desc: `Advance ${advance.ADVANCE_NO}` },
//     ]);
//   }

//   return { status: 200, body: { ok: true, invoiceId, invoiceNo, total: gross, appliedFromAdvance: advance ? applyAmount : 0, advanceNo: advance ? advance.ADVANCE_NO : null } };
// };

// // ---------------------------------------------------------------- settle selected invoices
// export const settle = async (body) => {
//   const supplierId = parseInt(body.supplier_id, 10);
//   const date = (body.date || '').trim();
//   const method = body.method || '';
//   const bankAccount = (body.bank_account_code || '').trim();
//   const applications = Array.isArray(body.applications) ? body.applications : [];

//   if (!supplierId || !date) return { status: 400, body: { ok: false, error: 'supplier_id and date are required' } };

//   let totalPayNow = 0, totalFromAdvance = 0;
//   for (const a of applications) {
//     totalPayNow += Number(a.payNow || 0);
//     totalFromAdvance += Number(a.fromAdvance || 0);
//   }
//   if (totalPayNow > 0 && !bankAccount) return { status: 400, body: { ok: false, error: 'Select a Paid From account for the cash portion' } };
//   if (totalPayNow <= 0 && totalFromAdvance <= 0) return { status: 400, body: { ok: false, error: 'Nothing to settle' } };
//   const advAcct = totalFromAdvance > 0 ? await resolveAdvanceAccount() : null;
//   if (totalFromAdvance > 0 && !advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const openAdvances = await runSelect(
//     `SELECT ADVANCE_ID, BALANCE_AMOUNT FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :sid AND STATUS != 'Cancelled' AND BALANCE_AMOUNT > 0 ORDER BY ADVANCE_DATE, ADVANCE_ID`,
//     { sid: supplierId }
//   );
//   const availableAdvance = openAdvances.reduce((s, a) => s + Number(a.BALANCE_AMOUNT), 0);
//   if (totalFromAdvance > availableAdvance + 0.001) return { status: 400, body: { ok: false, error: 'Requested advance offset exceeds available advance balance' } };

//   let paymentId = null, paymentNo = null;
//   if (totalPayNow > 0) {
//     paymentId = await nextVal('XX_AP_PAYMENT_H_S');
//     paymentNo = 'PAY-' + String(paymentId).padStart(6, '0');
//     const r = await runWrite(
//       `INSERT INTO XX_AP_PAYMENT_H_T (PAYMENT_ID, PAYMENT_NO, SUPPLIER_ID, PAYMENT_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, TOTAL_AMOUNT)
//        VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :total)`,
//       { id: paymentId, no: paymentNo, sid: supplierId, p_date: date, bank: bankAccount, method, total: totalPayNow }
//     );
//     if (!r.ok) return { status: 400, body: { ok: false, error: r.error } };
//   }

//   const advanceRemaining = openAdvances.map((a) => ({ ...a }));
//   for (const a of applications) {
//     const invoiceId = parseInt(a.invoiceId, 10);
//     const payNow = Number(a.payNow || 0);
//     const fromAdvance = Number(a.fromAdvance || 0);
//     if (!invoiceId || (payNow <= 0 && fromAdvance <= 0)) continue;

//     if (payNow > 0 && paymentId) {
//       const lineId = await nextVal('XX_AP_PAYMENT_L_S');
//       await runWrite(`INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT) VALUES (:id, :pid, :iid, :amt)`, { id: lineId, pid: paymentId, iid: invoiceId, amt: payNow });
//       await runWrite(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: payNow, iid: invoiceId });
//     }

//     if (fromAdvance > 0) {
//       let left = fromAdvance;
//       for (const adv of advanceRemaining) {
//         if (left <= 0) break;
//         const take = Math.min(left, Number(adv.BALANCE_AMOUNT));
//         if (take <= 0) continue;
//         const adjId = await nextVal('XX_AP_ADV_ADJ_S');
//         await runWrite(
//           `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT, PAYMENT_ID) VALUES (:id, :advid, :iid, :amt, :pid)`,
//           { id: adjId, advid: adv.ADVANCE_ID, iid: invoiceId, amt: take, pid: paymentId }
//         );
//         await runWrite(
//           `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
//              STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//           { amt: take, advid: adv.ADVANCE_ID }
//         );
//         await runWrite(`UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: take, iid: invoiceId });
//         adv.BALANCE_AMOUNT = Number(adv.BALANCE_AMOUNT) - take;
//         left -= take;
//       }
//     }

//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
//          WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
//          WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
//          ELSE STATUS END WHERE INVOICE_ID = :iid`,
//       { iid: invoiceId }
//     );
//   }

//   const journalLines = [];
//   if (totalPayNow + totalFromAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, debit: totalPayNow + totalFromAdvance, desc: 'Invoices settled' });
//   if (totalPayNow > 0) journalLines.push({ account: bankAccount, credit: totalPayNow, desc: paymentNo || 'Payment' });
//   if (totalFromAdvance > 0) journalLines.push({ account: advAcct.code, credit: totalFromAdvance, desc: 'Advance applied' });
//   const settleNotes = await invoiceNotes(applications.map((a) => parseInt(a.invoiceId, 10)));
//   await postJournal('AP', 'PAYMENT', paymentId || 0, supplierId, date, withNote('Settlement' + (paymentNo ? ` ${paymentNo}` : ''), settleNotes.join('; ')), journalLines);

//   return { status: 200, body: { ok: true, paymentNo, totalPayNow, totalFromAdvance } };
// };

// // ---------------------------------------------------------------- cancel an invoice
// export const cancelInvoice = async (body) => {
//   const invoiceId = parseInt(body.invoice_id, 10);
//   if (!invoiceId) return { status: 400, body: { ok: false, error: 'invoice_id is required' } };

//   const invoice = (await runSelect(`SELECT * FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: invoiceId }))[0];
//   if (!invoice) return { status: 400, body: { ok: false, error: 'Invoice not found' } };
//   if (invoice.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Invoice is already cancelled' } };
//   if (Number(invoice.PAID_AMOUNT) > 0) return { status: 400, body: { ok: false, error: 'This invoice has cash payments recorded — cancel the related payment(s) first.' } };
//   if (await isPosted('AP', 'INVOICE', invoiceId)) return { status: 400, body: { ok: false, error: 'This invoice has already been posted to the general ledger and can no longer be cancelled.' } };

//   const adjustments = await runSelect(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id`, { id: invoiceId });
//   for (const adj of adjustments) {
//     if (adj.PAYMENT_ID !== null) return { status: 400, body: { ok: false, error: 'This invoice has an advance applied via a payment — cancel that payment first.' } };
//   }

//   for (const adj of adjustments) {
//     await runWrite(
//       `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
//          STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//       { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
//     );
//     await runWrite(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
//   }

//   const lines = await runSelect(`SELECT ACCOUNT_CODE AS "code", LINE_AMOUNT AS "amount", ITEM_DESCRIPTION AS "desc" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id: invoiceId });
//   const journalLines = [{ account: AP_PAYABLE_ACCOUNT, debit: Number(invoice.GROSS_AMOUNT) + Number(invoice.TAX_AMOUNT), desc: 'Invoice cancelled' }];
//   for (const l of lines) journalLines.push({ account: l.code, credit: l.amount, desc: l.desc });
//   await postJournal('AP', 'INVOICE', invoiceId, invoice.SUPPLIER_ID, today(), withNote(`Invoice ${invoice.INVOICE_NO} cancelled`, invoice.REMARKS), journalLines);

//   await runWrite(`UPDATE XX_AP_INVOICE_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { id: invoiceId });

//   return { status: 200, body: { ok: true, invoiceNo: invoice.INVOICE_NO } };
// };

// // ---------------------------------------------------------------- cancel a payment
// export const cancelPayment = async (body) => {
//   const paymentId = parseInt(body.payment_id, 10);
//   if (!paymentId) return { status: 400, body: { ok: false, error: 'payment_id is required' } };

//   const payment = (await runSelect(`SELECT * FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: paymentId }))[0];
//   if (!payment) return { status: 400, body: { ok: false, error: 'Payment not found' } };
//   if (payment.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Payment is already cancelled' } };
//   if (await isPosted('AP', 'PAYMENT', paymentId)) return { status: 400, body: { ok: false, error: 'This payment has already been posted to the general ledger and can no longer be cancelled.' } };

//   const payLines = await runSelect(`SELECT * FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id: paymentId });
//   const advAdjustments = await runSelect(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id: paymentId });
//   const advAcct = advAdjustments.length ? await resolveAdvanceAccount() : null;
//   if (advAdjustments.length && !advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   let totalCash = 0, totalAdvance = 0;

//   for (const pl of payLines) {
//     totalCash += Number(pl.APPLIED_AMOUNT);
//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT - :amt,
//          STATUS = CASE
//            WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - (PAID_AMOUNT - :amt) <= 0 THEN 'Paid'
//            WHEN ADVANCE_ADJUSTED + (PAID_AMOUNT - :amt) > 0 THEN 'Partially Paid'
//            ELSE 'Draft' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//       { amt: pl.APPLIED_AMOUNT, iid: pl.INVOICE_ID }
//     );
//   }

//   for (const adj of advAdjustments) {
//     totalAdvance += Number(adj.ADJUSTED_AMOUNT);
//     await runWrite(
//       `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
//          STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//       { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
//     );
//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED - :amt,
//          STATUS = CASE
//            WHEN GROSS_AMOUNT + TAX_AMOUNT - (ADVANCE_ADJUSTED - :amt) - PAID_AMOUNT <= 0 THEN 'Paid'
//            WHEN (ADVANCE_ADJUSTED - :amt) + PAID_AMOUNT > 0 THEN 'Partially Paid'
//            ELSE 'Draft' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//       { amt: adj.ADJUSTED_AMOUNT, iid: adj.INVOICE_ID }
//     );
//     await runWrite(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
//   }

//   const journalLines = [];
//   if (totalCash + totalAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: totalCash + totalAdvance, desc: 'Settlement reversed' });
//   if (totalCash > 0) journalLines.push({ account: payment.BANK_ACCOUNT_CODE, debit: totalCash, desc: `Payment ${payment.PAYMENT_NO} cancelled` });
//   if (totalAdvance > 0) journalLines.push({ account: advAcct.code, debit: totalAdvance, desc: 'Advance restored' });
//   const cancelNotes = await invoiceNotes([...payLines.map((x) => x.INVOICE_ID), ...advAdjustments.map((x) => x.INVOICE_ID)]);
//   if (journalLines.length) await postJournal('AP', 'PAYMENT', paymentId, payment.SUPPLIER_ID, today(), withNote(`Payment ${payment.PAYMENT_NO} cancelled`, cancelNotes.join('; ')), journalLines);

//   await runWrite(`UPDATE XX_AP_PAYMENT_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`, { id: paymentId });

//   return { status: 200, body: { ok: true, paymentNo: payment.PAYMENT_NO } };
// };

// // ---------------------------------------------------------------- refund an advance
// export const refundAdvance = async (body) => {
//   const advanceId = parseInt(body.advance_id, 10);
//   const date = (body.date || '').trim();
//   const bankAccount = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   const ref = (body.reference_no || '').trim();
//   const amount = Number(body.amount || 0);
//   const remarks = (body.remarks || '').trim();

//   if (!advanceId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'advance_id, date and bank_account_code are required' } };
//   if (amount <= 0) return { status: 400, body: { ok: false, error: 'Enter a refund amount greater than zero' } };

//   const advance = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }))[0];
//   if (!advance) return { status: 400, body: { ok: false, error: 'Advance not found' } };
//   if (advance.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'This advance is cancelled' } };
//   if (amount > Number(advance.BALANCE_AMOUNT) + 0.001) return { status: 400, body: { ok: false, error: 'Refund amount exceeds the available (unadjusted) advance balance' } };
//   const advAcct = await resolveAdvanceAccount();
//   if (!advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const refundId = await nextVal('XX_AP_ADV_REFUND_S');
//   const refundNo = 'REF-' + String(refundId).padStart(6, '0');

//   const ins = await runWrite(
//     `INSERT INTO XX_AP_ADVANCE_REFUND_T (REFUND_ID, REFUND_NO, ADVANCE_ID, REFUND_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, REFUND_AMOUNT, REMARKS)
//      VALUES (:id, :no, :advid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :amt, :p_remarks)`,
//     { id: refundId, no: refundNo, advid: advanceId, p_date: date, bank: bankAccount, method, ref, amt: amount, p_remarks: remarks }
//   );
//   if (!ins.ok) return { status: 400, body: { ok: false, error: ins.error } };

//   await runWrite(
//     `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT + :amt,
//        STATUS = CASE
//          WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT + :amt) > 0 THEN 'Partially Adjusted'
//          WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted'
//          ELSE 'Refunded' END,
//        LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//     { amt: amount, advid: advanceId }
//   );

//   const refNote = (await advanceNotes(advanceId)).join('; ');
//   const jrn = await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, date, withNote(`Advance ${advance.ADVANCE_NO} refunded`, refNote), [
//     { account: bankAccount, debit: amount, desc: withNote(`Refund ${refundNo}`, refNote) },
//     { account: advAcct.code, credit: amount, desc: withNote(`Advance ${advance.ADVANCE_NO} refunded`, refNote) },
//   ]);

//   return { status: 200, body: { ok: true, refundId, refundNo, amount, journalOk: jrn.ok } };
// };

// // ---------------------------------------------------------------- cancel an advance refund
// export const cancelRefund = async (body) => {
//   const refundId = parseInt(body.refund_id, 10);
//   if (!refundId) return { status: 400, body: { ok: false, error: 'refund_id is required' } };

//   const refund = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id`, { id: refundId }))[0];
//   if (!refund) return { status: 400, body: { ok: false, error: 'Refund not found' } };
//   if (refund.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Refund is already cancelled' } };
//   if (await isPosted('AP', 'REFUND', refundId)) return { status: 400, body: { ok: false, error: 'This refund has already been posted to the general ledger and can no longer be cancelled.' } };

//   const advance = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: refund.ADVANCE_ID }))[0];
//   if (!advance) return { status: 400, body: { ok: false, error: 'Related advance not found' } };
//   const advAcct = await resolveAdvanceAccount();
//   if (!advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   await runWrite(
//     `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT - :amt,
//        STATUS = CASE
//          WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT - :amt) <= 0 THEN
//            CASE WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted' ELSE 'Refunded' END
//          WHEN ADJUSTED_AMOUNT > 0 OR (REFUNDED_AMOUNT - :amt) > 0 THEN 'Partially Adjusted'
//          ELSE 'Open' END,
//        LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//     { amt: refund.REFUND_AMOUNT, advid: refund.ADVANCE_ID }
//   );

//   const cancelRefNote = (await advanceNotes(refund.ADVANCE_ID)).join('; ');
//   await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, today(), withNote(`Refund ${refund.REFUND_NO} cancelled`, cancelRefNote), [
//     { account: advAcct.code, debit: refund.REFUND_AMOUNT, desc: withNote('Advance refund reversed', cancelRefNote) },
//     { account: refund.BANK_ACCOUNT_CODE, credit: refund.REFUND_AMOUNT, desc: withNote(`Refund ${refund.REFUND_NO} cancelled`, cancelRefNote) },
//   ]);

//   await runWrite(`UPDATE XX_AP_ADVANCE_REFUND_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`, { id: refundId });

//   return { status: 200, body: { ok: true, refundNo: refund.REFUND_NO } };
// };

// // ---------------------------------------------------------------- read-only transaction details (view / print / excel)
// const VIEW_TYPES = ['INVOICE', 'ADVANCE', 'PAYMENT', 'REFUND'];

// export const getTransaction = async (params, query = {}) => {
//   const sourceType = String(params.sourceType || '').toUpperCase();
//   if (!VIEW_TYPES.includes(sourceType)) return { status: 400, body: { ok: false, error: 'sourceType must be INVOICE, ADVANCE, PAYMENT or REFUND' } };
//   const sourceId = parseInt(params.sourceId, 10);
//   if (Number.isNaN(sourceId) || sourceId < 0) return { status: 400, body: { ok: false, error: 'Invalid sourceId' } };
//   const journalId = parseInt(query.journalId, 10) || 0;

//   let title = '', status = '', date = '', supplierId = null, note = '', fields = null;
//   let summary = [];
//   const sections = [];

//   if (sourceType === 'INVOICE') {
//     const h = (await runSelect(
//       `SELECT INVOICE_NO AS "no", TO_CHAR(INVOICE_DATE,'YYYY-MM-DD') AS "date", TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due",
//               NVL(GROSS_AMOUNT,0) AS "gross", NVL(TAX_AMOUNT,0) AS "tax", NVL(PAID_AMOUNT,0) AS "paid",
//               NVL(ADVANCE_ADJUSTED,0) AS "adv", NVL(BALANCE_DUE,0) AS "balance", STATUS AS "status",
//               REMARKS AS "note", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: sourceId }))[0];
//     if (!h) return { status: 404, body: { ok: false, error: 'Invoice not found' } };
//     title = `Invoice ${h.no}`; status = h.status; date = h.date; supplierId = h.supplierId;
//     summary = [
//       { label: 'Invoice date', value: h.date }, { label: 'Due date', value: h.due },
//       { label: 'Gross amount', value: h.gross, money: true }, { label: 'Tax', value: h.tax, money: true },
//       { label: 'Paid (cash)', value: h.paid, money: true }, { label: 'Advance adjusted', value: h.adv, money: true },
//       { label: 'Balance due', value: h.balance, money: true }, { label: 'Description', value: h.note || '-' },
//     ];
//     const lines = await runSelect(
//       `SELECT l.LINE_NO AS "lineNo", l.ACCOUNT_CODE AS "account", c.ACCOUNT_NAME AS "accountName",
//               l.ITEM_DESCRIPTION AS "desc", l.QTY AS "qty", l.UNIT_PRICE AS "price"
//          FROM XX_AP_INVOICE_L_T l LEFT JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = l.ACCOUNT_CODE
//         WHERE l.INVOICE_ID = :id ORDER BY l.LINE_NO`, { id: sourceId });
//     sections.push({
//       title: 'Invoice lines',
//       columns: [{ key: 'lineNo', label: '#' }, { key: 'account', label: 'Account' }, { key: 'desc', label: 'Description' }, { key: 'amount', label: 'Amount', money: true }],
//       rows: lines.map((l) => ({ lineNo: l.lineNo, account: `${l.account}${l.accountName ? ' · ' + l.accountName : ''}`, desc: l.desc || '', amount: num(l.qty || 1) * num(l.price) })),
//     });
//     const adj = await runSelect(
//       `SELECT a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
//         WHERE aa.INVOICE_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
//     sections.push({ title: 'Advance adjustments', columns: [{ key: 'advNo', label: 'Advance' }, { key: 'amount', label: 'Applied', money: true }], rows: adj });
//     const pays = await runSelect(
//       `SELECT p.PAYMENT_NO AS "payNo", TO_CHAR(p.PAYMENT_DATE,'YYYY-MM-DD') AS "date", p.STATUS AS "status", pl.APPLIED_AMOUNT AS "amount"
//          FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_PAYMENT_H_T p ON p.PAYMENT_ID = pl.PAYMENT_ID
//         WHERE pl.INVOICE_ID = :id ORDER BY p.PAYMENT_ID`, { id: sourceId });
//     sections.push({
//       title: 'Cash payments',
//       columns: [{ key: 'payNo', label: 'Payment' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Applied', money: true }],
//       rows: pays.map((p) => ({ ...p, status: p.status || 'Active' })),
//     });
//   }

//   if (sourceType === 'ADVANCE') {
//     const h = (await runSelect(
//       `SELECT ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", REFERENCE_NO AS "ref", NVL(ADVANCE_AMOUNT,0) AS "total",
//               NVL(ADJUSTED_AMOUNT,0) AS "adjusted", NVL(REFUNDED_AMOUNT,0) AS "refunded",
//               NVL(BALANCE_AMOUNT,0) AS "balance", STATUS AS "status", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: sourceId }))[0];
//     if (!h) return { status: 404, body: { ok: false, error: 'Advance not found' } };
//     title = `Advance ${h.no}`; status = h.status; date = h.date; supplierId = h.supplierId;
//     const bankName = h.bank ? ((await runSelect(`SELECT ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_ID = :c`, { c: h.bank }))[0] || {}).name : '';
//     fields = [
//       { label: 'Paid from account', value: h.bank ? `${h.bank}${bankName ? ' · ' + bankName : ''}` : '-' },
//       { label: 'Payment date', value: h.date || '-' },
//       { label: 'Method', value: h.method || '-' },
//       { label: 'Reference', value: h.ref || '-' },
//     ];
//     summary = [
//       { label: 'Advance amount', value: h.total, money: true }, { label: 'Adjusted to invoices', value: h.adjusted, money: true },
//       { label: 'Refunded', value: h.refunded, money: true }, { label: 'Balance', value: h.balance, money: true },
//     ];
//     let lines = await runSelect(
//       `SELECT l.LINE_NO AS "lineNo", l.ACCOUNT_CODE AS "account", l.DESCRIPTION AS "desc", l.AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_L_T l WHERE l.ADVANCE_ID = :id ORDER BY l.LINE_NO`, { id: sourceId });
//     // Older advances may have no saved lines; show one line from the header total instead.
//     const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
//     if (!lines.length && num(h.total) > 0) lines = [{ lineNo: 1, account: advAcct.code, desc: '', amount: h.total }];
//     sections.push({
//       title: 'Advance lines',
//       columns: [{ key: 'account', label: 'Account' }, { key: 'desc', label: 'Description' }, { key: 'amount', label: 'Amount', money: true }],
//       rows: lines.map((l) => ({ account: `${advAcct.code} · ${advAcct.name}`, desc: l.desc || '', amount: num(l.amount) })),
//       footer: { label: 'Total advance', value: lines.reduce((t, l) => t + num(l.amount), 0) },
//     });
//     const applied = await runSelect(
//       `SELECT i.INVOICE_NO AS "invNo", aa.ADJUSTED_AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
//         WHERE aa.ADVANCE_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
//     sections.push({ title: 'Applied to invoices', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'amount', label: 'Applied', money: true }], rows: applied });
//     const refunds = await runSelect(
//       `SELECT REFUND_NO AS "refNo", TO_CHAR(REFUND_DATE,'YYYY-MM-DD') AS "date", STATUS AS "status", REFUND_AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_REFUND_T WHERE ADVANCE_ID = :id ORDER BY REFUND_ID`, { id: sourceId });
//     sections.push({
//       title: 'Refunds',
//       columns: [{ key: 'refNo', label: 'Refund' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount', money: true }],
//       rows: refunds.map((r) => ({ ...r, status: r.status || 'Active' })),
//     });
//   }

//   if (sourceType === 'PAYMENT') {
//     const h = sourceId > 0 ? (await runSelect(
//       `SELECT PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", NVL(TOTAL_AMOUNT,0) AS "total", STATUS AS "status", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: sourceId }))[0] : null;
//     if (h) {
//       title = `Payment ${h.no}`; status = h.status || 'Active'; date = h.date; supplierId = h.supplierId;
//       summary = [
//         { label: 'Date', value: h.date }, { label: 'Paid from', value: h.bank || '-' },
//         { label: 'Method', value: h.method || '-' }, { label: 'Cash amount', value: h.total, money: true },
//       ];
//       const pn = await runSelect(
//         `SELECT i.REMARKS AS "note" FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID WHERE pl.PAYMENT_ID = :id
//          UNION
//          SELECT i.REMARKS FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID WHERE aa.PAYMENT_ID = :id`,
//         { id: sourceId }
//       );
//       const pnText = pn.map((r) => r.note).filter(Boolean).join('; ');
//       if (pnText) summary.push({ label: 'Description', value: pnText });
//       const paid = await runSelect(
//         `SELECT i.INVOICE_NO AS "invNo", pl.APPLIED_AMOUNT AS "amount"
//            FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
//           WHERE pl.PAYMENT_ID = :id ORDER BY pl.PAYMENT_LINE_ID`, { id: sourceId });
//       sections.push({ title: 'Invoices paid (cash)', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'amount', label: 'Applied', money: true }], rows: paid });
//       const advPart = await runSelect(
//         `SELECT i.INVOICE_NO AS "invNo", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amount"
//            FROM XX_AP_ADVANCE_ADJUSTMENT_T aa
//            JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
//            JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
//           WHERE aa.PAYMENT_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
//       sections.push({ title: 'Advance portions', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'advNo', label: 'Advance' }, { key: 'amount', label: 'Applied', money: true }], rows: advPart });
//     } else {
//       // Advance-only settlement: settle() journals it with SOURCE_ID = 0 and creates no payment header.
//       if (!journalId) return { status: 400, body: { ok: false, error: 'journalId is required for an advance-only settlement' } };
//       title = 'Advance-only settlement';
//       note = 'Advance-only settlement (no cash payment). Only the journal entry is available for this record.';
//     }
//   }

//   if (sourceType === 'REFUND') {
//     const h = (await runSelect(
//       `SELECT r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date", r.BANK_ACCOUNT_CODE AS "bank",
//               r.PAYMENT_METHOD AS "method", r.REFERENCE_NO AS "ref", NVL(r.REFUND_AMOUNT,0) AS "amount",
//               r.REMARKS AS "remarks", r.STATUS AS "status", a.ADVANCE_NO AS "advNo", a.SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
//         WHERE r.REFUND_ID = :id`, { id: sourceId }))[0];
//     if (!h) return { status: 404, body: { ok: false, error: 'Refund not found' } };
//     title = `Refund ${h.no}`; status = h.status || 'Active'; date = h.date; supplierId = h.supplierId;
//     summary = [
//       { label: 'Date', value: h.date }, { label: 'Advance', value: h.advNo },
//       { label: 'Refunded to', value: h.bank || '-' }, { label: 'Method', value: h.method || '-' },
//       { label: 'Reference', value: h.ref || '-' }, { label: 'Refund amount', value: h.amount, money: true },
//       { label: 'Remarks', value: h.remarks || '-' },
//     ];
//   }

//   // ---- journals: every journal for this source, so cancellation reversals show up too ----
//   const jWhere = journalId ? `h.JOURNAL_ID = :jid AND h.SOURCE_TYPE = :st` : `h.SOURCE_TYPE = :st AND h.SOURCE_ID = :sid`;
//   const jBinds = journalId ? { jid: journalId, st: sourceType } : { st: sourceType, sid: sourceId };
//   const jRows = await runSelect(
//     `SELECT h.JOURNAL_ID AS "journalId", h.JOURNAL_NO AS "journalNo", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
//             h.DESCRIPTION AS "description", h.SUPPLIER_ID AS "supplierId", l.LINE_NO AS "lineNo",
//             l.ACCOUNT_CODE AS "account", c.ACCOUNT_NAME AS "accountName",
//             NVL(l.DEBIT_AMOUNT,0) AS "debit", NVL(l.CREDIT_AMOUNT,0) AS "credit"
//        FROM XX_AP_JOURNAL_H_T h
//        JOIN XX_AP_JOURNAL_L_T l ON l.JOURNAL_ID = h.JOURNAL_ID
//        LEFT JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = l.ACCOUNT_CODE
//       WHERE ${jWhere} ORDER BY h.JOURNAL_ID, l.LINE_NO`, jBinds);

//   const entries = [];
//   let totalDebit = 0, totalCredit = 0;
//   for (const r of jRows) {
//     let e = entries[entries.length - 1];
//     if (!e || e.journalId !== r.journalId) {
//       e = { journalId: r.journalId, journalNo: r.journalNo, date: r.date, description: r.description || '', kind: /^(Invoice|Payment|Refund) \S+ cancelled/i.test(r.description || '') ? 'Reversal' : 'Original', lines: [] };
//       entries.push(e);
//     }
//     e.lines.push({ account: r.account, accountName: r.accountName || '', debit: num(r.debit), credit: num(r.credit) });
//     totalDebit += num(r.debit);
//     totalCredit += num(r.credit);
//   }
//   // Older advances may have lost their debit line. Show the missing Advances-to-Suppliers
//   // debit so the entry balances, and flag it as derived.
//   if (sourceType === 'ADVANCE') {
//     const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
//     for (const e of entries) {
//       const dr = e.lines.reduce((t, l) => t + l.debit, 0), cr = e.lines.reduce((t, l) => t + l.credit, 0);
//       if (e.kind === 'Original' && cr - dr > 0.005) {
//         e.lines.unshift({ account: advAcct.code, accountName: advAcct.name, debit: Math.round((cr - dr) * 100) / 100, credit: 0, derived: true });
//         e.derived = true;
//         totalDebit += cr - dr;
//       }
//     }
//   }
//   if (!supplierId && jRows.length) supplierId = jRows[0].supplierId;
//   if (!date && jRows.length) date = jRows[0].date;
//   if (!title) title = 'Transaction';
//   if (!summary.length && entries.length) {
//     summary = [{ label: 'Date', value: entries[0].date }, { label: 'Description', value: entries[0].description }, { label: 'Amount', value: totalDebit, money: true }];
//   }

//   let supplierName = '';
//   if (supplierId) {
//     const s = await runSelect(`SELECT SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId });
//     supplierName = s[0] ? s[0].name : '';
//   }

//   let glPosted = false;
//   if (journalId) {
//     const p = await runSelect(
//       `SELECT COUNT(*) AS "cnt" FROM XX_AP_JOURNAL_H_T h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
//         WHERE h.JOURNAL_ID = :jid AND g.POSTED = 1`, { jid: journalId });
//     glPosted = num(p[0] && p[0].cnt) > 0;
//   } else {
//     glPosted = await isPosted('AP', sourceType, sourceId);
//   }

//   return {
//     status: 200,
//     body: {
//       ok: true, sourceType, sourceId, title, status, date, supplierName, note, glPosted,
//       cancelled: String(status).toLowerCase() === 'cancelled',
//       summary, fields, sections: sections.filter((s) => s.rows.length),
//       journal: { entries, totalDebit: Math.round(totalDebit * 100) / 100, totalCredit: Math.round(totalCredit * 100) / 100 },
//     },
//   };
// };

// // ================================================================ EDIT (parent editable only while it has no child)
// const TX = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
// const qc = async (conn, sql, binds = {}) => (await conn.execute(sql, binds, TX)).rows || [];
// const cnt = async (conn, sql, binds) => Number((await qc(conn, sql, binds))[0].c);

// // Returns { editable:false, reason } or { editable:true, head, journal, journals, adj }.
// //  - journals: every journal of the record (an invoice with an advance linked at creation has 2)
// //  - adj: advance adjustment made at invoice creation (PAYMENT_ID IS NULL) — allowed, the record is still editable
// async function checkEditable(conn, type, id, lock = false) {
//   const fu = lock ? ' FOR UPDATE' : '';
//   const no = (reason) => ({ editable: false, reason });
//   let head;
//   let adj = [];
//   if (type === 'ADVANCE') {
//     head = (await qc(conn, `SELECT ADVANCE_NO AS "no", STATUS AS "status", NVL(ADJUSTED_AMOUNT,0) AS "adj", SUPPLIER_ID AS "supplierId" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id${fu}`, { id }))[0];
//     if (!head) return no('Advance not found');
//     if (head.status === 'Cancelled') return no('Advance is cancelled');
//     if (Number(head.adj) > 0 || (await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADVANCE_ID = :id`, { id })) > 0) return no('This advance is applied to an invoice. Cancel that first.');
//     if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_REFUND_T WHERE ADVANCE_ID = :id AND NVL(STATUS,'Active') != 'Cancelled'`, { id })) > 0) return no('A refund exists for this advance. Cancel it first.');
//   } else if (type === 'INVOICE') {
//     head = (await qc(conn, `SELECT INVOICE_NO AS "no", STATUS AS "status", SUPPLIER_ID AS "supplierId", NVL(PAID_AMOUNT,0) AS "paid", NVL(ADVANCE_ADJUSTED,0) AS "adv" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id${fu}`, { id }))[0];
//     if (!head) return no('Invoice not found');
//     if (head.status === 'Cancelled') return no('Invoice is cancelled');
//     // advance applied THROUGH a payment = child record -> block
//     if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id AND PAYMENT_ID IS NOT NULL`, { id })) > 0) return no('An advance was applied through a payment. Cancel that payment first.');
//     if (Number(head.paid) > 0 || (await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_PAYMENT_H_T p ON p.PAYMENT_ID = pl.PAYMENT_ID WHERE pl.INVOICE_ID = :id AND NVL(p.STATUS,'Active') != 'Cancelled'`, { id })) > 0) return no('A payment exists for this invoice. Cancel the payment first.');
//     // advance linked at invoice-creation time (allowed)
//     adj = await qc(conn, `SELECT ADJUSTMENT_ID AS "id", ADVANCE_ID AS "advanceId", ADJUSTED_AMOUNT AS "applied" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id AND PAYMENT_ID IS NULL`, { id });
//     if (adj.length > 1) return no('This invoice has more than one advance linked and cannot be edited.');
//   } else if (type === 'PAYMENT') {
//     head = (await qc(conn, `SELECT PAYMENT_NO AS "no", STATUS AS "status", SUPPLIER_ID AS "supplierId" FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id${fu}`, { id }))[0];
//     if (!head) return no('Payment not found');
//     if (head.status === 'Cancelled') return no('Payment is cancelled');
//     // A payment that also applied an advance has advance-adjustment rows and a journal
//     // with a third (advance) line. Re-pointing those is a separate operation, so such
//     // payments stay non-editable here — cancel the payment instead.
//     if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id })) > 0) return no('This payment applied an advance and cannot be edited. Cancel it instead.');
//   } else if (type === 'REFUND') {
//     head = (await qc(conn, `SELECT r.REFUND_NO AS "no", r.STATUS AS "status", a.SUPPLIER_ID AS "supplierId" FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID WHERE r.REFUND_ID = :id`, { id }))[0];
//     if (!head) return no('Refund not found');
//     if (head.status === 'Cancelled') return no('Refund is cancelled');
//     if (lock) await qc(conn, `SELECT 1 FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id FOR UPDATE`, { id });
//   } else if (type === 'SETTLEMENT') {
//     // Advance-only settlement: no payment header exists, only one journal (SOURCE_TYPE PAYMENT, SOURCE_ID 0).
//     // `id` here is the JOURNAL_ID. Only the date can be edited (nothing links it to its adjustment rows).
//     const j = (await qc(conn, `SELECT JOURNAL_ID AS "journalId", JOURNAL_NO AS "journalNo", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id AND SOURCE_TYPE = 'PAYMENT' AND SOURCE_ID = 0${fu}`, { id }))[0];
//     if (!j) return no('Settlement not found');
//     const g = await qc(conn, `SELECT POSTED AS "posted" FROM GLMASTER WHERE VOUCHERNO = :n${fu}`, { n: j.journalNo });
//     if (g.some((x) => Number(x.posted) === 1)) return no('Already posted to the general ledger.');
//     return { editable: true, head: { no: j.journalNo, supplierId: j.supplierId }, journal: j, journals: [j], adj: [] };
//   } else return no('This record type cannot be edited');

//   const js = await qc(conn, `SELECT JOURNAL_ID AS "journalId", JOURNAL_NO AS "journalNo" FROM XX_AP_JOURNAL_H_T WHERE SOURCE_TYPE = :t AND SOURCE_ID = :id ORDER BY JOURNAL_ID`, { t: type, id });
//   const expected = type === 'INVOICE' && adj.length ? 2 : 1;
//   if (js.length !== expected) return no('Journal not found, or an unexpected number of journals exists for this record.');
//   for (const j of js) {
//     const g = await qc(conn, `SELECT POSTED AS "posted" FROM GLMASTER WHERE VOUCHERNO = :n${fu}`, { n: j.journalNo });
//     if (g.some((x) => Number(x.posted) === 1)) return no('Already posted to the general ledger.');
//   }
//   return { editable: true, head, journal: js[0], journals: js, adj };
// }

// // raw data to prefill the edit forms (also re-checks editable)
// export const getEditData = async (params) => {
//   const type = String(params.type || '').toUpperCase();
//   const id = parseInt(params.id, 10);
//   if (!id || !['ADVANCE', 'INVOICE', 'PAYMENT', 'REFUND', 'SETTLEMENT'].includes(type)) return { status: 400, body: { ok: false, error: 'Invalid record' } };
//   const conn = await getConnection();
//   try {
//     const st = await checkEditable(conn, type, id);
//     if (!st.editable) return { status: 400, body: { ok: false, error: st.reason } };
//     if (type === 'ADVANCE') {
//       const h = (await qc(conn, `SELECT ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", REFERENCE_NO AS "ref", NVL(ADVANCE_AMOUNT,0) AS "total"
//          FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id }))[0];
//       let lines = await qc(conn, `SELECT ACCOUNT_CODE AS "a", DESCRIPTION AS "d", AMOUNT AS "n" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id ORDER BY LINE_NO`, { id });
//       // older advances may have no saved lines: show one line from the header total
//       if (!lines.length && Number(h.total) > 0) {
//         const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT };
//         lines = [{ a: advAcct.code, d: '', n: h.total }];
//       }
//       return { status: 200, body: { ok: true, type, id, ...h, lines } };
//     }
//     if (type === 'INVOICE') {
//       const h = (await qc(conn, `SELECT INVOICE_NO AS "no", TO_CHAR(INVOICE_DATE,'YYYY-MM-DD') AS "date", TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id }))[0];
//       const lines = await qc(conn, `SELECT ACCOUNT_CODE AS "a", ITEM_DESCRIPTION AS "d", NVL(QTY,1) * NVL(UNIT_PRICE,0) AS "n" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id ORDER BY LINE_NO`, { id });
//       // advance linked when the invoice was created (shown read-only in the edit form)
//       let advNo = null, advanceApplied = 0;
//       if (st.adj.length) {
//         advanceApplied = Number(st.adj[0].applied);
//         advNo = (await qc(conn, `SELECT ADVANCE_NO AS "no" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: st.adj[0].advanceId }))[0].no;
//       }
//       return { status: 200, body: { ok: true, type, id, ...h, lines, advNo, advanceApplied } };
//     }
//     if (type === 'SETTLEMENT') {
//       const h = (await qc(conn, `SELECT JOURNAL_NO AS "no", TO_CHAR(JOURNAL_DATE,'YYYY-MM-DD') AS "date", DESCRIPTION AS "description", NVL(TOTAL_AMOUNT,0) AS "amount" FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id`, { id }))[0];
//       return { status: 200, body: { ok: true, type, id, ...h } };
//     }
//     if (type === 'PAYMENT') {
//       const h = (await qc(conn, `SELECT PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", NVL(TOTAL_AMOUNT,0) AS "total" FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id }))[0];
//       // available = invoice total - advance adjusted - (paid - this payment's line),
//       // i.e. what this payment line could be raised to without overpaying the invoice.
//       const lines = await qc(conn, `SELECT pl.INVOICE_ID AS "invoiceId", pl.APPLIED_AMOUNT AS "amt", i.INVOICE_NO AS "invoiceNo",
//               NVL(i.PAID_AMOUNT,0) AS "paid", NVL(i.ADVANCE_ADJUSTED,0) AS "adv",
//               NVL(i.GROSS_AMOUNT,0) + NVL(i.TAX_AMOUNT,0) AS "invTotal"
//          FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
//         WHERE pl.PAYMENT_ID = :id ORDER BY pl.PAYMENT_LINE_ID`, { id });
//       return { status: 200, body: { ok: true, type, id, ...h, lines } };
//     }
//     const h = (await qc(conn, `SELECT r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date", r.BANK_ACCOUNT_CODE AS "bank", r.PAYMENT_METHOD AS "method", r.REFERENCE_NO AS "ref", r.REMARKS AS "remarks", r.REFUND_AMOUNT AS "amount", r.ADVANCE_ID AS "advanceId" FROM XX_AP_ADVANCE_REFUND_T r WHERE r.REFUND_ID = :id`, { id }))[0];
//     return { status: 200, body: { ok: true, type, id, ...h } };
//   } finally {
//     await conn.close();
//   }
// };

// // run `work` in ONE transaction: lock + guard, do the writes, single commit, rollback on any error
// async function editTx(type, id, work) {
//   const conn = await getConnection();
//   try {
//     const st = await checkEditable(conn, type, id, true);
//     if (!st.editable) { await conn.rollback(); return { status: 400, body: { ok: false, error: st.reason } }; }
//     await work(conn, st);
//     await conn.commit();
//     return { status: 200, body: { ok: true } };
//   } catch (e) {
//     try { await conn.rollback(); } catch (_) { /* ignore */ }
//     return { status: 400, body: { ok: false, error: e.message } };
//   } finally {
//     await conn.close();
//   }
// }

// export const updateAdvance = async (body) => {
//   const id = parseInt(body.advance_id, 10);
//   const date = (body.date || '').trim();
//   const bank = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   const ref = (body.reference_no || '').trim();
//   if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'advance_id, date and bank_account_code are required' } };

//   // Same FK rule as creation: the line account must exist in CHART_OF_ACCOUNT.
//   const advanceAccount = await resolveAdvanceAccount();
//   if (!advanceAccount) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const lines = [];
//   let total = 0;
//   for (const l of Array.isArray(body.lines) ? body.lines : []) {
//     const amt = roundCents(l.amount), d = (l.desc || '').trim();
//     if (amt <= 0) continue;
//     if (!d) return { status: 400, body: { ok: false, error: 'Description is required on every advance line' } };
//     lines.push({ account: advanceAccount.code, desc: d, amount: amt }); total += amt;
//   }
//   total = roundCents(total);
//   if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an amount greater than zero' } };

//   return editTx('ADVANCE', id, async (conn, st) => {
//     const no = st.head.no;
//     await conn.execute(
//       `UPDATE XX_AP_ADVANCE_T SET ADVANCE_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank, PAYMENT_METHOD = :method,
//               REFERENCE_NO = :ref, ADVANCE_AMOUNT = :total, LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :id`,
//       { p_date: date, bank, method, ref, total, id }, TX);
//     await conn.execute(`DELETE FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id }, TX);
//     let n = 0;
//     for (const l of lines) {
//       await conn.execute(
//         `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT)
//          VALUES (XX_AP_ADVANCE_L_S.NEXTVAL, :id, :lno, :acc, :p_desc, :amt)`,
//         { id, lno: ++n, acc: l.account, p_desc: l.desc, amt: l.amount }, TX);
//     }
//     const note = [...new Set(lines.map((x) => x.desc))].join('; ');
//     const jl = lines.map((l) => ({ account: advanceAccount.code, debit: l.amount, desc: l.desc }));
//     jl.push({ account: bank, credit: total, desc: withNote(`Advance ${no} paid`, note) });
//     await rewriteJournalTx(conn, { journalId: st.journal.journalId, journalNo: st.journal.journalNo, date, description: withNote(`Advance payment ${no}`, note) + (ref ? ` (${ref})` : ''), lines: jl });
//   });
// };

// export const updateInvoice = async (body) => {
//   const id = parseInt(body.invoice_id, 10);
//   const date = (body.invoice_date || '').trim();
//   const due = (body.due_date || '').trim() || date;
//   const note = (body.note || '').trim();
//   if (!id || !date) return { status: 400, body: { ok: false, error: 'invoice_id and invoice_date are required' } };
//   if (!note) return { status: 400, body: { ok: false, error: 'Description is required' } };
//   const lines = [];
//   let gross = 0;
//   for (const l of Array.isArray(body.lines) ? body.lines : []) {
//     const amt = Number(l.amount || 0), acc = (l.account || '').trim();
//     if (!acc || amt <= 0) continue;
//     lines.push({ account: acc, desc: (l.desc || '').trim() || note, amount: amt }); gross += amt;
//   }
//   if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

//   return editTx('INVOICE', id, async (conn, st) => {
//     const no = st.head.no;
//     // advance linked when the invoice was created: its applied amount stays the same
//     const applied = st.adj.length ? Number(st.adj[0].applied) : 0;
//     const advAcct = st.adj.length ? await resolveAdvanceAccount() : null;
//     if (st.adj.length && !advAcct) throw new Error(ADVANCE_ACCOUNT_MISSING);
//     await assertAccountsExist([AP_PAYABLE_ACCOUNT, ...lines.map((l) => l.account), advAcct && advAcct.code]);
//     if (gross + 0.001 < applied) throw new Error(`Invoice total cannot be less than the advance already applied (${applied.toFixed(2)}).`);

//     await conn.execute(
//       `UPDATE XX_AP_INVOICE_H_T SET INVOICE_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), DUE_DATE = TO_DATE(:p_due,'YYYY-MM-DD'),
//               GROSS_AMOUNT = :gross, REMARKS = :p_note,
//               STATUS = CASE
//                 WHEN :gross + NVL(TAX_AMOUNT,0) - NVL(ADVANCE_ADJUSTED,0) - NVL(PAID_AMOUNT,0) <= 0 THEN 'Paid'
//                 WHEN NVL(ADVANCE_ADJUSTED,0) + NVL(PAID_AMOUNT,0) > 0 THEN 'Partially Paid'
//                 ELSE 'Draft' END,
//               LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`,
//       { p_date: date, p_due: due, gross, p_note: note, id }, TX);
//     await conn.execute(`DELETE FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id }, TX);
//     let n = 0;
//     for (const l of lines) {
//       await conn.execute(
//         `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
//          VALUES (XX_AP_INVOICE_L_S.NEXTVAL, :id, :lno, :acc, :p_desc, 1, :price)`,
//         { id, lno: ++n, acc: l.account, p_desc: l.desc, price: l.amount }, TX);
//     }

//     // 1st journal: the invoice itself
//     const jl = lines.map((l) => ({ account: l.account, debit: l.amount, desc: l.desc }));
//     jl.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: withNote(`Invoice ${no}`, note) });
//     await rewriteJournalTx(conn, { journalId: st.journals[0].journalId, journalNo: st.journals[0].journalNo, date, description: withNote(`Payable invoice ${no}`, note), lines: jl });

//     // 2nd journal: "Advance ... applied to ..." (only when an advance was linked)
//     if (st.adj.length) {
//       const advNo = (await qc(conn, `SELECT ADVANCE_NO AS "no" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: st.adj[0].advanceId }))[0].no;
//       await rewriteJournalTx(conn, {
//         journalId: st.journals[1].journalId, journalNo: st.journals[1].journalNo, date,
//         description: withNote(`Advance ${advNo} applied to ${no}`, note),
//         lines: [
//           { account: AP_PAYABLE_ACCOUNT, debit: applied, desc: 'Advance applied' },
//           { account: advAcct.code, credit: applied, desc: `Advance ${advNo}` },
//         ],
//       });
//     }
//   });
// };

// // ---------------------------------------------------------------- update a payment
// // Same header, same invoice lines, same journal and GLMASTER row — only their values
// // change. Invoices this payment settles are corrected by the difference between the
// // old and new allocation, exactly like settle() does when the payment is created.
// export const updatePayment = async (body) => {
//   const id = parseInt(body.payment_id, 10);
//   const date = (body.date || '').trim();
//   const bank = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'payment_id, date and bank_account_code are required' } };

//   const lines = [];
//   const seen = new Set();
//   let total = 0;
//   for (const l of Array.isArray(body.lines) ? body.lines : []) {
//     const invoiceId = parseInt(l.invoice_id, 10);
//     const amt = Number(l.amount || 0);
//     if (!invoiceId || !(amt > 0)) continue;
//     if (seen.has(invoiceId)) return { status: 400, body: { ok: false, error: 'Each invoice can only appear once in a payment.' } };
//     seen.add(invoiceId);
//     lines.push({ invoiceId, amount: Math.round(amt * 100) / 100 });
//     total += amt;
//   }
//   total = Math.round(total * 100) / 100;
//   if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one invoice line with an amount greater than zero' } };

//   return editTx('PAYMENT', id, async (conn, st) => {
//     const no = st.head.no;
//     const supplierId = Number(st.head.supplierId);

//     const oldLines = await qc(conn, `SELECT INVOICE_ID AS "invoiceId", APPLIED_AMOUNT AS "amt" FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id });
//     const delta = {};
//     for (const ol of oldLines) delta[Number(ol.invoiceId)] = (delta[Number(ol.invoiceId)] || 0) - Number(ol.amt);
//     for (const l of lines) delta[l.invoiceId] = (delta[l.invoiceId] || 0) + l.amount;

//     for (const [key, change] of Object.entries(delta)) {
//       if (Math.abs(change) < 0.001) continue;
//       const invoiceId = parseInt(key, 10);
//       const inv = (await qc(conn, `SELECT INVOICE_NO AS "no", SUPPLIER_ID AS "supplierId", STATUS AS "status",
//               NVL(PAID_AMOUNT,0) AS "paid", NVL(ADVANCE_ADJUSTED,0) AS "adv",
//               NVL(GROSS_AMOUNT,0) + NVL(TAX_AMOUNT,0) AS "invTotal"
//          FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id FOR UPDATE`, { id: invoiceId }))[0];
//       if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
//       if (inv.status === 'Cancelled') throw new Error(`Invoice ${inv.no} is cancelled`);
//       if (Number(inv.supplierId) !== supplierId) throw new Error(`Invoice ${inv.no} does not belong to this vendor.`);
//       const newPaid = Math.round((Number(inv.paid) + change) * 100) / 100;
//       if (newPaid < -0.001) throw new Error(`Invoice ${inv.no} has less paid than this payment already allocated.`);
//       if (newPaid + Number(inv.adv) > Number(inv.invTotal) + 0.001) throw new Error(`Payment exceeds the balance of invoice ${inv.no}.`);
//       await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = :paid, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { paid: newPaid, id: invoiceId }, TX);
//       await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
//            WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
//            WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
//            ELSE 'Open' END WHERE INVOICE_ID = :id`, { id: invoiceId }, TX);
//     }

//     await conn.execute(
//       `UPDATE XX_AP_PAYMENT_H_T SET PAYMENT_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank,
//               PAYMENT_METHOD = :method, TOTAL_AMOUNT = :total, LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`,
//       { p_date: date, bank, method, total, id }, TX);

//     await conn.execute(`DELETE FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id }, TX);
//     for (const l of lines) {
//       await conn.execute(
//         `INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT)
//          VALUES (XX_AP_PAYMENT_L_S.NEXTVAL, :pid, :iid, :amt)`,
//         { pid: id, iid: l.invoiceId, amt: l.amount }, TX);
//     }

//     const notes = [];
//     for (const l of lines) {
//       const r = (await qc(conn, `SELECT REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: l.invoiceId }))[0];
//       if (r && r.note) notes.push(r.note);
//     }
//     await rewriteJournalTx(conn, {
//       journalId: st.journal.journalId, journalNo: st.journal.journalNo, date,
//       description: withNote(`Settlement ${no}`, [...new Set(notes)].join('; ')),
//       lines: [
//         { account: AP_PAYABLE_ACCOUNT, debit: total, desc: 'Invoices settled' },
//         { account: bank, credit: total, desc: `Payment ${no}` },
//       ],
//     });
//   });
// };

// export const updateRefund = async (body) => {
//   const id = parseInt(body.refund_id, 10);
//   const date = (body.date || '').trim();
//   const bank = (body.bank_account_code || '').trim();
//   if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'refund_id, date and bank_account_code are required' } };
//   const method = body.method || '', ref = (body.reference_no || '').trim(), remarks = (body.remarks || '').trim();

//   return editTx('REFUND', id, async (conn, st) => {
//     const r = (await qc(conn, `SELECT r.REFUND_AMOUNT AS "amount", a.ADVANCE_NO AS "advNo", a.ADVANCE_ID AS "advId" FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID WHERE r.REFUND_ID = :id`, { id }))[0];
//     await conn.execute(
//       `UPDATE XX_AP_ADVANCE_REFUND_T SET REFUND_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank, PAYMENT_METHOD = :method,
//               REFERENCE_NO = :ref, REMARKS = :p_remarks, LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`,
//       { p_date: date, bank, method, ref, p_remarks: remarks, id }, TX);
//     const advAcct = await resolveAdvanceAccount();
//     if (!advAcct) throw new Error(ADVANCE_ACCOUNT_MISSING);
//     await assertAccountsExist([bank, advAcct.code]);
//     const nt = (await qc(conn, `SELECT DISTINCT DESCRIPTION AS "note" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id: r.advId })).map((x) => x.note).filter(Boolean).join('; ');
//     await rewriteJournalTx(conn, {
//       journalId: st.journal.journalId, journalNo: st.journal.journalNo, date,
//       description: withNote(`Advance ${r.advNo} refunded`, nt) + (ref ? ` (${ref})` : ''),
//       lines: [
//         { account: bank, debit: Number(r.amount), desc: withNote(`Refund ${st.head.no}`, nt) },
//         { account: advAcct.code, credit: Number(r.amount), desc: withNote(`Advance ${r.advNo} refunded`, nt) },
//       ],
//     });
//   });
// };

// // ---------------------------------------------------------------- update an advance-only settlement (date only)
// export const updateSettlement = async (body) => {
//   const id = parseInt(body.journal_id, 10);
//   const date = (body.date || '').trim();
//   if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: 400, body: { ok: false, error: 'journal_id and a valid date are required' } };

//   return editTx('SETTLEMENT', id, async (conn, st) => {
//     const h = (await qc(conn, `SELECT DESCRIPTION AS "description" FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id`, { id }))[0];
//     const lines = await qc(conn, `SELECT ACCOUNT_CODE AS "account", DEBIT_AMOUNT AS "debit", CREDIT_AMOUNT AS "credit", DESCRIPTION AS "desc"
//          FROM XX_AP_JOURNAL_L_T WHERE JOURNAL_ID = :id ORDER BY LINE_NO`, { id });
//     if (!lines.length) throw new Error('Journal lines not found for this settlement.');
//     await assertAccountsExist(lines.map((l) => l.account));
//     await rewriteJournalTx(conn, {
//       journalId: id, journalNo: st.journal.journalNo, date, description: h.description,
//       lines: lines.map((l) => ({ account: l.account, debit: Number(l.debit || 0), credit: Number(l.credit || 0), desc: l.desc })),
//     });
//   });
// };


// // Accounts Payable routes — a direct port of D:\xampp\htdocs\hms\payable\api.php.
// import { getConnection, withConnection, oracledb } from '../../config/db.js';
// import { postJournal, isPosted, rewriteJournalTx } from '../gl/service.js';

// // Real CHART_OF_ACCOUNT leaf accounts added specifically for this module.
// const AP_PAYABLE_ACCOUNT = '3020020000'; // Accounts Payable - Trade (liability)
// const AP_ADVANCE_ACCOUNT = '1020120000'; // Advances to Suppliers (asset) — clearing account
// // The AR side's equivalent control accounts — excluded from AP's own account pickers.
// const AR_RECEIVABLE_ACCOUNT = '1020120000';
// const AR_ADVANCE_ACCOUNT = '3020030000';

// // XX_AP_ADVANCE_L_T.ACCOUNT_CODE has a foreign key to CHART_OF_ACCOUNT.ACCOUNT_ID
// // (XX_AP_ADV_L_ACC_FK2), and so do the AP journal lines. Never assume a hard-coded
// // control account exists in the live chart: resolve the Advances-to-Suppliers
// // account against CHART_OF_ACCOUNT first, so a missing code cannot surface as a
// // raw ORA-02291 and a selected account is always saved as a real ACCOUNT_ID.
// const ADVANCE_ACCOUNT_MISSING =
//   'No "advances to suppliers" account was found in CHART_OF_ACCOUNT. Set AP_ADVANCE_ACCOUNT_CODE to an existing account code.';
// const roundCents = (v) => Math.round((Number(v) || 0) * 100) / 100;
// let advanceAccountPromise;
// async function resolveAdvanceAccount() {
//   if (advanceAccountPromise === undefined) {
//     advanceAccountPromise = (async () => {
//       const wanted = [...new Set([String(process.env.AP_ADVANCE_ACCOUNT_CODE || '').trim(), AP_ADVANCE_ACCOUNT].filter(Boolean))];
//       for (const code of wanted) {
//         const rows = await runSelect(
//           `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//             WHERE ACCOUNT_ID = :code AND NVL(ENABLED,1) = 1`,
//           { code }
//         );
//         if (rows.length) return { code: String(rows[0].code), name: rows[0].name };
//       }
//       // The configured/legacy code is not in this chart — use the chart's own
//       // advance account if there is exactly one, never a guessed/hard-coded code.
//       const rows = await runSelect(
//         `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//           WHERE LASTLEVEL = 1 AND NVL(ENABLED,1) = 1 AND NVL(ACCOUNT_TYPE,0) != 1
//             AND UPPER(ACCOUNT_NAME) LIKE '%ADVANCE%' ORDER BY ACCOUNT_ID`
//       );
//       return rows.length === 1 ? { code: String(rows[0].code), name: rows[0].name } : null;
//     })().catch(() => null);
//   }
//   const found = await advanceAccountPromise;
//   if (!found) advanceAccountPromise = undefined; // allow a later retry (e.g. account just created)
//   return found;
// }

// // Readable error (instead of a raw ORA-02291) when a journal account code is not in CHART_OF_ACCOUNT.
// async function assertAccountsExist(codes) {
//   const list = [...new Set(codes.map((c) => String(c || '').trim()).filter(Boolean))];
//   if (!list.length) return;
//   const binds = {};
//   list.forEach((c, i) => { binds['c' + i] = c; });
//   const rows = await runSelect(`SELECT ACCOUNT_ID AS "code" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_ID IN (${list.map((_, i) => ':c' + i).join(',')})`, binds);
//   const have = new Set(rows.map((r) => String(r.code)));
//   const missing = list.filter((c) => !have.has(c));
//   if (missing.length) throw new Error(`Account ${missing.join(', ')} was not found in CHART_OF_ACCOUNT.`);
// }

// // The invoice's Description (stored in REMARKS) is carried into every journal
// // description / line so it shows up everywhere (recent activity, GL voucher, reports).
// // Capped so it can never overflow a narrow DESCRIPTION column.
// const withNote = (base, note) => {
//   const n = String(note || '').trim();
//   const t = n ? `${base} - ${n}` : base;
//   return t.length > 150 ? t.slice(0, 147) + '...' : t;
// };

// const num = (v) => Number(v || 0);
// const today = () => new Date().toISOString().slice(0, 10);

// // ---------------------------------------------------------------- small DB helpers
// // Each helper opens its own pooled connection and always closes it.
// async function runSelect(sql, binds = {}) {
//   const conn = await getConnection();
//   try {
//     const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return r.rows || [];
//   } finally {
//     await conn.close();
//   }
// }

// async function nextVal(seq) {
//   const rows = await runSelect(`SELECT ${seq}.NEXTVAL AS "id" FROM DUAL`);
//   return rows[0].id;
// }

// // Single write + commit. Returns { ok, error } and never throws (same best-effort
// // behaviour the original per-statement blocks had).
// async function runWrite(sql, binds = {}) {
//   const conn = await getConnection();
//   try {
//     await conn.execute(sql, binds);
//     await conn.commit();
//     return { ok: true };
//   } catch (e) {
//     try { await conn.rollback(); } catch (_) { /* ignore */ }
//     return { ok: false, error: e.message };
//   } finally {
//     await conn.close();
//   }
// }

// // Descriptions (REMARKS) of the given invoices, de-duplicated.
// async function invoiceNotes(ids) {
//   const list = [...new Set((ids || []).map((x) => parseInt(x, 10)).filter(Boolean))];
//   if (!list.length) return [];
//   const binds = {};
//   list.forEach((id, i) => { binds['i' + i] = id; });
//   const rows = await runSelect(`SELECT DISTINCT REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID IN (${list.map((_, i) => ':i' + i).join(',')})`, binds);
//   return rows.map((r) => r.note).filter(Boolean);
// }

// // Distinct line descriptions of an advance (what the user typed as "Description").
// async function advanceNotes(advanceId) {
//   const id = parseInt(advanceId, 10);
//   if (!id) return [];
//   const rows = await runSelect(`SELECT DISTINCT DESCRIPTION AS "note" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id });
//   return rows.map((r) => r.note).filter(Boolean);
// }

// // ---------------------------------------------------------------- vendors
// export const listVendors = async () => {
//   const rows = await runSelect(`SELECT SUPPLIER_ID AS "id", SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE STATUS=1 ORDER BY SUPPLIER_NAME`);
//   return { status: 200, body: rows };
// };

// // ---------------------------------------------------------------- chart of accounts
// export const getCoa = async () => {
//   const advanceAccount = await resolveAdvanceAccount();
//   const expense = await runSelect(
//     `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//       WHERE LASTLEVEL = 1 AND ENABLED = 1 AND NVL(ACCOUNT_TYPE,0) != 1
//         AND ACCOUNT_ID NOT IN (:pay, :apAdv, :arRec, :arAdv) ORDER BY ACCOUNT_NAME`,
//     {
//       pay: AP_PAYABLE_ACCOUNT,
//       apAdv: advanceAccount ? advanceAccount.code : AP_ADVANCE_ACCOUNT,
//       arRec: AR_RECEIVABLE_ACCOUNT,
//       arAdv: AR_ADVANCE_ACCOUNT,
//     }
//   );
//   const bank = await runSelect(`SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_TYPE = 1 AND ENABLED = 1 ORDER BY ACCOUNT_NAME`);
//   // A payable invoice records a real expense — only Expense accounts (code starting '5').
//   const invoiceExpense = await runSelect(
//     `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//       WHERE LASTLEVEL = 1 AND ENABLED = 1 AND ACCOUNT_ID LIKE '5%' ORDER BY ACCOUNT_NAME`
//   );
//   // The resolved advance control account, so the UI labels the account that is
//   // actually posted instead of assuming the hard-coded code exists.
//   return { status: 200, body: { expense, invoiceExpense, bank, advanceAccount } };
// };

// // ---------------------------------------------------------------- one vendor's full picture
// export const getVendor = async (params) => {
//   const supplierId = parseInt(params.id, 10);
//   if (!supplierId) return { status: 400, body: { ok: false, error: 'id is required' } };

//   const sup = await runSelect(`SELECT SUPPLIER_NAME FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId });
//   if (!sup.length) return { status: 400, body: { ok: false, error: 'Vendor not found' } };

//   const invoiceRows = await runSelect(
//     `SELECT INVOICE_ID AS "id", INVOICE_NO AS "no", SUPPLIER_INVOICE_NO AS "supNo",
//             TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", TOTAL_AMOUNT AS "total", BALANCE_DUE AS "balance",
//             ADVANCE_ADJUSTED AS "advanceAdjusted", PAID_AMOUNT AS "paid", STATUS AS "status", REMARKS AS "note"
//        FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY DUE_DATE`,
//     { id: supplierId }
//   );

//   const linkRows = await runSelect(
//     `SELECT aa.INVOICE_ID AS "invoiceId", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amt"
//        FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
//       WHERE a.SUPPLIER_ID = :id`,
//     { id: supplierId }
//   );
//   const linksByInvoice = {};
//   for (const l of linkRows) (linksByInvoice[l.invoiceId] ||= []).push({ advNo: l.advNo, amt: Number(l.amt) });
//   for (const inv of invoiceRows) inv.links = linksByInvoice[inv.id] || [];

//   const advanceRows = await runSelect(
//     `SELECT ADVANCE_ID AS "id", ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date",
//             ADVANCE_AMOUNT AS "total", ADJUSTED_AMOUNT AS "used", BALANCE_AMOUNT AS "balance", STATUS AS "status"
//        FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY ADVANCE_DATE DESC`,
//     { id: supplierId }
//   );

//   const ledgerRows = await runSelect(
//     `SELECT h.JOURNAL_ID AS "journalId", h.JOURNAL_NO AS "journalNo", h.SOURCE_ID AS "sourceId",
//             h.DESCRIPTION AS "description", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
//             h.TOTAL_AMOUNT AS "amount", h.SOURCE_TYPE AS "sourceType"
//        FROM XX_AP_JOURNAL_H_T h WHERE h.SUPPLIER_ID = :id ORDER BY h.JOURNAL_ID DESC FETCH FIRST 20 ROWS ONLY`,
//     { id: supplierId }
//   );
//   for (const l of ledgerRows) l.positive = l.sourceType === 'ADVANCE';

//   // which ledger rows show the edit pencil.
//   // An invoice that had an advance linked at creation owns 2 journals
//   // ("Payable invoice ..." and "Advance ... applied to ..."); both rows get the pencil.
//   {
//     const conn = await getConnection();
//     try {
//       for (const l of ledgerRows) {
//         l.editable = false;
//         if (l.sourceType !== 'ADVANCE') continue; // only the advance-creation row is editable from the UI
//         // advance-only settlement: journaled with SOURCE_ID = 0, so it is identified by its journal id
//         const isSettle = l.sourceType === 'PAYMENT' && Number(l.sourceId) === 0;
//         const st = await checkEditable(conn, isSettle ? 'SETTLEMENT' : l.sourceType, isSettle ? Number(l.journalId) : Number(l.sourceId));
//         l.editable = st.editable && st.journals.some((j) => Number(j.journalId) === Number(l.journalId));
//       }
//     } finally {
//       await conn.close();
//     }
//   }

//   const paymentRows = await runSelect(
//     `SELECT PAYMENT_ID AS "id", PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date",
//             TOTAL_AMOUNT AS "total", STATUS AS "status"
//        FROM XX_AP_PAYMENT_H_T WHERE SUPPLIER_ID = :id ORDER BY PAYMENT_ID DESC`,
//     { id: supplierId }
//   );

//   // Which payments show the edit pencil. Same rules as checkEditable('PAYMENT'):
//   // not cancelled, exactly one journal, not posted to the GL, no advance applied.
//   // The update endpoint re-checks them on the locked row before writing.
//   if (paymentRows.length) {
//     const flags = await runSelect(
//       `SELECT p.PAYMENT_ID AS "id",
//               CASE WHEN NVL(p.STATUS,'Active') = 'Cancelled' THEN 0
//                    WHEN EXISTS (SELECT 1 FROM XX_AP_ADVANCE_ADJUSTMENT_T aa WHERE aa.PAYMENT_ID = p.PAYMENT_ID) THEN 0
//                    WHEN (SELECT COUNT(*) FROM XX_AP_JOURNAL_H_T h WHERE h.SOURCE_TYPE = 'PAYMENT' AND h.SOURCE_ID = p.PAYMENT_ID) <> 1 THEN 0
//                    WHEN EXISTS (SELECT 1 FROM XX_AP_JOURNAL_H_T h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
//                                  WHERE h.SOURCE_TYPE = 'PAYMENT' AND h.SOURCE_ID = p.PAYMENT_ID AND g.POSTED = 1) THEN 0
//                    ELSE 1 END AS "editable"
//          FROM XX_AP_PAYMENT_H_T p WHERE p.SUPPLIER_ID = :id`,
//       { id: supplierId }
//     );
//     const editableById = {};
//     for (const f of flags) editableById[f.id] = Number(f.editable) === 1;
//     for (const p of paymentRows) p.editable = !!editableById[p.id];
//   }

//   {
//     const noteRows = await runSelect(
//       `SELECT pl.PAYMENT_ID AS "pid", i.REMARKS AS "note"
//          FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
//         WHERE i.SUPPLIER_ID = :id
//        UNION
//        SELECT aa.PAYMENT_ID, i.REMARKS
//          FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
//         WHERE i.SUPPLIER_ID = :id AND aa.PAYMENT_ID IS NOT NULL`,
//       { id: supplierId }
//     );
//     const byPay = {};
//     for (const r of noteRows) if (r.note) (byPay[r.pid] ||= []).push(r.note);
//     for (const p of paymentRows) p.note = (byPay[p.id] || []).join('; ');
//   }

//   const refundRows = await runSelect(
//     `SELECT r.REFUND_ID AS "id", r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date",
//             r.REFUND_AMOUNT AS "amount", r.STATUS AS "status", a.ADVANCE_NO AS "advNo"
//        FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
//       WHERE a.SUPPLIER_ID = :id ORDER BY r.REFUND_ID DESC`,
//     { id: supplierId }
//   );

//   let outstanding = 0, advanceBalance = 0;
//   for (const i of invoiceRows) outstanding += Number(i.balance);
//   for (const a of advanceRows) advanceBalance += Number(a.balance);

//   return {
//     status: 200,
//     body: {
//       id: supplierId,
//       name: sup[0].SUPPLIER_NAME,
//       outstanding,
//       advanceBalance,
//       invoices: invoiceRows,
//       advances: advanceRows,
//       payments: paymentRows,
//       refunds: refundRows,
//       ledger: ledgerRows,
//     },
//   };
// };

// // ---------------------------------------------------------------- add a vendor
// // SUPPLIER_ID comes from the SUPPLIER_AUTONUMBER trigger (SUPPLIER_SEQ); CURRVAL is
// // session-scoped so it must be read on the same connection as the insert.
// export const createVendor = async (body) => {
//   const name = (body.name || '').trim();
//   if (!name) return { status: 400, body: { ok: false, error: 'Vendor name is required' } };
//   const conn = await getConnection();
//   try {
//     await conn.execute(
//       `INSERT INTO SUPPLIER_INFO (SUPPLIER_NAME, CONTACT_PERSON, PHONE, EMAIL, ADDRESS, STATUS)
//        VALUES (:name, :contact, :phone, :email, :address, 1)`,
//       { name, contact: body.contact || null, phone: body.phone || null, email: body.email || null, address: body.address || null }
//     );
//     const r = await conn.execute(`SELECT SUPPLIER_SEQ.CURRVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     const id = (r.rows || [])[0].id;
//     await conn.commit();
//     return { status: 200, body: { ok: true, id } };
//   } catch (e) {
//     try { await conn.rollback(); } catch (_) { /* ignore */ }
//     return { status: 400, body: { ok: false, error: e.message } };
//   } finally {
//     await conn.close();
//   }
// };

// // ---------------------------------------------------------------- record a new advance
// // Header + lines are saved in ONE transaction. Line account is always the fixed
// // Advances-to-Suppliers control account (the journal debits it too).
// export const recordAdvance = async (body) => {
//   const supplierId = parseInt(body.supplier_id, 10);
//   const date = (body.date || '').trim();
//   const bankAccount = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   const ref = (body.reference_no || '').trim();
//   const lines = Array.isArray(body.lines) ? body.lines : [];

//   if (!supplierId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'supplier_id, date and bank_account_code are required' } };

//   // The line account must already exist in CHART_OF_ACCOUNT (FK XX_AP_ADV_L_ACC_FK2).
//   const advanceAccount = await resolveAdvanceAccount();
//   if (!advanceAccount) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const validLines = [];
//   let total = 0;
//   for (const l of lines) {
//     const amt = roundCents(l.amount);
//     if (amt <= 0) continue;
//     const d = (l.desc || '').trim();
//     if (!d) return { status: 400, body: { ok: false, error: 'Description is required on every advance line' } };
//     validLines.push({ account: advanceAccount.code, desc: d, amount: amt });
//     total += amt;
//   }
//   total = roundCents(total);
//   if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an amount greater than zero' } };

//   const o = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
//   let advanceId, advanceNo;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT XX_AP_ADVANCE_S.NEXTVAL AS "id" FROM DUAL`, {}, o);
//       advanceId = (r.rows || [])[0].id;
//       advanceNo = 'ADV-' + String(advanceId).padStart(6, '0');
//       await conn.execute(
//         `INSERT INTO XX_AP_ADVANCE_T (ADVANCE_ID, ADVANCE_NO, SUPPLIER_ID, ADVANCE_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, ADVANCE_AMOUNT)
//          VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :total)`,
//         { id: advanceId, no: advanceNo, sid: supplierId, p_date: date, bank: bankAccount, method, ref, total }, o);
//       let n = 0;
//       for (const line of validLines) {
//         await conn.execute(
//           `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT)
//            VALUES (XX_AP_ADVANCE_L_S.NEXTVAL, :aid, :lno, :acc, :p_desc, :amt)`,
//           { aid: advanceId, lno: ++n, acc: line.account, p_desc: line.desc, amt: line.amount }, o);
//       }
//       await conn.commit();
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//       return { status: 400, body: { ok: false, error: e.message } };
//     } finally {
//       await conn.close();
//     }
//   }

//   const advNote = [...new Set(validLines.map((x) => x.desc))].join('; ');
//   const journalLines = validLines.map((l) => ({ account: advanceAccount.code, debit: l.amount, desc: l.desc }));
//   journalLines.push({ account: bankAccount, credit: total, desc: withNote(`Advance ${advanceNo} paid`, advNote) });
//   const jrn = await postJournal('AP', 'ADVANCE', advanceId, supplierId, date, withNote(`Advance payment ${advanceNo}`, advNote) + (ref ? ` (${ref})` : ''), journalLines);

//   if (!jrn.ok) {
//     // never keep a half-saved advance
//     const conn = await getConnection();
//     try {
//       await conn.execute(`DELETE FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id: advanceId }, o);
//       await conn.execute(`DELETE FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }, o);
//       await conn.commit();
//     } catch (_) {
//       try { await conn.rollback(); } catch (__) { /* ignore */ }
//     } finally {
//       await conn.close();
//     }
//     return { status: 400, body: { ok: false, error: jrn.error || 'Journal posting failed' } };
//   }

//   return { status: 200, body: { ok: true, advanceId, advanceNo, total, journalOk: true } };
// };

// // ---------------------------------------------------------------- save a new payable invoice (optionally linking an advance)
// export const saveInvoice = async (body) => {
//   const supplierId = parseInt(body.supplier_id, 10);
//   const invoiceNo = (body.invoice_no || '').trim();
//   const invoiceDate = (body.invoice_date || '').trim();
//   const dueDate = (body.due_date || '').trim() || invoiceDate;
//   const note = (body.note || '').trim();
//   const lines = Array.isArray(body.lines) ? body.lines : [];
//   const linkAdvanceId = parseInt(body.link_advance_id, 10) || 0;
//   const applyAmount = Number(body.apply_amount || 0);

//   if (!supplierId || !invoiceDate) return { status: 400, body: { ok: false, error: 'supplier_id and invoice_date are required' } };
//   if (!invoiceNo) return { status: 400, body: { ok: false, error: 'Invoice number is required' } };
//   if (!note) return { status: 400, body: { ok: false, error: 'Description is required' } };

//   const dup = await runSelect(`SELECT 1 FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :sid AND UPPER(INVOICE_NO) = UPPER(:no)`, { sid: supplierId, no: invoiceNo });
//   if (dup.length) return { status: 400, body: { ok: false, error: `${invoiceNo} already exists for this vendor` } };

//   const validLines = [];
//   let gross = 0;
//   for (const l of lines) {
//     const amt = Number(l.amount || 0);
//     const acc = (l.account || '').trim();
//     if (!acc || amt <= 0) continue;
//     validLines.push({ account: acc, desc: (l.desc || '').trim() || note, amount: amt });
//     gross += amt;
//   }
//   if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

//   let advance = null;
//   if (linkAdvanceId) {
//     const advRows = await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id AND SUPPLIER_ID = :sid`, { id: linkAdvanceId, sid: supplierId });
//     advance = advRows[0] || null;
//     if (!advance) return { status: 400, body: { ok: false, error: 'Selected advance not found for this vendor' } };
//     if (!(await resolveAdvanceAccount())) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };
//     if (applyAmount <= 0) return { status: 400, body: { ok: false, error: 'Enter an amount to apply from the linked advance' } };
//     if (applyAmount > Math.min(Number(advance.BALANCE_AMOUNT), gross) + 0.001) {
//       return { status: 400, body: { ok: false, error: 'Apply amount exceeds the advance balance or the invoice total' } };
//     }
//   }

//   const invoiceId = await nextVal('XX_AP_INVOICE_H_S');
//   const head = await runWrite(
//     `INSERT INTO XX_AP_INVOICE_H_T (INVOICE_ID, INVOICE_NO, SUPPLIER_ID, INVOICE_DATE, DUE_DATE, GROSS_AMOUNT, REMARKS)
//      VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), TO_DATE(:p_due,'YYYY-MM-DD'), :gross, :p_note)`,
//     { id: invoiceId, no: invoiceNo, sid: supplierId, p_date: invoiceDate, p_due: dueDate, gross, p_note: note }
//   );
//   if (!head.ok) return { status: 400, body: { ok: false, error: head.error } };

//   let lineNo = 1;
//   const journalLines = [];
//   for (const line of validLines) {
//     const lineId = await nextVal('XX_AP_INVOICE_L_S');
//     await runWrite(
//       `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
//        VALUES (:id, :iid, :lno, :acc, :p_desc, 1, :price)`,
//       { id: lineId, iid: invoiceId, lno: lineNo, acc: line.account, p_desc: line.desc, price: line.amount }
//     );
//     journalLines.push({ account: line.account, debit: line.amount, desc: line.desc });
//     lineNo++;
//   }
//   journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: withNote(`Invoice ${invoiceNo}`, note) });
//   await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, withNote(`Payable invoice ${invoiceNo}`, note), journalLines);

//   if (advance && applyAmount > 0) {
//     const adjId = await nextVal('XX_AP_ADV_ADJ_S');
//     await runWrite(
//       `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT) VALUES (:id, :aid, :iid, :amt)`,
//       { id: adjId, aid: advance.ADVANCE_ID, iid: invoiceId, amt: applyAmount }
//     );
//     await runWrite(
//       `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
//          STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :aid`,
//       { amt: applyAmount, aid: advance.ADVANCE_ID }
//     );
//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = :amt,
//          STATUS = CASE WHEN GROSS_AMOUNT - :amt <= 0 THEN 'Paid' ELSE 'Partially Paid' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//       { amt: applyAmount, iid: invoiceId }
//     );
//     await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, withNote(`Advance ${advance.ADVANCE_NO} applied to ${invoiceNo}`, note), [
//       { account: AP_PAYABLE_ACCOUNT, debit: applyAmount, desc: 'Advance applied' },
//       { account: (await resolveAdvanceAccount()).code, credit: applyAmount, desc: `Advance ${advance.ADVANCE_NO}` },
//     ]);
//   }

//   return { status: 200, body: { ok: true, invoiceId, invoiceNo, total: gross, appliedFromAdvance: advance ? applyAmount : 0, advanceNo: advance ? advance.ADVANCE_NO : null } };
// };

// // ---------------------------------------------------------------- settle selected invoices
// export const settle = async (body) => {
//   const supplierId = parseInt(body.supplier_id, 10);
//   const date = (body.date || '').trim();
//   const method = body.method || '';
//   const bankAccount = (body.bank_account_code || '').trim();
//   const applications = Array.isArray(body.applications) ? body.applications : [];

//   if (!supplierId || !date) return { status: 400, body: { ok: false, error: 'supplier_id and date are required' } };

//   let totalPayNow = 0, totalFromAdvance = 0;
//   for (const a of applications) {
//     totalPayNow += Number(a.payNow || 0);
//     totalFromAdvance += Number(a.fromAdvance || 0);
//   }
//   if (totalPayNow > 0 && !bankAccount) return { status: 400, body: { ok: false, error: 'Select a Paid From account for the cash portion' } };
//   if (totalPayNow <= 0 && totalFromAdvance <= 0) return { status: 400, body: { ok: false, error: 'Nothing to settle' } };
//   const advAcct = totalFromAdvance > 0 ? await resolveAdvanceAccount() : null;
//   if (totalFromAdvance > 0 && !advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const openAdvances = await runSelect(
//     `SELECT ADVANCE_ID, BALANCE_AMOUNT FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :sid AND STATUS != 'Cancelled' AND BALANCE_AMOUNT > 0 ORDER BY ADVANCE_DATE, ADVANCE_ID`,
//     { sid: supplierId }
//   );
//   const availableAdvance = openAdvances.reduce((s, a) => s + Number(a.BALANCE_AMOUNT), 0);
//   if (totalFromAdvance > availableAdvance + 0.001) return { status: 400, body: { ok: false, error: 'Requested advance offset exceeds available advance balance' } };

//   let paymentId = null, paymentNo = null;
//   if (totalPayNow > 0) {
//     paymentId = await nextVal('XX_AP_PAYMENT_H_S');
//     paymentNo = 'PAY-' + String(paymentId).padStart(6, '0');
//     const r = await runWrite(
//       `INSERT INTO XX_AP_PAYMENT_H_T (PAYMENT_ID, PAYMENT_NO, SUPPLIER_ID, PAYMENT_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, TOTAL_AMOUNT)
//        VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :total)`,
//       { id: paymentId, no: paymentNo, sid: supplierId, p_date: date, bank: bankAccount, method, total: totalPayNow }
//     );
//     if (!r.ok) return { status: 400, body: { ok: false, error: r.error } };
//   }

//   const advanceRemaining = openAdvances.map((a) => ({ ...a }));
//   for (const a of applications) {
//     const invoiceId = parseInt(a.invoiceId, 10);
//     const payNow = Number(a.payNow || 0);
//     const fromAdvance = Number(a.fromAdvance || 0);
//     if (!invoiceId || (payNow <= 0 && fromAdvance <= 0)) continue;

//     if (payNow > 0 && paymentId) {
//       const lineId = await nextVal('XX_AP_PAYMENT_L_S');
//       await runWrite(`INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT) VALUES (:id, :pid, :iid, :amt)`, { id: lineId, pid: paymentId, iid: invoiceId, amt: payNow });
//       await runWrite(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: payNow, iid: invoiceId });
//     }

//     if (fromAdvance > 0) {
//       let left = fromAdvance;
//       for (const adv of advanceRemaining) {
//         if (left <= 0) break;
//         const take = Math.min(left, Number(adv.BALANCE_AMOUNT));
//         if (take <= 0) continue;
//         const adjId = await nextVal('XX_AP_ADV_ADJ_S');
//         await runWrite(
//           `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT, PAYMENT_ID) VALUES (:id, :advid, :iid, :amt, :pid)`,
//           { id: adjId, advid: adv.ADVANCE_ID, iid: invoiceId, amt: take, pid: paymentId }
//         );
//         await runWrite(
//           `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
//              STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//           { amt: take, advid: adv.ADVANCE_ID }
//         );
//         await runWrite(`UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: take, iid: invoiceId });
//         adv.BALANCE_AMOUNT = Number(adv.BALANCE_AMOUNT) - take;
//         left -= take;
//       }
//     }

//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
//          WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
//          WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
//          ELSE STATUS END WHERE INVOICE_ID = :iid`,
//       { iid: invoiceId }
//     );
//   }

//   const journalLines = [];
//   if (totalPayNow + totalFromAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, debit: totalPayNow + totalFromAdvance, desc: 'Invoices settled' });
//   if (totalPayNow > 0) journalLines.push({ account: bankAccount, credit: totalPayNow, desc: paymentNo || 'Payment' });
//   if (totalFromAdvance > 0) journalLines.push({ account: advAcct.code, credit: totalFromAdvance, desc: 'Advance applied' });
//   const settleNotes = await invoiceNotes(applications.map((a) => parseInt(a.invoiceId, 10)));
//   await postJournal('AP', 'PAYMENT', paymentId || 0, supplierId, date, withNote('Settlement' + (paymentNo ? ` ${paymentNo}` : ''), settleNotes.join('; ')), journalLines);

//   return { status: 200, body: { ok: true, paymentNo, totalPayNow, totalFromAdvance } };
// };

// // ---------------------------------------------------------------- cancel an invoice
// export const cancelInvoice = async (body) => {
//   const invoiceId = parseInt(body.invoice_id, 10);
//   if (!invoiceId) return { status: 400, body: { ok: false, error: 'invoice_id is required' } };

//   const invoice = (await runSelect(`SELECT * FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: invoiceId }))[0];
//   if (!invoice) return { status: 400, body: { ok: false, error: 'Invoice not found' } };
//   if (invoice.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Invoice is already cancelled' } };
//   if (Number(invoice.PAID_AMOUNT) > 0) return { status: 400, body: { ok: false, error: 'This invoice has cash payments recorded — cancel the related payment(s) first.' } };
//   if (await isPosted('AP', 'INVOICE', invoiceId)) return { status: 400, body: { ok: false, error: 'This invoice has already been posted to the general ledger and can no longer be cancelled.' } };

//   const adjustments = await runSelect(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id`, { id: invoiceId });
//   for (const adj of adjustments) {
//     if (adj.PAYMENT_ID !== null) return { status: 400, body: { ok: false, error: 'This invoice has an advance applied via a payment — cancel that payment first.' } };
//   }

//   for (const adj of adjustments) {
//     await runWrite(
//       `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
//          STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//       { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
//     );
//     await runWrite(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
//   }

//   const lines = await runSelect(`SELECT ACCOUNT_CODE AS "code", LINE_AMOUNT AS "amount", ITEM_DESCRIPTION AS "desc" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id: invoiceId });
//   const journalLines = [{ account: AP_PAYABLE_ACCOUNT, debit: Number(invoice.GROSS_AMOUNT) + Number(invoice.TAX_AMOUNT), desc: 'Invoice cancelled' }];
//   for (const l of lines) journalLines.push({ account: l.code, credit: l.amount, desc: l.desc });
//   await postJournal('AP', 'INVOICE', invoiceId, invoice.SUPPLIER_ID, today(), withNote(`Invoice ${invoice.INVOICE_NO} cancelled`, invoice.REMARKS), journalLines);

//   await runWrite(`UPDATE XX_AP_INVOICE_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { id: invoiceId });

//   return { status: 200, body: { ok: true, invoiceNo: invoice.INVOICE_NO } };
// };

// // ---------------------------------------------------------------- cancel a payment
// export const cancelPayment = async (body) => {
//   const paymentId = parseInt(body.payment_id, 10);
//   if (!paymentId) return { status: 400, body: { ok: false, error: 'payment_id is required' } };

//   const payment = (await runSelect(`SELECT * FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: paymentId }))[0];
//   if (!payment) return { status: 400, body: { ok: false, error: 'Payment not found' } };
//   if (payment.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Payment is already cancelled' } };
//   if (await isPosted('AP', 'PAYMENT', paymentId)) return { status: 400, body: { ok: false, error: 'This payment has already been posted to the general ledger and can no longer be cancelled.' } };

//   const payLines = await runSelect(`SELECT * FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id: paymentId });
//   const advAdjustments = await runSelect(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id: paymentId });
//   const advAcct = advAdjustments.length ? await resolveAdvanceAccount() : null;
//   if (advAdjustments.length && !advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   let totalCash = 0, totalAdvance = 0;

//   for (const pl of payLines) {
//     totalCash += Number(pl.APPLIED_AMOUNT);
//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT - :amt,
//          STATUS = CASE
//            WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - (PAID_AMOUNT - :amt) <= 0 THEN 'Paid'
//            WHEN ADVANCE_ADJUSTED + (PAID_AMOUNT - :amt) > 0 THEN 'Partially Paid'
//            ELSE 'Draft' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//       { amt: pl.APPLIED_AMOUNT, iid: pl.INVOICE_ID }
//     );
//   }

//   for (const adj of advAdjustments) {
//     totalAdvance += Number(adj.ADJUSTED_AMOUNT);
//     await runWrite(
//       `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
//          STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//       { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
//     );
//     await runWrite(
//       `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED - :amt,
//          STATUS = CASE
//            WHEN GROSS_AMOUNT + TAX_AMOUNT - (ADVANCE_ADJUSTED - :amt) - PAID_AMOUNT <= 0 THEN 'Paid'
//            WHEN (ADVANCE_ADJUSTED - :amt) + PAID_AMOUNT > 0 THEN 'Partially Paid'
//            ELSE 'Draft' END,
//          LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//       { amt: adj.ADJUSTED_AMOUNT, iid: adj.INVOICE_ID }
//     );
//     await runWrite(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
//   }

//   const journalLines = [];
//   if (totalCash + totalAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: totalCash + totalAdvance, desc: 'Settlement reversed' });
//   if (totalCash > 0) journalLines.push({ account: payment.BANK_ACCOUNT_CODE, debit: totalCash, desc: `Payment ${payment.PAYMENT_NO} cancelled` });
//   if (totalAdvance > 0) journalLines.push({ account: advAcct.code, debit: totalAdvance, desc: 'Advance restored' });
//   const cancelNotes = await invoiceNotes([...payLines.map((x) => x.INVOICE_ID), ...advAdjustments.map((x) => x.INVOICE_ID)]);
//   if (journalLines.length) await postJournal('AP', 'PAYMENT', paymentId, payment.SUPPLIER_ID, today(), withNote(`Payment ${payment.PAYMENT_NO} cancelled`, cancelNotes.join('; ')), journalLines);

//   await runWrite(`UPDATE XX_AP_PAYMENT_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`, { id: paymentId });

//   return { status: 200, body: { ok: true, paymentNo: payment.PAYMENT_NO } };
// };

// // ---------------------------------------------------------------- refund an advance
// export const refundAdvance = async (body) => {
//   const advanceId = parseInt(body.advance_id, 10);
//   const date = (body.date || '').trim();
//   const bankAccount = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   const ref = (body.reference_no || '').trim();
//   const amount = Number(body.amount || 0);
//   const remarks = (body.remarks || '').trim();

//   if (!advanceId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'advance_id, date and bank_account_code are required' } };
//   if (amount <= 0) return { status: 400, body: { ok: false, error: 'Enter a refund amount greater than zero' } };

//   const advance = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }))[0];
//   if (!advance) return { status: 400, body: { ok: false, error: 'Advance not found' } };
//   if (advance.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'This advance is cancelled' } };
//   if (amount > Number(advance.BALANCE_AMOUNT) + 0.001) return { status: 400, body: { ok: false, error: 'Refund amount exceeds the available (unadjusted) advance balance' } };
//   const advAcct = await resolveAdvanceAccount();
//   if (!advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const refundId = await nextVal('XX_AP_ADV_REFUND_S');
//   const refundNo = 'REF-' + String(refundId).padStart(6, '0');

//   const ins = await runWrite(
//     `INSERT INTO XX_AP_ADVANCE_REFUND_T (REFUND_ID, REFUND_NO, ADVANCE_ID, REFUND_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, REFUND_AMOUNT, REMARKS)
//      VALUES (:id, :no, :advid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :amt, :p_remarks)`,
//     { id: refundId, no: refundNo, advid: advanceId, p_date: date, bank: bankAccount, method, ref, amt: amount, p_remarks: remarks }
//   );
//   if (!ins.ok) return { status: 400, body: { ok: false, error: ins.error } };

//   await runWrite(
//     `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT + :amt,
//        STATUS = CASE
//          WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT + :amt) > 0 THEN 'Partially Adjusted'
//          WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted'
//          ELSE 'Refunded' END,
//        LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//     { amt: amount, advid: advanceId }
//   );

//   const refNote = (await advanceNotes(advanceId)).join('; ');
//   const jrn = await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, date, withNote(`Advance ${advance.ADVANCE_NO} refunded`, refNote), [
//     { account: bankAccount, debit: amount, desc: withNote(`Refund ${refundNo}`, refNote) },
//     { account: advAcct.code, credit: amount, desc: withNote(`Advance ${advance.ADVANCE_NO} refunded`, refNote) },
//   ]);

//   return { status: 200, body: { ok: true, refundId, refundNo, amount, journalOk: jrn.ok } };
// };

// // ---------------------------------------------------------------- cancel an advance refund
// export const cancelRefund = async (body) => {
//   const refundId = parseInt(body.refund_id, 10);
//   if (!refundId) return { status: 400, body: { ok: false, error: 'refund_id is required' } };

//   const refund = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id`, { id: refundId }))[0];
//   if (!refund) return { status: 400, body: { ok: false, error: 'Refund not found' } };
//   if (refund.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Refund is already cancelled' } };
//   if (await isPosted('AP', 'REFUND', refundId)) return { status: 400, body: { ok: false, error: 'This refund has already been posted to the general ledger and can no longer be cancelled.' } };

//   const advance = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: refund.ADVANCE_ID }))[0];
//   if (!advance) return { status: 400, body: { ok: false, error: 'Related advance not found' } };
//   const advAcct = await resolveAdvanceAccount();
//   if (!advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   await runWrite(
//     `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT - :amt,
//        STATUS = CASE
//          WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT - :amt) <= 0 THEN
//            CASE WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted' ELSE 'Refunded' END
//          WHEN ADJUSTED_AMOUNT > 0 OR (REFUNDED_AMOUNT - :amt) > 0 THEN 'Partially Adjusted'
//          ELSE 'Open' END,
//        LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//     { amt: refund.REFUND_AMOUNT, advid: refund.ADVANCE_ID }
//   );

//   const cancelRefNote = (await advanceNotes(refund.ADVANCE_ID)).join('; ');
//   await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, today(), withNote(`Refund ${refund.REFUND_NO} cancelled`, cancelRefNote), [
//     { account: advAcct.code, debit: refund.REFUND_AMOUNT, desc: withNote('Advance refund reversed', cancelRefNote) },
//     { account: refund.BANK_ACCOUNT_CODE, credit: refund.REFUND_AMOUNT, desc: withNote(`Refund ${refund.REFUND_NO} cancelled`, cancelRefNote) },
//   ]);

//   await runWrite(`UPDATE XX_AP_ADVANCE_REFUND_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`, { id: refundId });

//   return { status: 200, body: { ok: true, refundNo: refund.REFUND_NO } };
// };

// // ---------------------------------------------------------------- read-only transaction details (view / print / excel)
// const VIEW_TYPES = ['INVOICE', 'ADVANCE', 'PAYMENT', 'REFUND'];

// export const getTransaction = async (params, query = {}) => {
//   const sourceType = String(params.sourceType || '').toUpperCase();
//   if (!VIEW_TYPES.includes(sourceType)) return { status: 400, body: { ok: false, error: 'sourceType must be INVOICE, ADVANCE, PAYMENT or REFUND' } };
//   const sourceId = parseInt(params.sourceId, 10);
//   if (Number.isNaN(sourceId) || sourceId < 0) return { status: 400, body: { ok: false, error: 'Invalid sourceId' } };
//   const journalId = parseInt(query.journalId, 10) || 0;

//   let title = '', status = '', date = '', supplierId = null, note = '', fields = null, invoiceForm = null;
//   let summary = [];
//   const sections = [];

//   if (sourceType === 'INVOICE') {
//     const h = (await runSelect(
//       `SELECT INVOICE_NO AS "no", TO_CHAR(INVOICE_DATE,'YYYY-MM-DD') AS "date", TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due",
//               NVL(GROSS_AMOUNT,0) AS "gross", NVL(TAX_AMOUNT,0) AS "tax", NVL(PAID_AMOUNT,0) AS "paid",
//               NVL(ADVANCE_ADJUSTED,0) AS "adv", NVL(BALANCE_DUE,0) AS "balance", STATUS AS "status",
//               REMARKS AS "note", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: sourceId }))[0];
//     if (!h) return { status: 404, body: { ok: false, error: 'Invoice not found' } };
//     title = `Invoice ${h.no}`; status = h.status; date = h.date; supplierId = h.supplierId;
//     summary = [
//       { label: 'Invoice date', value: h.date }, { label: 'Due date', value: h.due },
//       { label: 'Gross amount', value: h.gross, money: true }, { label: 'Tax', value: h.tax, money: true },
//       { label: 'Paid (cash)', value: h.paid, money: true }, { label: 'Advance adjusted', value: h.adv, money: true },
//       { label: 'Balance due', value: h.balance, money: true }, { label: 'Description', value: h.note || '-' },
//     ];
//     const lines = await runSelect(
//       `SELECT l.LINE_NO AS "lineNo", l.ACCOUNT_CODE AS "account", c.ACCOUNT_NAME AS "accountName",
//               l.ITEM_DESCRIPTION AS "desc", l.QTY AS "qty", l.UNIT_PRICE AS "price"
//          FROM XX_AP_INVOICE_L_T l LEFT JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = l.ACCOUNT_CODE
//         WHERE l.INVOICE_ID = :id ORDER BY l.LINE_NO`, { id: sourceId });
//     sections.push({
//       title: 'Invoice lines',
//       columns: [{ key: 'lineNo', label: '#' }, { key: 'account', label: 'Account' }, { key: 'desc', label: 'Description' }, { key: 'amount', label: 'Amount', money: true }],
//       rows: lines.map((l) => ({ lineNo: l.lineNo, account: `${l.account}${l.accountName ? ' · ' + l.accountName : ''}`, desc: l.desc || '', amount: num(l.qty || 1) * num(l.price) })),
//     });
//     const adj = await runSelect(
//       `SELECT a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
//         WHERE aa.INVOICE_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
//     sections.push({ title: 'Advance adjustments', columns: [{ key: 'advNo', label: 'Advance' }, { key: 'amount', label: 'Applied', money: true }], rows: adj });
//     const pays = await runSelect(
//       `SELECT p.PAYMENT_NO AS "payNo", TO_CHAR(p.PAYMENT_DATE,'YYYY-MM-DD') AS "date", p.STATUS AS "status", pl.APPLIED_AMOUNT AS "amount"
//          FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_PAYMENT_H_T p ON p.PAYMENT_ID = pl.PAYMENT_ID
//         WHERE pl.INVOICE_ID = :id ORDER BY p.PAYMENT_ID`, { id: sourceId });
//     sections.push({
//       title: 'Cash payments',
//       columns: [{ key: 'payNo', label: 'Payment' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Applied', money: true }],
//       rows: pays.map((p) => ({ ...p, status: p.status || 'Active' })),
//     });
//     // Read-only copy of the invoice entry form (same fields the user typed), shown for every journal row of this invoice.
//     {
//       const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
//       const formLines = lines.map((l) => ({ account: l.account, accountName: l.accountName || '', desc: l.desc || '', amount: num(l.qty || 1) * num(l.price) }));
//       const total = formLines.reduce((t, l) => t + l.amount, 0);
//       const applied = adj.reduce((t, a) => t + num(a.amount), 0);
//       const advNos = adj.map((a) => a.advNo).join(', ');
//       const rows = formLines.map((l) => ({ label: `${l.account}${l.accountName ? ' · ' + l.accountName : ''}`, dr: l.amount, cr: 0 }));
//       rows.push({ label: `${AP_PAYABLE_ACCOUNT} · Accounts Payable - Trade`, dr: 0, cr: total, isCredit: true });
//       let previewTotal = total;
//       if (applied > 0) {
//         previewTotal = total + applied;
//         rows.push({ label: `${AP_PAYABLE_ACCOUNT} · Accounts Payable - Trade (advance applied)`, dr: applied, cr: 0 });
//         rows.push({ label: `${advAcct.code} · ${advAcct.name} (${advNos})`, dr: 0, cr: applied, isCredit: true });
//       }
//       invoiceForm = {
//         no: h.no, date: h.date, due: h.due, note: h.note || '',
//         lines: formLines, total,
//         advance: applied > 0 ? { no: advNos, applied } : null,
//         preview: { rows, total: previewTotal },
//       };
//     }
//   }

//   if (sourceType === 'ADVANCE') {
//     const h = (await runSelect(
//       `SELECT ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", REFERENCE_NO AS "ref", NVL(ADVANCE_AMOUNT,0) AS "total",
//               NVL(ADJUSTED_AMOUNT,0) AS "adjusted", NVL(REFUNDED_AMOUNT,0) AS "refunded",
//               NVL(BALANCE_AMOUNT,0) AS "balance", STATUS AS "status", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: sourceId }))[0];
//     if (!h) return { status: 404, body: { ok: false, error: 'Advance not found' } };
//     title = `Advance ${h.no}`; status = h.status; date = h.date; supplierId = h.supplierId;
//     const bankName = h.bank ? ((await runSelect(`SELECT ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_ID = :c`, { c: h.bank }))[0] || {}).name : '';
//     fields = [
//       { label: 'Paid from account', value: h.bank ? `${h.bank}${bankName ? ' · ' + bankName : ''}` : '-' },
//       { label: 'Payment date', value: h.date || '-' },
//       { label: 'Method', value: h.method || '-' },
//       { label: 'Reference', value: h.ref || '-' },
//     ];
//     summary = [
//       { label: 'Advance amount', value: h.total, money: true }, { label: 'Adjusted to invoices', value: h.adjusted, money: true },
//       { label: 'Refunded', value: h.refunded, money: true }, { label: 'Balance', value: h.balance, money: true },
//     ];
//     let lines = await runSelect(
//       `SELECT l.LINE_NO AS "lineNo", l.ACCOUNT_CODE AS "account", l.DESCRIPTION AS "desc", l.AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_L_T l WHERE l.ADVANCE_ID = :id ORDER BY l.LINE_NO`, { id: sourceId });
//     // Older advances may have no saved lines; show one line from the header total instead.
//     const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
//     if (!lines.length && num(h.total) > 0) lines = [{ lineNo: 1, account: advAcct.code, desc: '', amount: h.total }];
//     sections.push({
//       title: 'Advance lines',
//       columns: [{ key: 'account', label: 'Account' }, { key: 'desc', label: 'Description' }, { key: 'amount', label: 'Amount', money: true }],
//       rows: lines.map((l) => ({ account: `${advAcct.code} · ${advAcct.name}`, desc: l.desc || '', amount: num(l.amount) })),
//       footer: { label: 'Total advance', value: lines.reduce((t, l) => t + num(l.amount), 0) },
//     });
//     const applied = await runSelect(
//       `SELECT i.INVOICE_NO AS "invNo", aa.ADJUSTED_AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
//         WHERE aa.ADVANCE_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
//     sections.push({ title: 'Applied to invoices', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'amount', label: 'Applied', money: true }], rows: applied });
//     const refunds = await runSelect(
//       `SELECT REFUND_NO AS "refNo", TO_CHAR(REFUND_DATE,'YYYY-MM-DD') AS "date", STATUS AS "status", REFUND_AMOUNT AS "amount"
//          FROM XX_AP_ADVANCE_REFUND_T WHERE ADVANCE_ID = :id ORDER BY REFUND_ID`, { id: sourceId });
//     sections.push({
//       title: 'Refunds',
//       columns: [{ key: 'refNo', label: 'Refund' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount', money: true }],
//       rows: refunds.map((r) => ({ ...r, status: r.status || 'Active' })),
//     });
//   }

//   if (sourceType === 'PAYMENT') {
//     const h = sourceId > 0 ? (await runSelect(
//       `SELECT PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", NVL(TOTAL_AMOUNT,0) AS "total", STATUS AS "status", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: sourceId }))[0] : null;
//     if (h) {
//       title = `Payment ${h.no}`; status = h.status || 'Active'; date = h.date; supplierId = h.supplierId;
//       summary = [
//         { label: 'Date', value: h.date }, { label: 'Paid from', value: h.bank || '-' },
//         { label: 'Method', value: h.method || '-' }, { label: 'Cash amount', value: h.total, money: true },
//       ];
//       const pn = await runSelect(
//         `SELECT i.REMARKS AS "note" FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID WHERE pl.PAYMENT_ID = :id
//          UNION
//          SELECT i.REMARKS FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID WHERE aa.PAYMENT_ID = :id`,
//         { id: sourceId }
//       );
//       const pnText = pn.map((r) => r.note).filter(Boolean).join('; ');
//       if (pnText) summary.push({ label: 'Description', value: pnText });
//       const paid = await runSelect(
//         `SELECT i.INVOICE_NO AS "invNo", pl.APPLIED_AMOUNT AS "amount"
//            FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
//           WHERE pl.PAYMENT_ID = :id ORDER BY pl.PAYMENT_LINE_ID`, { id: sourceId });
//       sections.push({ title: 'Invoices paid (cash)', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'amount', label: 'Applied', money: true }], rows: paid });
//       const advPart = await runSelect(
//         `SELECT i.INVOICE_NO AS "invNo", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amount"
//            FROM XX_AP_ADVANCE_ADJUSTMENT_T aa
//            JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
//            JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
//           WHERE aa.PAYMENT_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
//       sections.push({ title: 'Advance portions', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'advNo', label: 'Advance' }, { key: 'amount', label: 'Applied', money: true }], rows: advPart });
//     } else {
//       // Advance-only settlement: settle() journals it with SOURCE_ID = 0 and creates no payment header.
//       if (!journalId) return { status: 400, body: { ok: false, error: 'journalId is required for an advance-only settlement' } };
//       title = 'Advance-only settlement';
//       note = 'Advance-only settlement (no cash payment). Only the journal entry is available for this record.';
//     }
//   }

//   if (sourceType === 'REFUND') {
//     const h = (await runSelect(
//       `SELECT r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date", r.BANK_ACCOUNT_CODE AS "bank",
//               r.PAYMENT_METHOD AS "method", r.REFERENCE_NO AS "ref", NVL(r.REFUND_AMOUNT,0) AS "amount",
//               r.REMARKS AS "remarks", r.STATUS AS "status", a.ADVANCE_NO AS "advNo", a.SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
//         WHERE r.REFUND_ID = :id`, { id: sourceId }))[0];
//     if (!h) return { status: 404, body: { ok: false, error: 'Refund not found' } };
//     title = `Refund ${h.no}`; status = h.status || 'Active'; date = h.date; supplierId = h.supplierId;
//     summary = [
//       { label: 'Date', value: h.date }, { label: 'Advance', value: h.advNo },
//       { label: 'Refunded to', value: h.bank || '-' }, { label: 'Method', value: h.method || '-' },
//       { label: 'Reference', value: h.ref || '-' }, { label: 'Refund amount', value: h.amount, money: true },
//       { label: 'Remarks', value: h.remarks || '-' },
//     ];
//   }

//   // ---- journals: every journal for this source, so cancellation reversals show up too ----
//   const jWhere = journalId ? `h.JOURNAL_ID = :jid AND h.SOURCE_TYPE = :st` : `h.SOURCE_TYPE = :st AND h.SOURCE_ID = :sid`;
//   const jBinds = journalId ? { jid: journalId, st: sourceType } : { st: sourceType, sid: sourceId };
//   const jRows = await runSelect(
//     `SELECT h.JOURNAL_ID AS "journalId", h.JOURNAL_NO AS "journalNo", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
//             h.DESCRIPTION AS "description", h.SUPPLIER_ID AS "supplierId", l.LINE_NO AS "lineNo",
//             l.ACCOUNT_CODE AS "account", c.ACCOUNT_NAME AS "accountName",
//             NVL(l.DEBIT_AMOUNT,0) AS "debit", NVL(l.CREDIT_AMOUNT,0) AS "credit"
//        FROM XX_AP_JOURNAL_H_T h
//        JOIN XX_AP_JOURNAL_L_T l ON l.JOURNAL_ID = h.JOURNAL_ID
//        LEFT JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = l.ACCOUNT_CODE
//       WHERE ${jWhere} ORDER BY h.JOURNAL_ID, l.LINE_NO`, jBinds);

//   const entries = [];
//   let totalDebit = 0, totalCredit = 0;
//   for (const r of jRows) {
//     let e = entries[entries.length - 1];
//     if (!e || e.journalId !== r.journalId) {
//       e = { journalId: r.journalId, journalNo: r.journalNo, date: r.date, description: r.description || '', kind: /^(Invoice|Payment|Refund) \S+ cancelled/i.test(r.description || '') ? 'Reversal' : 'Original', lines: [] };
//       entries.push(e);
//     }
//     e.lines.push({ account: r.account, accountName: r.accountName || '', debit: num(r.debit), credit: num(r.credit) });
//     totalDebit += num(r.debit);
//     totalCredit += num(r.credit);
//   }
//   // Older advances may have lost their debit line. Show the missing Advances-to-Suppliers
//   // debit so the entry balances, and flag it as derived.
//   if (sourceType === 'ADVANCE') {
//     const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
//     for (const e of entries) {
//       const dr = e.lines.reduce((t, l) => t + l.debit, 0), cr = e.lines.reduce((t, l) => t + l.credit, 0);
//       if (e.kind === 'Original' && cr - dr > 0.005) {
//         e.lines.unshift({ account: advAcct.code, accountName: advAcct.name, debit: Math.round((cr - dr) * 100) / 100, credit: 0, derived: true });
//         e.derived = true;
//         totalDebit += cr - dr;
//       }
//     }
//   }
//   // "Advance ADV-x applied to INV-y" journal of an invoice: show its own header instead of the invoice's.
//   if (sourceType === 'INVOICE' && journalId && entries.length) {
//     const m = /^Advance (\S+) applied to (\S+)/i.exec(entries[0].description);
//     if (m) {
//       const amt = `৳${num(totalDebit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//       title = `Payment ${m[2]}`;
//       status = '';
//       fields = [
//         { label: 'Invoice', value: m[2] },
//         { label: 'Paid from', value: `Advance ${m[1]}` },
//         { label: 'Payment date', value: entries[0].date || '-' },
//         { label: 'Method', value: 'Advance adjustment' },
//         { label: 'Amount', value: amt },
//       ];
//     }
//   }
//   if (!supplierId && jRows.length) supplierId = jRows[0].supplierId;
//   if (!date && jRows.length) date = jRows[0].date;
//   if (!title) title = 'Transaction';
//   if (!summary.length && entries.length) {
//     summary = [{ label: 'Date', value: entries[0].date }, { label: 'Description', value: entries[0].description }, { label: 'Amount', value: totalDebit, money: true }];
//   }

//   let supplierName = '';
//   if (supplierId) {
//     const s = await runSelect(`SELECT SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId });
//     supplierName = s[0] ? s[0].name : '';
//   }

//   let glPosted = false;
//   if (journalId) {
//     const p = await runSelect(
//       `SELECT COUNT(*) AS "cnt" FROM XX_AP_JOURNAL_H_T h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
//         WHERE h.JOURNAL_ID = :jid AND g.POSTED = 1`, { jid: journalId });
//     glPosted = num(p[0] && p[0].cnt) > 0;
//   } else {
//     glPosted = await isPosted('AP', sourceType, sourceId);
//   }

//   return {
//     status: 200,
//     body: {
//       ok: true, sourceType, sourceId, title, status, date, supplierName, note, glPosted,
//       cancelled: String(status).toLowerCase() === 'cancelled',
//       summary, fields, invoiceForm, sections: sections.filter((s) => s.rows.length),
//       journal: { entries, totalDebit: Math.round(totalDebit * 100) / 100, totalCredit: Math.round(totalCredit * 100) / 100 },
//     },
//   };
// };

// // ================================================================ EDIT (parent editable only while it has no child)
// const TX = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
// const qc = async (conn, sql, binds = {}) => (await conn.execute(sql, binds, TX)).rows || [];
// const cnt = async (conn, sql, binds) => Number((await qc(conn, sql, binds))[0].c);

// // Returns { editable:false, reason } or { editable:true, head, journal, journals, adj }.
// //  - journals: every journal of the record (an invoice with an advance linked at creation has 2)
// //  - adj: advance adjustment made at invoice creation (PAYMENT_ID IS NULL) — allowed, the record is still editable
// async function checkEditable(conn, type, id, lock = false) {
//   const fu = lock ? ' FOR UPDATE' : '';
//   const no = (reason) => ({ editable: false, reason });
//   let head;
//   let adj = [];
//   if (type === 'ADVANCE') {
//     head = (await qc(conn, `SELECT ADVANCE_NO AS "no", STATUS AS "status", NVL(ADJUSTED_AMOUNT,0) AS "adj", SUPPLIER_ID AS "supplierId" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id${fu}`, { id }))[0];
//     if (!head) return no('Advance not found');
//     if (head.status === 'Cancelled') return no('Advance is cancelled');
//     if (Number(head.adj) > 0 || (await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADVANCE_ID = :id`, { id })) > 0) return no('This advance is applied to an invoice. Cancel that first.');
//     if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_REFUND_T WHERE ADVANCE_ID = :id AND NVL(STATUS,'Active') != 'Cancelled'`, { id })) > 0) return no('A refund exists for this advance. Cancel it first.');
//   } else if (type === 'INVOICE') {
//     head = (await qc(conn, `SELECT INVOICE_NO AS "no", STATUS AS "status", SUPPLIER_ID AS "supplierId", NVL(PAID_AMOUNT,0) AS "paid", NVL(ADVANCE_ADJUSTED,0) AS "adv" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id${fu}`, { id }))[0];
//     if (!head) return no('Invoice not found');
//     if (head.status === 'Cancelled') return no('Invoice is cancelled');
//     // advance applied THROUGH a payment = child record -> block
//     if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id AND PAYMENT_ID IS NOT NULL`, { id })) > 0) return no('An advance was applied through a payment. Cancel that payment first.');
//     if (Number(head.paid) > 0 || (await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_PAYMENT_H_T p ON p.PAYMENT_ID = pl.PAYMENT_ID WHERE pl.INVOICE_ID = :id AND NVL(p.STATUS,'Active') != 'Cancelled'`, { id })) > 0) return no('A payment exists for this invoice. Cancel the payment first.');
//     // advance linked at invoice-creation time (allowed)
//     adj = await qc(conn, `SELECT ADJUSTMENT_ID AS "id", ADVANCE_ID AS "advanceId", ADJUSTED_AMOUNT AS "applied" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id AND PAYMENT_ID IS NULL`, { id });
//     if (adj.length > 1) return no('This invoice has more than one advance linked and cannot be edited.');
//   } else if (type === 'PAYMENT') {
//     head = (await qc(conn, `SELECT PAYMENT_NO AS "no", STATUS AS "status", SUPPLIER_ID AS "supplierId" FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id${fu}`, { id }))[0];
//     if (!head) return no('Payment not found');
//     if (head.status === 'Cancelled') return no('Payment is cancelled');
//     // A payment that also applied an advance has advance-adjustment rows and a journal
//     // with a third (advance) line. Re-pointing those is a separate operation, so such
//     // payments stay non-editable here — cancel the payment instead.
//     if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id })) > 0) return no('This payment applied an advance and cannot be edited. Cancel it instead.');
//   } else if (type === 'REFUND') {
//     head = (await qc(conn, `SELECT r.REFUND_NO AS "no", r.STATUS AS "status", a.SUPPLIER_ID AS "supplierId" FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID WHERE r.REFUND_ID = :id`, { id }))[0];
//     if (!head) return no('Refund not found');
//     if (head.status === 'Cancelled') return no('Refund is cancelled');
//     if (lock) await qc(conn, `SELECT 1 FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id FOR UPDATE`, { id });
//   } else if (type === 'SETTLEMENT') {
//     // Advance-only settlement: no payment header exists, only one journal (SOURCE_TYPE PAYMENT, SOURCE_ID 0).
//     // `id` here is the JOURNAL_ID. Only the date can be edited (nothing links it to its adjustment rows).
//     const j = (await qc(conn, `SELECT JOURNAL_ID AS "journalId", JOURNAL_NO AS "journalNo", SUPPLIER_ID AS "supplierId"
//          FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id AND SOURCE_TYPE = 'PAYMENT' AND SOURCE_ID = 0${fu}`, { id }))[0];
//     if (!j) return no('Settlement not found');
//     const g = await qc(conn, `SELECT POSTED AS "posted" FROM GLMASTER WHERE VOUCHERNO = :n${fu}`, { n: j.journalNo });
//     if (g.some((x) => Number(x.posted) === 1)) return no('Already posted to the general ledger.');
//     return { editable: true, head: { no: j.journalNo, supplierId: j.supplierId }, journal: j, journals: [j], adj: [] };
//   } else return no('This record type cannot be edited');

//   const js = await qc(conn, `SELECT JOURNAL_ID AS "journalId", JOURNAL_NO AS "journalNo" FROM XX_AP_JOURNAL_H_T WHERE SOURCE_TYPE = :t AND SOURCE_ID = :id ORDER BY JOURNAL_ID`, { t: type, id });
//   const expected = type === 'INVOICE' && adj.length ? 2 : 1;
//   if (js.length !== expected) return no('Journal not found, or an unexpected number of journals exists for this record.');
//   for (const j of js) {
//     const g = await qc(conn, `SELECT POSTED AS "posted" FROM GLMASTER WHERE VOUCHERNO = :n${fu}`, { n: j.journalNo });
//     if (g.some((x) => Number(x.posted) === 1)) return no('Already posted to the general ledger.');
//   }
//   return { editable: true, head, journal: js[0], journals: js, adj };
// }

// // raw data to prefill the edit forms (also re-checks editable)
// export const getEditData = async (params) => {
//   const type = String(params.type || '').toUpperCase();
//   const id = parseInt(params.id, 10);
//   if (!id || !['ADVANCE', 'INVOICE', 'PAYMENT', 'REFUND', 'SETTLEMENT'].includes(type)) return { status: 400, body: { ok: false, error: 'Invalid record' } };
//   const conn = await getConnection();
//   try {
//     const st = await checkEditable(conn, type, id);
//     if (!st.editable) return { status: 400, body: { ok: false, error: st.reason } };
//     if (type === 'ADVANCE') {
//       const h = (await qc(conn, `SELECT ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", REFERENCE_NO AS "ref", NVL(ADVANCE_AMOUNT,0) AS "total"
//          FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id }))[0];
//       let lines = await qc(conn, `SELECT ACCOUNT_CODE AS "a", DESCRIPTION AS "d", AMOUNT AS "n" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id ORDER BY LINE_NO`, { id });
//       // older advances may have no saved lines: show one line from the header total
//       if (!lines.length && Number(h.total) > 0) {
//         const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT };
//         lines = [{ a: advAcct.code, d: '', n: h.total }];
//       }
//       return { status: 200, body: { ok: true, type, id, ...h, lines } };
//     }
//     if (type === 'INVOICE') {
//       const h = (await qc(conn, `SELECT INVOICE_NO AS "no", TO_CHAR(INVOICE_DATE,'YYYY-MM-DD') AS "date", TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id }))[0];
//       const lines = await qc(conn, `SELECT ACCOUNT_CODE AS "a", ITEM_DESCRIPTION AS "d", NVL(QTY,1) * NVL(UNIT_PRICE,0) AS "n" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id ORDER BY LINE_NO`, { id });
//       // advance linked when the invoice was created (shown read-only in the edit form)
//       let advNo = null, advanceApplied = 0;
//       if (st.adj.length) {
//         advanceApplied = Number(st.adj[0].applied);
//         advNo = (await qc(conn, `SELECT ADVANCE_NO AS "no" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: st.adj[0].advanceId }))[0].no;
//       }
//       return { status: 200, body: { ok: true, type, id, ...h, lines, advNo, advanceApplied } };
//     }
//     if (type === 'SETTLEMENT') {
//       const h = (await qc(conn, `SELECT JOURNAL_NO AS "no", TO_CHAR(JOURNAL_DATE,'YYYY-MM-DD') AS "date", DESCRIPTION AS "description", NVL(TOTAL_AMOUNT,0) AS "amount" FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id`, { id }))[0];
//       return { status: 200, body: { ok: true, type, id, ...h } };
//     }
//     if (type === 'PAYMENT') {
//       const h = (await qc(conn, `SELECT PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
//               PAYMENT_METHOD AS "method", NVL(TOTAL_AMOUNT,0) AS "total" FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id }))[0];
//       // available = invoice total - advance adjusted - (paid - this payment's line),
//       // i.e. what this payment line could be raised to without overpaying the invoice.
//       const lines = await qc(conn, `SELECT pl.INVOICE_ID AS "invoiceId", pl.APPLIED_AMOUNT AS "amt", i.INVOICE_NO AS "invoiceNo",
//               NVL(i.PAID_AMOUNT,0) AS "paid", NVL(i.ADVANCE_ADJUSTED,0) AS "adv",
//               NVL(i.GROSS_AMOUNT,0) + NVL(i.TAX_AMOUNT,0) AS "invTotal"
//          FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
//         WHERE pl.PAYMENT_ID = :id ORDER BY pl.PAYMENT_LINE_ID`, { id });
//       return { status: 200, body: { ok: true, type, id, ...h, lines } };
//     }
//     const h = (await qc(conn, `SELECT r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date", r.BANK_ACCOUNT_CODE AS "bank", r.PAYMENT_METHOD AS "method", r.REFERENCE_NO AS "ref", r.REMARKS AS "remarks", r.REFUND_AMOUNT AS "amount", r.ADVANCE_ID AS "advanceId" FROM XX_AP_ADVANCE_REFUND_T r WHERE r.REFUND_ID = :id`, { id }))[0];
//     return { status: 200, body: { ok: true, type, id, ...h } };
//   } finally {
//     await conn.close();
//   }
// };

// // run `work` in ONE transaction: lock + guard, do the writes, single commit, rollback on any error
// async function editTx(type, id, work) {
//   const conn = await getConnection();
//   try {
//     const st = await checkEditable(conn, type, id, true);
//     if (!st.editable) { await conn.rollback(); return { status: 400, body: { ok: false, error: st.reason } }; }
//     await work(conn, st);
//     await conn.commit();
//     return { status: 200, body: { ok: true } };
//   } catch (e) {
//     try { await conn.rollback(); } catch (_) { /* ignore */ }
//     return { status: 400, body: { ok: false, error: e.message } };
//   } finally {
//     await conn.close();
//   }
// }

// export const updateAdvance = async (body) => {
//   const id = parseInt(body.advance_id, 10);
//   const date = (body.date || '').trim();
//   const bank = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   const ref = (body.reference_no || '').trim();
//   if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'advance_id, date and bank_account_code are required' } };

//   // Same FK rule as creation: the line account must exist in CHART_OF_ACCOUNT.
//   const advanceAccount = await resolveAdvanceAccount();
//   if (!advanceAccount) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

//   const lines = [];
//   let total = 0;
//   for (const l of Array.isArray(body.lines) ? body.lines : []) {
//     const amt = roundCents(l.amount), d = (l.desc || '').trim();
//     if (amt <= 0) continue;
//     if (!d) return { status: 400, body: { ok: false, error: 'Description is required on every advance line' } };
//     lines.push({ account: advanceAccount.code, desc: d, amount: amt }); total += amt;
//   }
//   total = roundCents(total);
//   if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an amount greater than zero' } };

//   return editTx('ADVANCE', id, async (conn, st) => {
//     const no = st.head.no;
//     await conn.execute(
//       `UPDATE XX_AP_ADVANCE_T SET ADVANCE_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank, PAYMENT_METHOD = :method,
//               REFERENCE_NO = :ref, ADVANCE_AMOUNT = :total, LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :id`,
//       { p_date: date, bank, method, ref, total, id }, TX);
//     await conn.execute(`DELETE FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id }, TX);
//     let n = 0;
//     for (const l of lines) {
//       await conn.execute(
//         `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT)
//          VALUES (XX_AP_ADVANCE_L_S.NEXTVAL, :id, :lno, :acc, :p_desc, :amt)`,
//         { id, lno: ++n, acc: l.account, p_desc: l.desc, amt: l.amount }, TX);
//     }
//     const note = [...new Set(lines.map((x) => x.desc))].join('; ');
//     const jl = lines.map((l) => ({ account: advanceAccount.code, debit: l.amount, desc: l.desc }));
//     jl.push({ account: bank, credit: total, desc: withNote(`Advance ${no} paid`, note) });
//     await rewriteJournalTx(conn, { journalId: st.journal.journalId, journalNo: st.journal.journalNo, date, description: withNote(`Advance payment ${no}`, note) + (ref ? ` (${ref})` : ''), lines: jl });
//   });
// };

// export const updateInvoice = async (body) => {
//   const id = parseInt(body.invoice_id, 10);
//   const date = (body.invoice_date || '').trim();
//   const due = (body.due_date || '').trim() || date;
//   const note = (body.note || '').trim();
//   if (!id || !date) return { status: 400, body: { ok: false, error: 'invoice_id and invoice_date are required' } };
//   if (!note) return { status: 400, body: { ok: false, error: 'Description is required' } };
//   const lines = [];
//   let gross = 0;
//   for (const l of Array.isArray(body.lines) ? body.lines : []) {
//     const amt = Number(l.amount || 0), acc = (l.account || '').trim();
//     if (!acc || amt <= 0) continue;
//     lines.push({ account: acc, desc: (l.desc || '').trim() || note, amount: amt }); gross += amt;
//   }
//   if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

//   return editTx('INVOICE', id, async (conn, st) => {
//     const no = st.head.no;
//     // advance linked when the invoice was created: its applied amount stays the same
//     const applied = st.adj.length ? Number(st.adj[0].applied) : 0;
//     const advAcct = st.adj.length ? await resolveAdvanceAccount() : null;
//     if (st.adj.length && !advAcct) throw new Error(ADVANCE_ACCOUNT_MISSING);
//     await assertAccountsExist([AP_PAYABLE_ACCOUNT, ...lines.map((l) => l.account), advAcct && advAcct.code]);
//     if (gross + 0.001 < applied) throw new Error(`Invoice total cannot be less than the advance already applied (${applied.toFixed(2)}).`);

//     await conn.execute(
//       `UPDATE XX_AP_INVOICE_H_T SET INVOICE_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), DUE_DATE = TO_DATE(:p_due,'YYYY-MM-DD'),
//               GROSS_AMOUNT = :gross, REMARKS = :p_note,
//               STATUS = CASE
//                 WHEN :gross + NVL(TAX_AMOUNT,0) - NVL(ADVANCE_ADJUSTED,0) - NVL(PAID_AMOUNT,0) <= 0 THEN 'Paid'
//                 WHEN NVL(ADVANCE_ADJUSTED,0) + NVL(PAID_AMOUNT,0) > 0 THEN 'Partially Paid'
//                 ELSE 'Draft' END,
//               LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`,
//       { p_date: date, p_due: due, gross, p_note: note, id }, TX);
//     await conn.execute(`DELETE FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id }, TX);
//     let n = 0;
//     for (const l of lines) {
//       await conn.execute(
//         `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
//          VALUES (XX_AP_INVOICE_L_S.NEXTVAL, :id, :lno, :acc, :p_desc, 1, :price)`,
//         { id, lno: ++n, acc: l.account, p_desc: l.desc, price: l.amount }, TX);
//     }

//     // 1st journal: the invoice itself
//     const jl = lines.map((l) => ({ account: l.account, debit: l.amount, desc: l.desc }));
//     jl.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: withNote(`Invoice ${no}`, note) });
//     await rewriteJournalTx(conn, { journalId: st.journals[0].journalId, journalNo: st.journals[0].journalNo, date, description: withNote(`Payable invoice ${no}`, note), lines: jl });

//     // 2nd journal: "Advance ... applied to ..." (only when an advance was linked)
//     if (st.adj.length) {
//       const advNo = (await qc(conn, `SELECT ADVANCE_NO AS "no" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: st.adj[0].advanceId }))[0].no;
//       await rewriteJournalTx(conn, {
//         journalId: st.journals[1].journalId, journalNo: st.journals[1].journalNo, date,
//         description: withNote(`Advance ${advNo} applied to ${no}`, note),
//         lines: [
//           { account: AP_PAYABLE_ACCOUNT, debit: applied, desc: 'Advance applied' },
//           { account: advAcct.code, credit: applied, desc: `Advance ${advNo}` },
//         ],
//       });
//     }
//   });
// };

// // ---------------------------------------------------------------- update a payment
// // Same header, same invoice lines, same journal and GLMASTER row — only their values
// // change. Invoices this payment settles are corrected by the difference between the
// // old and new allocation, exactly like settle() does when the payment is created.
// export const updatePayment = async (body) => {
//   const id = parseInt(body.payment_id, 10);
//   const date = (body.date || '').trim();
//   const bank = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'payment_id, date and bank_account_code are required' } };

//   const lines = [];
//   const seen = new Set();
//   let total = 0;
//   for (const l of Array.isArray(body.lines) ? body.lines : []) {
//     const invoiceId = parseInt(l.invoice_id, 10);
//     const amt = Number(l.amount || 0);
//     if (!invoiceId || !(amt > 0)) continue;
//     if (seen.has(invoiceId)) return { status: 400, body: { ok: false, error: 'Each invoice can only appear once in a payment.' } };
//     seen.add(invoiceId);
//     lines.push({ invoiceId, amount: Math.round(amt * 100) / 100 });
//     total += amt;
//   }
//   total = Math.round(total * 100) / 100;
//   if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one invoice line with an amount greater than zero' } };

//   return editTx('PAYMENT', id, async (conn, st) => {
//     const no = st.head.no;
//     const supplierId = Number(st.head.supplierId);

//     const oldLines = await qc(conn, `SELECT INVOICE_ID AS "invoiceId", APPLIED_AMOUNT AS "amt" FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id });
//     const delta = {};
//     for (const ol of oldLines) delta[Number(ol.invoiceId)] = (delta[Number(ol.invoiceId)] || 0) - Number(ol.amt);
//     for (const l of lines) delta[l.invoiceId] = (delta[l.invoiceId] || 0) + l.amount;

//     for (const [key, change] of Object.entries(delta)) {
//       if (Math.abs(change) < 0.001) continue;
//       const invoiceId = parseInt(key, 10);
//       const inv = (await qc(conn, `SELECT INVOICE_NO AS "no", SUPPLIER_ID AS "supplierId", STATUS AS "status",
//               NVL(PAID_AMOUNT,0) AS "paid", NVL(ADVANCE_ADJUSTED,0) AS "adv",
//               NVL(GROSS_AMOUNT,0) + NVL(TAX_AMOUNT,0) AS "invTotal"
//          FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id FOR UPDATE`, { id: invoiceId }))[0];
//       if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
//       if (inv.status === 'Cancelled') throw new Error(`Invoice ${inv.no} is cancelled`);
//       if (Number(inv.supplierId) !== supplierId) throw new Error(`Invoice ${inv.no} does not belong to this vendor.`);
//       const newPaid = Math.round((Number(inv.paid) + change) * 100) / 100;
//       if (newPaid < -0.001) throw new Error(`Invoice ${inv.no} has less paid than this payment already allocated.`);
//       if (newPaid + Number(inv.adv) > Number(inv.invTotal) + 0.001) throw new Error(`Payment exceeds the balance of invoice ${inv.no}.`);
//       await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = :paid, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { paid: newPaid, id: invoiceId }, TX);
//       await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
//            WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
//            WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
//            ELSE 'Open' END WHERE INVOICE_ID = :id`, { id: invoiceId }, TX);
//     }

//     await conn.execute(
//       `UPDATE XX_AP_PAYMENT_H_T SET PAYMENT_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank,
//               PAYMENT_METHOD = :method, TOTAL_AMOUNT = :total, LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`,
//       { p_date: date, bank, method, total, id }, TX);

//     await conn.execute(`DELETE FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id }, TX);
//     for (const l of lines) {
//       await conn.execute(
//         `INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT)
//          VALUES (XX_AP_PAYMENT_L_S.NEXTVAL, :pid, :iid, :amt)`,
//         { pid: id, iid: l.invoiceId, amt: l.amount }, TX);
//     }

//     const notes = [];
//     for (const l of lines) {
//       const r = (await qc(conn, `SELECT REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: l.invoiceId }))[0];
//       if (r && r.note) notes.push(r.note);
//     }
//     await rewriteJournalTx(conn, {
//       journalId: st.journal.journalId, journalNo: st.journal.journalNo, date,
//       description: withNote(`Settlement ${no}`, [...new Set(notes)].join('; ')),
//       lines: [
//         { account: AP_PAYABLE_ACCOUNT, debit: total, desc: 'Invoices settled' },
//         { account: bank, credit: total, desc: `Payment ${no}` },
//       ],
//     });
//   });
// };

// export const updateRefund = async (body) => {
//   const id = parseInt(body.refund_id, 10);
//   const date = (body.date || '').trim();
//   const bank = (body.bank_account_code || '').trim();
//   if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'refund_id, date and bank_account_code are required' } };
//   const method = body.method || '', ref = (body.reference_no || '').trim(), remarks = (body.remarks || '').trim();

//   return editTx('REFUND', id, async (conn, st) => {
//     const r = (await qc(conn, `SELECT r.REFUND_AMOUNT AS "amount", a.ADVANCE_NO AS "advNo", a.ADVANCE_ID AS "advId" FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID WHERE r.REFUND_ID = :id`, { id }))[0];
//     await conn.execute(
//       `UPDATE XX_AP_ADVANCE_REFUND_T SET REFUND_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank, PAYMENT_METHOD = :method,
//               REFERENCE_NO = :ref, REMARKS = :p_remarks, LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`,
//       { p_date: date, bank, method, ref, p_remarks: remarks, id }, TX);
//     const advAcct = await resolveAdvanceAccount();
//     if (!advAcct) throw new Error(ADVANCE_ACCOUNT_MISSING);
//     await assertAccountsExist([bank, advAcct.code]);
//     const nt = (await qc(conn, `SELECT DISTINCT DESCRIPTION AS "note" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id: r.advId })).map((x) => x.note).filter(Boolean).join('; ');
//     await rewriteJournalTx(conn, {
//       journalId: st.journal.journalId, journalNo: st.journal.journalNo, date,
//       description: withNote(`Advance ${r.advNo} refunded`, nt) + (ref ? ` (${ref})` : ''),
//       lines: [
//         { account: bank, debit: Number(r.amount), desc: withNote(`Refund ${st.head.no}`, nt) },
//         { account: advAcct.code, credit: Number(r.amount), desc: withNote(`Advance ${r.advNo} refunded`, nt) },
//       ],
//     });
//   });
// };

// // ---------------------------------------------------------------- update an advance-only settlement (date only)
// export const updateSettlement = async (body) => {
//   const id = parseInt(body.journal_id, 10);
//   const date = (body.date || '').trim();
//   if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: 400, body: { ok: false, error: 'journal_id and a valid date are required' } };

//   return editTx('SETTLEMENT', id, async (conn, st) => {
//     const h = (await qc(conn, `SELECT DESCRIPTION AS "description" FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id`, { id }))[0];
//     const lines = await qc(conn, `SELECT ACCOUNT_CODE AS "account", DEBIT_AMOUNT AS "debit", CREDIT_AMOUNT AS "credit", DESCRIPTION AS "desc"
//          FROM XX_AP_JOURNAL_L_T WHERE JOURNAL_ID = :id ORDER BY LINE_NO`, { id });
//     if (!lines.length) throw new Error('Journal lines not found for this settlement.');
//     await assertAccountsExist(lines.map((l) => l.account));
//     await rewriteJournalTx(conn, {
//       journalId: id, journalNo: st.journal.journalNo, date, description: h.description,
//       lines: lines.map((l) => ({ account: l.account, debit: Number(l.debit || 0), credit: Number(l.credit || 0), desc: l.desc })),
//     });
//   });
// };

// Accounts Payable routes — a direct port of D:\xampp\htdocs\hms\payable\api.php.
import { getConnection, withConnection, oracledb } from '../../config/db.js';
import { postJournal, isPosted, rewriteJournalTx } from '../gl/service.js';

// Real CHART_OF_ACCOUNT leaf accounts added specifically for this module.
const AP_PAYABLE_ACCOUNT = '3020020000'; // Accounts Payable - Trade (liability)
const AP_ADVANCE_ACCOUNT = '1020120000'; // Advances to Suppliers (asset) — clearing account
// The AR side's equivalent control accounts — excluded from AP's own account pickers.
const AR_RECEIVABLE_ACCOUNT = '1020120000';
const AR_ADVANCE_ACCOUNT = '3020030000';

// XX_AP_ADVANCE_L_T.ACCOUNT_CODE has a foreign key to CHART_OF_ACCOUNT.ACCOUNT_ID
// (XX_AP_ADV_L_ACC_FK2), and so do the AP journal lines. Never assume a hard-coded
// control account exists in the live chart: resolve the Advances-to-Suppliers
// account against CHART_OF_ACCOUNT first, so a missing code cannot surface as a
// raw ORA-02291 and a selected account is always saved as a real ACCOUNT_ID.
const ADVANCE_ACCOUNT_MISSING =
  'No "advances to suppliers" account was found in CHART_OF_ACCOUNT. Set AP_ADVANCE_ACCOUNT_CODE to an existing account code.';
const roundCents = (v) => Math.round((Number(v) || 0) * 100) / 100;
let advanceAccountPromise;
async function resolveAdvanceAccount() {
  if (advanceAccountPromise === undefined) {
    advanceAccountPromise = (async () => {
      const wanted = [...new Set([String(process.env.AP_ADVANCE_ACCOUNT_CODE || '').trim(), AP_ADVANCE_ACCOUNT].filter(Boolean))];
      for (const code of wanted) {
        const rows = await runSelect(
          `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
            WHERE ACCOUNT_ID = :code AND NVL(ENABLED,1) = 1`,
          { code }
        );
        if (rows.length) return { code: String(rows[0].code), name: rows[0].name };
      }
      // The configured/legacy code is not in this chart — use the chart's own
      // advance account if there is exactly one, never a guessed/hard-coded code.
      const rows = await runSelect(
        `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
          WHERE LASTLEVEL = 1 AND NVL(ENABLED,1) = 1 AND NVL(ACCOUNT_TYPE,0) != 1
            AND UPPER(ACCOUNT_NAME) LIKE '%ADVANCE%' ORDER BY ACCOUNT_ID`
      );
      return rows.length === 1 ? { code: String(rows[0].code), name: rows[0].name } : null;
    })().catch(() => null);
  }
  const found = await advanceAccountPromise;
  if (!found) advanceAccountPromise = undefined; // allow a later retry (e.g. account just created)
  return found;
}

// Readable error (instead of a raw ORA-02291) when a journal account code is not in CHART_OF_ACCOUNT.
async function assertAccountsExist(codes) {
  const list = [...new Set(codes.map((c) => String(c || '').trim()).filter(Boolean))];
  if (!list.length) return;
  const binds = {};
  list.forEach((c, i) => { binds['c' + i] = c; });
  const rows = await runSelect(`SELECT ACCOUNT_ID AS "code" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_ID IN (${list.map((_, i) => ':c' + i).join(',')})`, binds);
  const have = new Set(rows.map((r) => String(r.code)));
  const missing = list.filter((c) => !have.has(c));
  if (missing.length) throw new Error(`Account ${missing.join(', ')} was not found in CHART_OF_ACCOUNT.`);
}

// The invoice's Description (stored in REMARKS) is carried into every journal
// description / line so it shows up everywhere (recent activity, GL voucher, reports).
// Capped so it can never overflow a narrow DESCRIPTION column.
const withNote = (base, note) => {
  const n = String(note || '').trim();
  // base text goes inside brackets, the user's description stays outside: (Advance payment ADV-000037) - fish test
  const t = n ? `(${base}) - ${n}` : base;
  return t.length > 150 ? t.slice(0, 147) + '...' : t;
};

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- small DB helpers
// Each helper opens its own pooled connection and always closes it.
async function runSelect(sql, binds = {}) {
  const conn = await getConnection();
  try {
    const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return r.rows || [];
  } finally {
    await conn.close();
  }
}

async function nextVal(seq) {
  const rows = await runSelect(`SELECT ${seq}.NEXTVAL AS "id" FROM DUAL`);
  return rows[0].id;
}

// Single write + commit. Returns { ok, error } and never throws (same best-effort
// behaviour the original per-statement blocks had).
async function runWrite(sql, binds = {}) {
  const conn = await getConnection();
  try {
    await conn.execute(sql, binds);
    await conn.commit();
    return { ok: true };
  } catch (e) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    return { ok: false, error: e.message };
  } finally {
    await conn.close();
  }
}

// Descriptions (REMARKS) of the given invoices, de-duplicated.
async function invoiceNotes(ids) {
  const list = [...new Set((ids || []).map((x) => parseInt(x, 10)).filter(Boolean))];
  if (!list.length) return [];
  const binds = {};
  list.forEach((id, i) => { binds['i' + i] = id; });
  const rows = await runSelect(`SELECT DISTINCT REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID IN (${list.map((_, i) => ':i' + i).join(',')})`, binds);
  return rows.map((r) => r.note).filter(Boolean);
}

// Distinct line descriptions of an advance (what the user typed as "Description").
async function advanceNotes(advanceId) {
  const id = parseInt(advanceId, 10);
  if (!id) return [];
  const rows = await runSelect(`SELECT DISTINCT DESCRIPTION AS "note" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id });
  return rows.map((r) => r.note).filter(Boolean);
}

// ---------------------------------------------------------------- vendors
export const listVendors = async () => {
  const rows = await runSelect(`SELECT SUPPLIER_ID AS "id", SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE STATUS=1 ORDER BY SUPPLIER_NAME`);
  return { status: 200, body: rows };
};

// ---------------------------------------------------------------- chart of accounts
export const getCoa = async () => {
  const advanceAccount = await resolveAdvanceAccount();
  const expense = await runSelect(
    `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
      WHERE LASTLEVEL = 1 AND ENABLED = 1 AND NVL(ACCOUNT_TYPE,0) != 1
        AND ACCOUNT_ID NOT IN (:pay, :apAdv, :arRec, :arAdv) ORDER BY ACCOUNT_NAME`,
    {
      pay: AP_PAYABLE_ACCOUNT,
      apAdv: advanceAccount ? advanceAccount.code : AP_ADVANCE_ACCOUNT,
      arRec: AR_RECEIVABLE_ACCOUNT,
      arAdv: AR_ADVANCE_ACCOUNT,
    }
  );
  const bank = await runSelect(`SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_TYPE = 1 AND ENABLED = 1 ORDER BY ACCOUNT_NAME`);
  // A payable invoice records a real expense — only Expense accounts (code starting '5').
  const invoiceExpense = await runSelect(
    `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
      WHERE LASTLEVEL = 1 AND ENABLED = 1 AND ACCOUNT_ID LIKE '5%' ORDER BY ACCOUNT_NAME`
  );
  // The resolved advance control account, so the UI labels the account that is
  // actually posted instead of assuming the hard-coded code exists.
  return { status: 200, body: { expense, invoiceExpense, bank, advanceAccount } };
};

// ---------------------------------------------------------------- one vendor's full picture
export const getVendor = async (params) => {
  const supplierId = parseInt(params.id, 10);
  if (!supplierId) return { status: 400, body: { ok: false, error: 'id is required' } };

  const sup = await runSelect(`SELECT SUPPLIER_NAME FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId });
  if (!sup.length) return { status: 400, body: { ok: false, error: 'Vendor not found' } };

  const invoiceRows = await runSelect(
    `SELECT INVOICE_ID AS "id", INVOICE_NO AS "no", SUPPLIER_INVOICE_NO AS "supNo",
            TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", TOTAL_AMOUNT AS "total", BALANCE_DUE AS "balance",
            ADVANCE_ADJUSTED AS "advanceAdjusted", PAID_AMOUNT AS "paid", STATUS AS "status", REMARKS AS "note"
       FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY DUE_DATE`,
    { id: supplierId }
  );

  const linkRows = await runSelect(
    `SELECT aa.INVOICE_ID AS "invoiceId", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amt"
       FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
      WHERE a.SUPPLIER_ID = :id`,
    { id: supplierId }
  );
  const linksByInvoice = {};
  for (const l of linkRows) (linksByInvoice[l.invoiceId] ||= []).push({ advNo: l.advNo, amt: Number(l.amt) });
  for (const inv of invoiceRows) inv.links = linksByInvoice[inv.id] || [];

  const advanceRows = await runSelect(
    `SELECT ADVANCE_ID AS "id", ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date",
            ADVANCE_AMOUNT AS "total", ADJUSTED_AMOUNT AS "used", BALANCE_AMOUNT AS "balance", STATUS AS "status"
       FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY ADVANCE_DATE DESC`,
    { id: supplierId }
  );

  const ledgerRows = await runSelect(
    `SELECT h.JOURNAL_ID AS "journalId", h.JOURNAL_NO AS "journalNo", h.SOURCE_ID AS "sourceId",
            h.DESCRIPTION AS "description", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
            h.TOTAL_AMOUNT AS "amount", h.SOURCE_TYPE AS "sourceType"
       FROM XX_AP_JOURNAL_H_T h WHERE h.SUPPLIER_ID = :id ORDER BY h.JOURNAL_ID DESC FETCH FIRST 20 ROWS ONLY`,
    { id: supplierId }
  );
  for (const l of ledgerRows) l.positive = l.sourceType === 'ADVANCE';

  // which ledger rows show the edit pencil.
  // An invoice that had an advance linked at creation owns 2 journals
  // ("Payable invoice ..." and "Advance ... applied to ..."); both rows get the pencil.
  {
    const conn = await getConnection();
    try {
      for (const l of ledgerRows) {
        l.editable = false;
        if (l.sourceType !== 'ADVANCE') continue; // only the advance-creation row is editable from the UI
        // advance-only settlement: journaled with SOURCE_ID = 0, so it is identified by its journal id
        const isSettle = l.sourceType === 'PAYMENT' && Number(l.sourceId) === 0;
        const st = await checkEditable(conn, isSettle ? 'SETTLEMENT' : l.sourceType, isSettle ? Number(l.journalId) : Number(l.sourceId));
        l.editable = st.editable && st.journals.some((j) => Number(j.journalId) === Number(l.journalId));
      }
    } finally {
      await conn.close();
    }
  }

  const paymentRows = await runSelect(
    `SELECT PAYMENT_ID AS "id", PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date",
            TOTAL_AMOUNT AS "total", STATUS AS "status"
       FROM XX_AP_PAYMENT_H_T WHERE SUPPLIER_ID = :id ORDER BY PAYMENT_ID DESC`,
    { id: supplierId }
  );

  // Which payments show the edit pencil. Same rules as checkEditable('PAYMENT'):
  // not cancelled, exactly one journal, not posted to the GL, no advance applied.
  // The update endpoint re-checks them on the locked row before writing.
  if (paymentRows.length) {
    const flags = await runSelect(
      `SELECT p.PAYMENT_ID AS "id",
              CASE WHEN NVL(p.STATUS,'Active') = 'Cancelled' THEN 0
                   WHEN EXISTS (SELECT 1 FROM XX_AP_ADVANCE_ADJUSTMENT_T aa WHERE aa.PAYMENT_ID = p.PAYMENT_ID) THEN 0
                   WHEN (SELECT COUNT(*) FROM XX_AP_JOURNAL_H_T h WHERE h.SOURCE_TYPE = 'PAYMENT' AND h.SOURCE_ID = p.PAYMENT_ID) <> 1 THEN 0
                   WHEN EXISTS (SELECT 1 FROM XX_AP_JOURNAL_H_T h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
                                 WHERE h.SOURCE_TYPE = 'PAYMENT' AND h.SOURCE_ID = p.PAYMENT_ID AND g.POSTED = 1) THEN 0
                   ELSE 1 END AS "editable"
         FROM XX_AP_PAYMENT_H_T p WHERE p.SUPPLIER_ID = :id`,
      { id: supplierId }
    );
    const editableById = {};
    for (const f of flags) editableById[f.id] = Number(f.editable) === 1;
    for (const p of paymentRows) p.editable = !!editableById[p.id];
  }

  {
    const noteRows = await runSelect(
      `SELECT pl.PAYMENT_ID AS "pid", i.REMARKS AS "note"
         FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
        WHERE i.SUPPLIER_ID = :id
       UNION
       SELECT aa.PAYMENT_ID, i.REMARKS
         FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
        WHERE i.SUPPLIER_ID = :id AND aa.PAYMENT_ID IS NOT NULL`,
      { id: supplierId }
    );
    const byPay = {};
    for (const r of noteRows) if (r.note) (byPay[r.pid] ||= []).push(r.note);
    for (const p of paymentRows) p.note = (byPay[p.id] || []).join('; ');
  }

  const refundRows = await runSelect(
    `SELECT r.REFUND_ID AS "id", r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date",
            r.REFUND_AMOUNT AS "amount", r.STATUS AS "status", a.ADVANCE_NO AS "advNo"
       FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
      WHERE a.SUPPLIER_ID = :id ORDER BY r.REFUND_ID DESC`,
    { id: supplierId }
  );

  let outstanding = 0, advanceBalance = 0;
  for (const i of invoiceRows) outstanding += Number(i.balance);
  for (const a of advanceRows) advanceBalance += Number(a.balance);

  return {
    status: 200,
    body: {
      id: supplierId,
      name: sup[0].SUPPLIER_NAME,
      outstanding,
      advanceBalance,
      invoices: invoiceRows,
      advances: advanceRows,
      payments: paymentRows,
      refunds: refundRows,
      ledger: ledgerRows,
    },
  };
};

// ---------------------------------------------------------------- add a vendor
// SUPPLIER_ID comes from the SUPPLIER_AUTONUMBER trigger (SUPPLIER_SEQ); CURRVAL is
// session-scoped so it must be read on the same connection as the insert.
export const createVendor = async (body) => {
  const name = (body.name || '').trim();
  if (!name) return { status: 400, body: { ok: false, error: 'Vendor name is required' } };
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO SUPPLIER_INFO (SUPPLIER_NAME, CONTACT_PERSON, PHONE, EMAIL, ADDRESS, STATUS)
       VALUES (:name, :contact, :phone, :email, :address, 1)`,
      { name, contact: body.contact || null, phone: body.phone || null, email: body.email || null, address: body.address || null }
    );
    const r = await conn.execute(`SELECT SUPPLIER_SEQ.CURRVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const id = (r.rows || [])[0].id;
    await conn.commit();
    return { status: 200, body: { ok: true, id } };
  } catch (e) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    return { status: 400, body: { ok: false, error: e.message } };
  } finally {
    await conn.close();
  }
};

// ---------------------------------------------------------------- record a new advance
// Header + lines are saved in ONE transaction. Line account is always the fixed
// Advances-to-Suppliers control account (the journal debits it too).
export const recordAdvance = async (body) => {
  const supplierId = parseInt(body.supplier_id, 10);
  const date = (body.date || '').trim();
  const bankAccount = (body.bank_account_code || '').trim();
  const method = body.method || '';
  const ref = (body.reference_no || '').trim();
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!supplierId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'supplier_id, date and bank_account_code are required' } };

  // The line account must already exist in CHART_OF_ACCOUNT (FK XX_AP_ADV_L_ACC_FK2).
  const advanceAccount = await resolveAdvanceAccount();
  if (!advanceAccount) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

  const validLines = [];
  let total = 0;
  for (const l of lines) {
    const amt = roundCents(l.amount);
    if (amt <= 0) continue;
    const d = (l.desc || '').trim();
    if (!d) return { status: 400, body: { ok: false, error: 'Description is required on every advance line' } };
    validLines.push({ account: advanceAccount.code, desc: d, amount: amt });
    total += amt;
  }
  total = roundCents(total);
  if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an amount greater than zero' } };

  const o = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
  let advanceId, advanceNo;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT XX_AP_ADVANCE_S.NEXTVAL AS "id" FROM DUAL`, {}, o);
      advanceId = (r.rows || [])[0].id;
      advanceNo = 'ADV-' + String(advanceId).padStart(6, '0');
      await conn.execute(
        `INSERT INTO XX_AP_ADVANCE_T (ADVANCE_ID, ADVANCE_NO, SUPPLIER_ID, ADVANCE_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, ADVANCE_AMOUNT)
         VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :total)`,
        { id: advanceId, no: advanceNo, sid: supplierId, p_date: date, bank: bankAccount, method, ref, total }, o);
      let n = 0;
      for (const line of validLines) {
        await conn.execute(
          `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT)
           VALUES (XX_AP_ADVANCE_L_S.NEXTVAL, :aid, :lno, :acc, :p_desc, :amt)`,
          { aid: advanceId, lno: ++n, acc: line.account, p_desc: line.desc, amt: line.amount }, o);
      }
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      return { status: 400, body: { ok: false, error: e.message } };
    } finally {
      await conn.close();
    }
  }

  const advNote = [...new Set(validLines.map((x) => x.desc))].join('; ');
  const journalLines = validLines.map((l) => ({ account: advanceAccount.code, debit: l.amount, desc: l.desc }));
  journalLines.push({ account: bankAccount, credit: total, desc: withNote(`Advance ${advanceNo} paid`, advNote) });
  const jrn = await postJournal('AP', 'ADVANCE', advanceId, supplierId, date, withNote(`Advance payment ${advanceNo}`, advNote) + (ref ? ` (${ref})` : ''), journalLines);

  if (!jrn.ok) {
    // never keep a half-saved advance
    const conn = await getConnection();
    try {
      await conn.execute(`DELETE FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id: advanceId }, o);
      await conn.execute(`DELETE FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }, o);
      await conn.commit();
    } catch (_) {
      try { await conn.rollback(); } catch (__) { /* ignore */ }
    } finally {
      await conn.close();
    }
    return { status: 400, body: { ok: false, error: jrn.error || 'Journal posting failed' } };
  }

  return { status: 200, body: { ok: true, advanceId, advanceNo, total, journalOk: true } };
};

// ---------------------------------------------------------------- save a new payable invoice (optionally linking an advance)
export const saveInvoice = async (body) => {
  const supplierId = parseInt(body.supplier_id, 10);
  const invoiceNo = (body.invoice_no || '').trim();
  const invoiceDate = (body.invoice_date || '').trim();
  const dueDate = (body.due_date || '').trim() || invoiceDate;
  const note = (body.note || '').trim();
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const linkAdvanceId = parseInt(body.link_advance_id, 10) || 0;
  const applyAmount = Number(body.apply_amount || 0);

  if (!supplierId || !invoiceDate) return { status: 400, body: { ok: false, error: 'supplier_id and invoice_date are required' } };
  if (!invoiceNo) return { status: 400, body: { ok: false, error: 'Invoice number is required' } };
  if (!note) return { status: 400, body: { ok: false, error: 'Description is required' } };

  const dup = await runSelect(`SELECT 1 FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :sid AND UPPER(INVOICE_NO) = UPPER(:no)`, { sid: supplierId, no: invoiceNo });
  if (dup.length) return { status: 400, body: { ok: false, error: `${invoiceNo} already exists for this vendor` } };

  const validLines = [];
  let gross = 0;
  for (const l of lines) {
    const amt = Number(l.amount || 0);
    const acc = (l.account || '').trim();
    if (!acc || amt <= 0) continue;
    validLines.push({ account: acc, desc: (l.desc || '').trim() || note, amount: amt });
    gross += amt;
  }
  if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

  let advance = null;
  if (linkAdvanceId) {
    const advRows = await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id AND SUPPLIER_ID = :sid`, { id: linkAdvanceId, sid: supplierId });
    advance = advRows[0] || null;
    if (!advance) return { status: 400, body: { ok: false, error: 'Selected advance not found for this vendor' } };
    if (!(await resolveAdvanceAccount())) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };
    if (applyAmount <= 0) return { status: 400, body: { ok: false, error: 'Enter an amount to apply from the linked advance' } };
    if (applyAmount > Math.min(Number(advance.BALANCE_AMOUNT), gross) + 0.001) {
      return { status: 400, body: { ok: false, error: 'Apply amount exceeds the advance balance or the invoice total' } };
    }
  }

  const invoiceId = await nextVal('XX_AP_INVOICE_H_S');
  const head = await runWrite(
    `INSERT INTO XX_AP_INVOICE_H_T (INVOICE_ID, INVOICE_NO, SUPPLIER_ID, INVOICE_DATE, DUE_DATE, GROSS_AMOUNT, REMARKS)
     VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), TO_DATE(:p_due,'YYYY-MM-DD'), :gross, :p_note)`,
    { id: invoiceId, no: invoiceNo, sid: supplierId, p_date: invoiceDate, p_due: dueDate, gross, p_note: note }
  );
  if (!head.ok) return { status: 400, body: { ok: false, error: head.error } };

  let lineNo = 1;
  const journalLines = [];
  for (const line of validLines) {
    const lineId = await nextVal('XX_AP_INVOICE_L_S');
    await runWrite(
      `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
       VALUES (:id, :iid, :lno, :acc, :p_desc, 1, :price)`,
      { id: lineId, iid: invoiceId, lno: lineNo, acc: line.account, p_desc: line.desc, price: line.amount }
    );
    journalLines.push({ account: line.account, debit: line.amount, desc: line.desc });
    lineNo++;
  }
  journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: withNote(`Invoice ${invoiceNo}`, note) });
  await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, withNote(`Payable invoice ${invoiceNo}`, note), journalLines);

  if (advance && applyAmount > 0) {
    const adjId = await nextVal('XX_AP_ADV_ADJ_S');
    await runWrite(
      `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT) VALUES (:id, :aid, :iid, :amt)`,
      { id: adjId, aid: advance.ADVANCE_ID, iid: invoiceId, amt: applyAmount }
    );
    await runWrite(
      `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
         STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
         LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :aid`,
      { amt: applyAmount, aid: advance.ADVANCE_ID }
    );
    await runWrite(
      `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = :amt,
         STATUS = CASE WHEN GROSS_AMOUNT - :amt <= 0 THEN 'Paid' ELSE 'Partially Paid' END,
         LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
      { amt: applyAmount, iid: invoiceId }
    );
    await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, withNote(`Advance ${advance.ADVANCE_NO} applied to ${invoiceNo}`, note), [
      { account: AP_PAYABLE_ACCOUNT, debit: applyAmount, desc: 'Advance applied' },
      { account: (await resolveAdvanceAccount()).code, credit: applyAmount, desc: `Advance ${advance.ADVANCE_NO}` },
    ]);
  }

  return { status: 200, body: { ok: true, invoiceId, invoiceNo, total: gross, appliedFromAdvance: advance ? applyAmount : 0, advanceNo: advance ? advance.ADVANCE_NO : null } };
};

// ---------------------------------------------------------------- settle selected invoices
export const settle = async (body) => {
  const supplierId = parseInt(body.supplier_id, 10);
  const date = (body.date || '').trim();
  const method = body.method || '';
  const bankAccount = (body.bank_account_code || '').trim();
  const applications = Array.isArray(body.applications) ? body.applications : [];

  if (!supplierId || !date) return { status: 400, body: { ok: false, error: 'supplier_id and date are required' } };

  let totalPayNow = 0, totalFromAdvance = 0;
  for (const a of applications) {
    totalPayNow += Number(a.payNow || 0);
    totalFromAdvance += Number(a.fromAdvance || 0);
  }
  if (totalPayNow > 0 && !bankAccount) return { status: 400, body: { ok: false, error: 'Select a Paid From account for the cash portion' } };
  if (totalPayNow <= 0 && totalFromAdvance <= 0) return { status: 400, body: { ok: false, error: 'Nothing to settle' } };
  const advAcct = totalFromAdvance > 0 ? await resolveAdvanceAccount() : null;
  if (totalFromAdvance > 0 && !advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

  const openAdvances = await runSelect(
    `SELECT ADVANCE_ID, BALANCE_AMOUNT FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :sid AND STATUS != 'Cancelled' AND BALANCE_AMOUNT > 0 ORDER BY ADVANCE_DATE, ADVANCE_ID`,
    { sid: supplierId }
  );
  const availableAdvance = openAdvances.reduce((s, a) => s + Number(a.BALANCE_AMOUNT), 0);
  if (totalFromAdvance > availableAdvance + 0.001) return { status: 400, body: { ok: false, error: 'Requested advance offset exceeds available advance balance' } };

  let paymentId = null, paymentNo = null;
  if (totalPayNow > 0) {
    paymentId = await nextVal('XX_AP_PAYMENT_H_S');
    paymentNo = 'PAY-' + String(paymentId).padStart(6, '0');
    const r = await runWrite(
      `INSERT INTO XX_AP_PAYMENT_H_T (PAYMENT_ID, PAYMENT_NO, SUPPLIER_ID, PAYMENT_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, TOTAL_AMOUNT)
       VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :total)`,
      { id: paymentId, no: paymentNo, sid: supplierId, p_date: date, bank: bankAccount, method, total: totalPayNow }
    );
    if (!r.ok) return { status: 400, body: { ok: false, error: r.error } };
  }

  const advanceRemaining = openAdvances.map((a) => ({ ...a }));
  for (const a of applications) {
    const invoiceId = parseInt(a.invoiceId, 10);
    const payNow = Number(a.payNow || 0);
    const fromAdvance = Number(a.fromAdvance || 0);
    if (!invoiceId || (payNow <= 0 && fromAdvance <= 0)) continue;

    if (payNow > 0 && paymentId) {
      const lineId = await nextVal('XX_AP_PAYMENT_L_S');
      await runWrite(`INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT) VALUES (:id, :pid, :iid, :amt)`, { id: lineId, pid: paymentId, iid: invoiceId, amt: payNow });
      await runWrite(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: payNow, iid: invoiceId });
    }

    if (fromAdvance > 0) {
      let left = fromAdvance;
      for (const adv of advanceRemaining) {
        if (left <= 0) break;
        const take = Math.min(left, Number(adv.BALANCE_AMOUNT));
        if (take <= 0) continue;
        const adjId = await nextVal('XX_AP_ADV_ADJ_S');
        await runWrite(
          `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT, PAYMENT_ID) VALUES (:id, :advid, :iid, :amt, :pid)`,
          { id: adjId, advid: adv.ADVANCE_ID, iid: invoiceId, amt: take, pid: paymentId }
        );
        await runWrite(
          `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
             STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
             LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
          { amt: take, advid: adv.ADVANCE_ID }
        );
        await runWrite(`UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: take, iid: invoiceId });
        adv.BALANCE_AMOUNT = Number(adv.BALANCE_AMOUNT) - take;
        left -= take;
      }
    }

    await runWrite(
      `UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
         WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
         WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
         ELSE STATUS END WHERE INVOICE_ID = :iid`,
      { iid: invoiceId }
    );
  }

  const journalLines = [];
  if (totalPayNow + totalFromAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, debit: totalPayNow + totalFromAdvance, desc: 'Invoices settled' });
  if (totalPayNow > 0) journalLines.push({ account: bankAccount, credit: totalPayNow, desc: paymentNo || 'Payment' });
  if (totalFromAdvance > 0) journalLines.push({ account: advAcct.code, credit: totalFromAdvance, desc: 'Advance applied' });
  const settleNotes = await invoiceNotes(applications.map((a) => parseInt(a.invoiceId, 10)));
  await postJournal('AP', 'PAYMENT', paymentId || 0, supplierId, date, withNote('Settlement' + (paymentNo ? ` ${paymentNo}` : ''), settleNotes.join('; ')), journalLines);

  return { status: 200, body: { ok: true, paymentNo, totalPayNow, totalFromAdvance } };
};

// ---------------------------------------------------------------- cancel an invoice
export const cancelInvoice = async (body) => {
  const invoiceId = parseInt(body.invoice_id, 10);
  if (!invoiceId) return { status: 400, body: { ok: false, error: 'invoice_id is required' } };

  const invoice = (await runSelect(`SELECT * FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: invoiceId }))[0];
  if (!invoice) return { status: 400, body: { ok: false, error: 'Invoice not found' } };
  if (invoice.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Invoice is already cancelled' } };
  if (Number(invoice.PAID_AMOUNT) > 0) return { status: 400, body: { ok: false, error: 'This invoice has cash payments recorded — cancel the related payment(s) first.' } };
  if (await isPosted('AP', 'INVOICE', invoiceId)) return { status: 400, body: { ok: false, error: 'This invoice has already been posted to the general ledger and can no longer be cancelled.' } };

  const adjustments = await runSelect(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id`, { id: invoiceId });
  for (const adj of adjustments) {
    if (adj.PAYMENT_ID !== null) return { status: 400, body: { ok: false, error: 'This invoice has an advance applied via a payment — cancel that payment first.' } };
  }

  for (const adj of adjustments) {
    await runWrite(
      `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
         STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
         LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
      { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
    );
    await runWrite(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
  }

  const lines = await runSelect(`SELECT ACCOUNT_CODE AS "code", LINE_AMOUNT AS "amount", ITEM_DESCRIPTION AS "desc" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id: invoiceId });
  const journalLines = [{ account: AP_PAYABLE_ACCOUNT, debit: Number(invoice.GROSS_AMOUNT) + Number(invoice.TAX_AMOUNT), desc: 'Invoice cancelled' }];
  for (const l of lines) journalLines.push({ account: l.code, credit: l.amount, desc: l.desc });
  await postJournal('AP', 'INVOICE', invoiceId, invoice.SUPPLIER_ID, today(), withNote(`Invoice ${invoice.INVOICE_NO} cancelled`, invoice.REMARKS), journalLines);

  await runWrite(`UPDATE XX_AP_INVOICE_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { id: invoiceId });

  return { status: 200, body: { ok: true, invoiceNo: invoice.INVOICE_NO } };
};

// ---------------------------------------------------------------- cancel a payment
export const cancelPayment = async (body) => {
  const paymentId = parseInt(body.payment_id, 10);
  if (!paymentId) return { status: 400, body: { ok: false, error: 'payment_id is required' } };

  const payment = (await runSelect(`SELECT * FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: paymentId }))[0];
  if (!payment) return { status: 400, body: { ok: false, error: 'Payment not found' } };
  if (payment.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Payment is already cancelled' } };
  if (await isPosted('AP', 'PAYMENT', paymentId)) return { status: 400, body: { ok: false, error: 'This payment has already been posted to the general ledger and can no longer be cancelled.' } };

  const payLines = await runSelect(`SELECT * FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id: paymentId });
  const advAdjustments = await runSelect(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id: paymentId });
  const advAcct = advAdjustments.length ? await resolveAdvanceAccount() : null;
  if (advAdjustments.length && !advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

  let totalCash = 0, totalAdvance = 0;

  for (const pl of payLines) {
    totalCash += Number(pl.APPLIED_AMOUNT);
    await runWrite(
      `UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT - :amt,
         STATUS = CASE
           WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - (PAID_AMOUNT - :amt) <= 0 THEN 'Paid'
           WHEN ADVANCE_ADJUSTED + (PAID_AMOUNT - :amt) > 0 THEN 'Partially Paid'
           ELSE 'Draft' END,
         LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
      { amt: pl.APPLIED_AMOUNT, iid: pl.INVOICE_ID }
    );
  }

  for (const adj of advAdjustments) {
    totalAdvance += Number(adj.ADJUSTED_AMOUNT);
    await runWrite(
      `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
         STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
         LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
      { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
    );
    await runWrite(
      `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED - :amt,
         STATUS = CASE
           WHEN GROSS_AMOUNT + TAX_AMOUNT - (ADVANCE_ADJUSTED - :amt) - PAID_AMOUNT <= 0 THEN 'Paid'
           WHEN (ADVANCE_ADJUSTED - :amt) + PAID_AMOUNT > 0 THEN 'Partially Paid'
           ELSE 'Draft' END,
         LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
      { amt: adj.ADJUSTED_AMOUNT, iid: adj.INVOICE_ID }
    );
    await runWrite(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
  }

  const journalLines = [];
  if (totalCash + totalAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: totalCash + totalAdvance, desc: 'Settlement reversed' });
  if (totalCash > 0) journalLines.push({ account: payment.BANK_ACCOUNT_CODE, debit: totalCash, desc: `Payment ${payment.PAYMENT_NO} cancelled` });
  if (totalAdvance > 0) journalLines.push({ account: advAcct.code, debit: totalAdvance, desc: 'Advance restored' });
  const cancelNotes = await invoiceNotes([...payLines.map((x) => x.INVOICE_ID), ...advAdjustments.map((x) => x.INVOICE_ID)]);
  if (journalLines.length) await postJournal('AP', 'PAYMENT', paymentId, payment.SUPPLIER_ID, today(), withNote(`Payment ${payment.PAYMENT_NO} cancelled`, cancelNotes.join('; ')), journalLines);

  await runWrite(`UPDATE XX_AP_PAYMENT_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`, { id: paymentId });

  return { status: 200, body: { ok: true, paymentNo: payment.PAYMENT_NO } };
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

  const advance = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }))[0];
  if (!advance) return { status: 400, body: { ok: false, error: 'Advance not found' } };
  if (advance.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'This advance is cancelled' } };
  if (amount > Number(advance.BALANCE_AMOUNT) + 0.001) return { status: 400, body: { ok: false, error: 'Refund amount exceeds the available (unadjusted) advance balance' } };
  const advAcct = await resolveAdvanceAccount();
  if (!advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

  const refundId = await nextVal('XX_AP_ADV_REFUND_S');
  const refundNo = 'REF-' + String(refundId).padStart(6, '0');

  const ins = await runWrite(
    `INSERT INTO XX_AP_ADVANCE_REFUND_T (REFUND_ID, REFUND_NO, ADVANCE_ID, REFUND_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, REFUND_AMOUNT, REMARKS)
     VALUES (:id, :no, :advid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :amt, :p_remarks)`,
    { id: refundId, no: refundNo, advid: advanceId, p_date: date, bank: bankAccount, method, ref, amt: amount, p_remarks: remarks }
  );
  if (!ins.ok) return { status: 400, body: { ok: false, error: ins.error } };

  await runWrite(
    `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT + :amt,
       STATUS = CASE
         WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT + :amt) > 0 THEN 'Partially Adjusted'
         WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted'
         ELSE 'Refunded' END,
       LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
    { amt: amount, advid: advanceId }
  );

  const refNote = (await advanceNotes(advanceId)).join('; ');
  const jrn = await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, date, withNote(`Advance ${advance.ADVANCE_NO} refunded`, refNote), [
    { account: bankAccount, debit: amount, desc: withNote(`Refund ${refundNo}`, refNote) },
    { account: advAcct.code, credit: amount, desc: withNote(`Advance ${advance.ADVANCE_NO} refunded`, refNote) },
  ]);

  return { status: 200, body: { ok: true, refundId, refundNo, amount, journalOk: jrn.ok } };
};

// ---------------------------------------------------------------- cancel an advance refund
export const cancelRefund = async (body) => {
  const refundId = parseInt(body.refund_id, 10);
  if (!refundId) return { status: 400, body: { ok: false, error: 'refund_id is required' } };

  const refund = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id`, { id: refundId }))[0];
  if (!refund) return { status: 400, body: { ok: false, error: 'Refund not found' } };
  if (refund.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Refund is already cancelled' } };
  if (await isPosted('AP', 'REFUND', refundId)) return { status: 400, body: { ok: false, error: 'This refund has already been posted to the general ledger and can no longer be cancelled.' } };

  const advance = (await runSelect(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: refund.ADVANCE_ID }))[0];
  if (!advance) return { status: 400, body: { ok: false, error: 'Related advance not found' } };
  const advAcct = await resolveAdvanceAccount();
  if (!advAcct) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

  await runWrite(
    `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT - :amt,
       STATUS = CASE
         WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT - :amt) <= 0 THEN
           CASE WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted' ELSE 'Refunded' END
         WHEN ADJUSTED_AMOUNT > 0 OR (REFUNDED_AMOUNT - :amt) > 0 THEN 'Partially Adjusted'
         ELSE 'Open' END,
       LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
    { amt: refund.REFUND_AMOUNT, advid: refund.ADVANCE_ID }
  );

  const cancelRefNote = (await advanceNotes(refund.ADVANCE_ID)).join('; ');
  await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, today(), withNote(`Refund ${refund.REFUND_NO} cancelled`, cancelRefNote), [
    { account: advAcct.code, debit: refund.REFUND_AMOUNT, desc: withNote('Advance refund reversed', cancelRefNote) },
    { account: refund.BANK_ACCOUNT_CODE, credit: refund.REFUND_AMOUNT, desc: withNote(`Refund ${refund.REFUND_NO} cancelled`, cancelRefNote) },
  ]);

  await runWrite(`UPDATE XX_AP_ADVANCE_REFUND_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`, { id: refundId });

  return { status: 200, body: { ok: true, refundNo: refund.REFUND_NO } };
};

// ---------------------------------------------------------------- read-only transaction details (view / print / excel)
const VIEW_TYPES = ['INVOICE', 'ADVANCE', 'PAYMENT', 'REFUND'];

export const getTransaction = async (params, query = {}) => {
  const sourceType = String(params.sourceType || '').toUpperCase();
  if (!VIEW_TYPES.includes(sourceType)) return { status: 400, body: { ok: false, error: 'sourceType must be INVOICE, ADVANCE, PAYMENT or REFUND' } };
  const sourceId = parseInt(params.sourceId, 10);
  if (Number.isNaN(sourceId) || sourceId < 0) return { status: 400, body: { ok: false, error: 'Invalid sourceId' } };
  const journalId = parseInt(query.journalId, 10) || 0;

  let title = '', status = '', date = '', supplierId = null, note = '', fields = null, invoiceForm = null;
  let summary = [];
  const sections = [];

  if (sourceType === 'INVOICE') {
    const h = (await runSelect(
      `SELECT INVOICE_NO AS "no", TO_CHAR(INVOICE_DATE,'YYYY-MM-DD') AS "date", TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due",
              NVL(GROSS_AMOUNT,0) AS "gross", NVL(TAX_AMOUNT,0) AS "tax", NVL(PAID_AMOUNT,0) AS "paid",
              NVL(ADVANCE_ADJUSTED,0) AS "adv", NVL(BALANCE_DUE,0) AS "balance", STATUS AS "status",
              REMARKS AS "note", SUPPLIER_ID AS "supplierId"
         FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: sourceId }))[0];
    if (!h) return { status: 404, body: { ok: false, error: 'Invoice not found' } };
    title = `Invoice ${h.no}`; status = h.status; date = h.date; supplierId = h.supplierId;
    summary = [
      { label: 'Invoice date', value: h.date }, { label: 'Due date', value: h.due },
      { label: 'Gross amount', value: h.gross, money: true }, { label: 'Tax', value: h.tax, money: true },
      { label: 'Paid (cash)', value: h.paid, money: true }, { label: 'Advance adjusted', value: h.adv, money: true },
      { label: 'Balance due', value: h.balance, money: true }, { label: 'Description', value: h.note || '-' },
    ];
    const lines = await runSelect(
      `SELECT l.LINE_NO AS "lineNo", l.ACCOUNT_CODE AS "account", c.ACCOUNT_NAME AS "accountName",
              l.ITEM_DESCRIPTION AS "desc", l.QTY AS "qty", l.UNIT_PRICE AS "price"
         FROM XX_AP_INVOICE_L_T l LEFT JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = l.ACCOUNT_CODE
        WHERE l.INVOICE_ID = :id ORDER BY l.LINE_NO`, { id: sourceId });
    sections.push({
      title: 'Invoice lines',
      columns: [{ key: 'lineNo', label: '#' }, { key: 'account', label: 'Account' }, { key: 'desc', label: 'Description' }, { key: 'amount', label: 'Amount', money: true }],
      rows: lines.map((l) => ({ lineNo: l.lineNo, account: `${l.account}${l.accountName ? ' · ' + l.accountName : ''}`, desc: l.desc || '', amount: num(l.qty || 1) * num(l.price) })),
    });
    const adj = await runSelect(
      `SELECT a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amount"
         FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
        WHERE aa.INVOICE_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
    sections.push({ title: 'Advance adjustments', columns: [{ key: 'advNo', label: 'Advance' }, { key: 'amount', label: 'Applied', money: true }], rows: adj });
    const pays = await runSelect(
      `SELECT p.PAYMENT_NO AS "payNo", TO_CHAR(p.PAYMENT_DATE,'YYYY-MM-DD') AS "date", p.STATUS AS "status", pl.APPLIED_AMOUNT AS "amount"
         FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_PAYMENT_H_T p ON p.PAYMENT_ID = pl.PAYMENT_ID
        WHERE pl.INVOICE_ID = :id ORDER BY p.PAYMENT_ID`, { id: sourceId });
    sections.push({
      title: 'Cash payments',
      columns: [{ key: 'payNo', label: 'Payment' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Applied', money: true }],
      rows: pays.map((p) => ({ ...p, status: p.status || 'Active' })),
    });
    // Read-only copy of the invoice entry form (same fields the user typed), shown for every journal row of this invoice.
    {
      const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
      const formLines = lines.map((l) => ({ account: l.account, accountName: l.accountName || '', desc: l.desc || '', amount: num(l.qty || 1) * num(l.price) }));
      const total = formLines.reduce((t, l) => t + l.amount, 0);
      const applied = adj.reduce((t, a) => t + num(a.amount), 0);
      const advNos = adj.map((a) => a.advNo).join(', ');
      const rows = formLines.map((l) => ({ label: `${l.account}${l.accountName ? ' · ' + l.accountName : ''}`, dr: l.amount, cr: 0 }));
      rows.push({ label: `${AP_PAYABLE_ACCOUNT} · Accounts Payable - Trade`, dr: 0, cr: total, isCredit: true });
      let previewTotal = total;
      if (applied > 0) {
        previewTotal = total + applied;
        rows.push({ label: `${AP_PAYABLE_ACCOUNT} · Accounts Payable - Trade (advance applied)`, dr: applied, cr: 0 });
        rows.push({ label: `${advAcct.code} · ${advAcct.name} (${advNos})`, dr: 0, cr: applied, isCredit: true });
      }
      invoiceForm = {
        no: h.no, date: h.date, due: h.due, note: h.note || '',
        lines: formLines, total,
        advance: applied > 0 ? { no: advNos, applied } : null,
        preview: { rows, total: previewTotal },
      };
    }
  }

  if (sourceType === 'ADVANCE') {
    const h = (await runSelect(
      `SELECT ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
              PAYMENT_METHOD AS "method", REFERENCE_NO AS "ref", NVL(ADVANCE_AMOUNT,0) AS "total",
              NVL(ADJUSTED_AMOUNT,0) AS "adjusted", NVL(REFUNDED_AMOUNT,0) AS "refunded",
              NVL(BALANCE_AMOUNT,0) AS "balance", STATUS AS "status", SUPPLIER_ID AS "supplierId"
         FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: sourceId }))[0];
    if (!h) return { status: 404, body: { ok: false, error: 'Advance not found' } };
    title = `Advance ${h.no}`; status = h.status; date = h.date; supplierId = h.supplierId;
    const bankName = h.bank ? ((await runSelect(`SELECT ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_ID = :c`, { c: h.bank }))[0] || {}).name : '';
    fields = [
      { label: 'Paid from account', value: h.bank ? `${h.bank}${bankName ? ' · ' + bankName : ''}` : '-' },
      { label: 'Payment date', value: h.date || '-' },
      { label: 'Method', value: h.method || '-' },
      { label: 'Reference', value: h.ref || '-' },
    ];
    summary = [
      { label: 'Advance amount', value: h.total, money: true }, { label: 'Adjusted to invoices', value: h.adjusted, money: true },
      { label: 'Refunded', value: h.refunded, money: true }, { label: 'Balance', value: h.balance, money: true },
    ];
    let lines = await runSelect(
      `SELECT l.LINE_NO AS "lineNo", l.ACCOUNT_CODE AS "account", l.DESCRIPTION AS "desc", l.AMOUNT AS "amount"
         FROM XX_AP_ADVANCE_L_T l WHERE l.ADVANCE_ID = :id ORDER BY l.LINE_NO`, { id: sourceId });
    // Older advances may have no saved lines; show one line from the header total instead.
    const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
    if (!lines.length && num(h.total) > 0) lines = [{ lineNo: 1, account: advAcct.code, desc: '', amount: h.total }];
    sections.push({
      title: 'Advance lines',
      columns: [{ key: 'account', label: 'Account' }, { key: 'desc', label: 'Description' }, { key: 'amount', label: 'Amount', money: true }],
      rows: lines.map((l) => ({ account: `${advAcct.code} · ${advAcct.name}`, desc: l.desc || '', amount: num(l.amount) })),
      footer: { label: 'Total advance', value: lines.reduce((t, l) => t + num(l.amount), 0) },
    });
    const applied = await runSelect(
      `SELECT i.INVOICE_NO AS "invNo", aa.ADJUSTED_AMOUNT AS "amount"
         FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
        WHERE aa.ADVANCE_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
    sections.push({ title: 'Applied to invoices', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'amount', label: 'Applied', money: true }], rows: applied });
    const refunds = await runSelect(
      `SELECT REFUND_NO AS "refNo", TO_CHAR(REFUND_DATE,'YYYY-MM-DD') AS "date", STATUS AS "status", REFUND_AMOUNT AS "amount"
         FROM XX_AP_ADVANCE_REFUND_T WHERE ADVANCE_ID = :id ORDER BY REFUND_ID`, { id: sourceId });
    sections.push({
      title: 'Refunds',
      columns: [{ key: 'refNo', label: 'Refund' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount', money: true }],
      rows: refunds.map((r) => ({ ...r, status: r.status || 'Active' })),
    });
  }

  if (sourceType === 'PAYMENT') {
    const h = sourceId > 0 ? (await runSelect(
      `SELECT PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
              PAYMENT_METHOD AS "method", NVL(TOTAL_AMOUNT,0) AS "total", STATUS AS "status", SUPPLIER_ID AS "supplierId"
         FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: sourceId }))[0] : null;
    if (h) {
      title = `Payment ${h.no}`; status = h.status || 'Active'; date = h.date; supplierId = h.supplierId;
      summary = [
        { label: 'Date', value: h.date }, { label: 'Paid from', value: h.bank || '-' },
        { label: 'Method', value: h.method || '-' }, { label: 'Cash amount', value: h.total, money: true },
      ];
      const pn = await runSelect(
        `SELECT i.REMARKS AS "note" FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID WHERE pl.PAYMENT_ID = :id
         UNION
         SELECT i.REMARKS FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID WHERE aa.PAYMENT_ID = :id`,
        { id: sourceId }
      );
      const pnText = pn.map((r) => r.note).filter(Boolean).join('; ');
      if (pnText) summary.push({ label: 'Description', value: pnText });
      const paid = await runSelect(
        `SELECT i.INVOICE_NO AS "invNo", pl.APPLIED_AMOUNT AS "amount"
           FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
          WHERE pl.PAYMENT_ID = :id ORDER BY pl.PAYMENT_LINE_ID`, { id: sourceId });
      sections.push({ title: 'Invoices paid (cash)', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'amount', label: 'Applied', money: true }], rows: paid });
      const advPart = await runSelect(
        `SELECT i.INVOICE_NO AS "invNo", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amount"
           FROM XX_AP_ADVANCE_ADJUSTMENT_T aa
           JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = aa.INVOICE_ID
           JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
          WHERE aa.PAYMENT_ID = :id ORDER BY aa.ADJUSTMENT_ID`, { id: sourceId });
      sections.push({ title: 'Advance portions', columns: [{ key: 'invNo', label: 'Invoice' }, { key: 'advNo', label: 'Advance' }, { key: 'amount', label: 'Applied', money: true }], rows: advPart });
    } else {
      // Advance-only settlement: settle() journals it with SOURCE_ID = 0 and creates no payment header.
      if (!journalId) return { status: 400, body: { ok: false, error: 'journalId is required for an advance-only settlement' } };
      title = 'Advance-only settlement';
      note = 'Advance-only settlement (no cash payment). Only the journal entry is available for this record.';
    }
  }

  if (sourceType === 'REFUND') {
    const h = (await runSelect(
      `SELECT r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date", r.BANK_ACCOUNT_CODE AS "bank",
              r.PAYMENT_METHOD AS "method", r.REFERENCE_NO AS "ref", NVL(r.REFUND_AMOUNT,0) AS "amount",
              r.REMARKS AS "remarks", r.STATUS AS "status", a.ADVANCE_NO AS "advNo", a.SUPPLIER_ID AS "supplierId"
         FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
        WHERE r.REFUND_ID = :id`, { id: sourceId }))[0];
    if (!h) return { status: 404, body: { ok: false, error: 'Refund not found' } };
    title = `Refund ${h.no}`; status = h.status || 'Active'; date = h.date; supplierId = h.supplierId;
    summary = [
      { label: 'Date', value: h.date }, { label: 'Advance', value: h.advNo },
      { label: 'Refunded to', value: h.bank || '-' }, { label: 'Method', value: h.method || '-' },
      { label: 'Reference', value: h.ref || '-' }, { label: 'Refund amount', value: h.amount, money: true },
      { label: 'Remarks', value: h.remarks || '-' },
    ];
  }

  // ---- journals: every journal for this source, so cancellation reversals show up too ----
  const jWhere = journalId ? `h.JOURNAL_ID = :jid AND h.SOURCE_TYPE = :st` : `h.SOURCE_TYPE = :st AND h.SOURCE_ID = :sid`;
  const jBinds = journalId ? { jid: journalId, st: sourceType } : { st: sourceType, sid: sourceId };
  const jRows = await runSelect(
    `SELECT h.JOURNAL_ID AS "journalId", h.JOURNAL_NO AS "journalNo", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
            h.DESCRIPTION AS "description", h.SUPPLIER_ID AS "supplierId", l.LINE_NO AS "lineNo",
            l.ACCOUNT_CODE AS "account", c.ACCOUNT_NAME AS "accountName",
            NVL(l.DEBIT_AMOUNT,0) AS "debit", NVL(l.CREDIT_AMOUNT,0) AS "credit"
       FROM XX_AP_JOURNAL_H_T h
       JOIN XX_AP_JOURNAL_L_T l ON l.JOURNAL_ID = h.JOURNAL_ID
       LEFT JOIN CHART_OF_ACCOUNT c ON c.ACCOUNT_ID = l.ACCOUNT_CODE
      WHERE ${jWhere} ORDER BY h.JOURNAL_ID, l.LINE_NO`, jBinds);

  const entries = [];
  let totalDebit = 0, totalCredit = 0;
  for (const r of jRows) {
    let e = entries[entries.length - 1];
    if (!e || e.journalId !== r.journalId) {
      e = { journalId: r.journalId, journalNo: r.journalNo, date: r.date, description: r.description || '', kind: /^\(?(Invoice|Payment|Refund) \S+ cancelled/i.test(r.description || '') ? 'Reversal' : 'Original', lines: [] };
      entries.push(e);
    }
    e.lines.push({ account: r.account, accountName: r.accountName || '', debit: num(r.debit), credit: num(r.credit) });
    totalDebit += num(r.debit);
    totalCredit += num(r.credit);
  }
  // Older advances may have lost their debit line. Show the missing Advances-to-Suppliers
  // debit so the entry balances, and flag it as derived.
  if (sourceType === 'ADVANCE') {
    const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT, name: 'Advances to Suppliers' };
    for (const e of entries) {
      const dr = e.lines.reduce((t, l) => t + l.debit, 0), cr = e.lines.reduce((t, l) => t + l.credit, 0);
      if (e.kind === 'Original' && cr - dr > 0.005) {
        e.lines.unshift({ account: advAcct.code, accountName: advAcct.name, debit: Math.round((cr - dr) * 100) / 100, credit: 0, derived: true });
        e.derived = true;
        totalDebit += cr - dr;
      }
    }
  }
  // "Advance ADV-x applied to INV-y" journal of an invoice: show its own header instead of the invoice's.
  if (sourceType === 'INVOICE' && journalId && entries.length) {
    const m = /^\(?Advance ([^\s)]+) applied to ([^\s)]+)/i.exec(entries[0].description);
    if (m) {
      const amt = `৳${num(totalDebit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      title = `Payment ${m[2]}`;
      status = '';
      fields = [
        { label: 'Invoice', value: m[2] },
        { label: 'Paid from', value: `Advance ${m[1]}` },
        { label: 'Payment date', value: entries[0].date || '-' },
        { label: 'Method', value: 'Advance adjustment' },
        { label: 'Amount', value: amt },
      ];
    }
  }
  if (!supplierId && jRows.length) supplierId = jRows[0].supplierId;
  if (!date && jRows.length) date = jRows[0].date;
  if (!title) title = 'Transaction';
  if (!summary.length && entries.length) {
    summary = [{ label: 'Date', value: entries[0].date }, { label: 'Description', value: entries[0].description }, { label: 'Amount', value: totalDebit, money: true }];
  }

  let supplierName = '';
  if (supplierId) {
    const s = await runSelect(`SELECT SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId });
    supplierName = s[0] ? s[0].name : '';
  }

  let glPosted = false;
  if (journalId) {
    const p = await runSelect(
      `SELECT COUNT(*) AS "cnt" FROM XX_AP_JOURNAL_H_T h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
        WHERE h.JOURNAL_ID = :jid AND g.POSTED = 1`, { jid: journalId });
    glPosted = num(p[0] && p[0].cnt) > 0;
  } else {
    glPosted = await isPosted('AP', sourceType, sourceId);
  }

  return {
    status: 200,
    body: {
      ok: true, sourceType, sourceId, title, status, date, supplierName, note, glPosted,
      cancelled: String(status).toLowerCase() === 'cancelled',
      summary, fields, invoiceForm, sections: sections.filter((s) => s.rows.length),
      journal: { entries, totalDebit: Math.round(totalDebit * 100) / 100, totalCredit: Math.round(totalCredit * 100) / 100 },
    },
  };
};

// ================================================================ EDIT (parent editable only while it has no child)
const TX = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
const qc = async (conn, sql, binds = {}) => (await conn.execute(sql, binds, TX)).rows || [];
const cnt = async (conn, sql, binds) => Number((await qc(conn, sql, binds))[0].c);

// Returns { editable:false, reason } or { editable:true, head, journal, journals, adj }.
//  - journals: every journal of the record (an invoice with an advance linked at creation has 2)
//  - adj: advance adjustment made at invoice creation (PAYMENT_ID IS NULL) — allowed, the record is still editable
async function checkEditable(conn, type, id, lock = false) {
  const fu = lock ? ' FOR UPDATE' : '';
  const no = (reason) => ({ editable: false, reason });
  let head;
  let adj = [];
  if (type === 'ADVANCE') {
    head = (await qc(conn, `SELECT ADVANCE_NO AS "no", STATUS AS "status", NVL(ADJUSTED_AMOUNT,0) AS "adj", SUPPLIER_ID AS "supplierId" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id${fu}`, { id }))[0];
    if (!head) return no('Advance not found');
    if (head.status === 'Cancelled') return no('Advance is cancelled');
    if (Number(head.adj) > 0 || (await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADVANCE_ID = :id`, { id })) > 0) return no('This advance is applied to an invoice. Cancel that first.');
    if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_REFUND_T WHERE ADVANCE_ID = :id AND NVL(STATUS,'Active') != 'Cancelled'`, { id })) > 0) return no('A refund exists for this advance. Cancel it first.');
  } else if (type === 'INVOICE') {
    head = (await qc(conn, `SELECT INVOICE_NO AS "no", STATUS AS "status", SUPPLIER_ID AS "supplierId", NVL(PAID_AMOUNT,0) AS "paid", NVL(ADVANCE_ADJUSTED,0) AS "adv" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id${fu}`, { id }))[0];
    if (!head) return no('Invoice not found');
    if (head.status === 'Cancelled') return no('Invoice is cancelled');
    // advance applied THROUGH a payment = child record -> block
    if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id AND PAYMENT_ID IS NOT NULL`, { id })) > 0) return no('An advance was applied through a payment. Cancel that payment first.');
    if (Number(head.paid) > 0 || (await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_PAYMENT_H_T p ON p.PAYMENT_ID = pl.PAYMENT_ID WHERE pl.INVOICE_ID = :id AND NVL(p.STATUS,'Active') != 'Cancelled'`, { id })) > 0) return no('A payment exists for this invoice. Cancel the payment first.');
    // advance linked at invoice-creation time (allowed)
    adj = await qc(conn, `SELECT ADJUSTMENT_ID AS "id", ADVANCE_ID AS "advanceId", ADJUSTED_AMOUNT AS "applied" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id AND PAYMENT_ID IS NULL`, { id });
    if (adj.length > 1) return no('This invoice has more than one advance linked and cannot be edited.');
  } else if (type === 'PAYMENT') {
    head = (await qc(conn, `SELECT PAYMENT_NO AS "no", STATUS AS "status", SUPPLIER_ID AS "supplierId" FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id${fu}`, { id }))[0];
    if (!head) return no('Payment not found');
    if (head.status === 'Cancelled') return no('Payment is cancelled');
    // A payment that also applied an advance has advance-adjustment rows and a journal
    // with a third (advance) line. Re-pointing those is a separate operation, so such
    // payments stay non-editable here — cancel the payment instead.
    if ((await cnt(conn, `SELECT COUNT(*) AS "c" FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id })) > 0) return no('This payment applied an advance and cannot be edited. Cancel it instead.');
  } else if (type === 'REFUND') {
    head = (await qc(conn, `SELECT r.REFUND_NO AS "no", r.STATUS AS "status", a.SUPPLIER_ID AS "supplierId" FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID WHERE r.REFUND_ID = :id`, { id }))[0];
    if (!head) return no('Refund not found');
    if (head.status === 'Cancelled') return no('Refund is cancelled');
    if (lock) await qc(conn, `SELECT 1 FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id FOR UPDATE`, { id });
  } else if (type === 'SETTLEMENT') {
    // Advance-only settlement: no payment header exists, only one journal (SOURCE_TYPE PAYMENT, SOURCE_ID 0).
    // `id` here is the JOURNAL_ID. Only the date can be edited (nothing links it to its adjustment rows).
    const j = (await qc(conn, `SELECT JOURNAL_ID AS "journalId", JOURNAL_NO AS "journalNo", SUPPLIER_ID AS "supplierId"
         FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id AND SOURCE_TYPE = 'PAYMENT' AND SOURCE_ID = 0${fu}`, { id }))[0];
    if (!j) return no('Settlement not found');
    const g = await qc(conn, `SELECT POSTED AS "posted" FROM GLMASTER WHERE VOUCHERNO = :n${fu}`, { n: j.journalNo });
    if (g.some((x) => Number(x.posted) === 1)) return no('Already posted to the general ledger.');
    return { editable: true, head: { no: j.journalNo, supplierId: j.supplierId }, journal: j, journals: [j], adj: [] };
  } else return no('This record type cannot be edited');

  const js = await qc(conn, `SELECT JOURNAL_ID AS "journalId", JOURNAL_NO AS "journalNo" FROM XX_AP_JOURNAL_H_T WHERE SOURCE_TYPE = :t AND SOURCE_ID = :id ORDER BY JOURNAL_ID`, { t: type, id });
  const expected = type === 'INVOICE' && adj.length ? 2 : 1;
  if (js.length !== expected) return no('Journal not found, or an unexpected number of journals exists for this record.');
  for (const j of js) {
    const g = await qc(conn, `SELECT POSTED AS "posted" FROM GLMASTER WHERE VOUCHERNO = :n${fu}`, { n: j.journalNo });
    if (g.some((x) => Number(x.posted) === 1)) return no('Already posted to the general ledger.');
  }
  return { editable: true, head, journal: js[0], journals: js, adj };
}

// raw data to prefill the edit forms (also re-checks editable)
export const getEditData = async (params) => {
  const type = String(params.type || '').toUpperCase();
  const id = parseInt(params.id, 10);
  if (!id || !['ADVANCE', 'INVOICE', 'PAYMENT', 'REFUND', 'SETTLEMENT'].includes(type)) return { status: 400, body: { ok: false, error: 'Invalid record' } };
  const conn = await getConnection();
  try {
    const st = await checkEditable(conn, type, id);
    if (!st.editable) return { status: 400, body: { ok: false, error: st.reason } };
    if (type === 'ADVANCE') {
      const h = (await qc(conn, `SELECT ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
              PAYMENT_METHOD AS "method", REFERENCE_NO AS "ref", NVL(ADVANCE_AMOUNT,0) AS "total"
         FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id }))[0];
      let lines = await qc(conn, `SELECT ACCOUNT_CODE AS "a", DESCRIPTION AS "d", AMOUNT AS "n" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id ORDER BY LINE_NO`, { id });
      // older advances may have no saved lines: show one line from the header total
      if (!lines.length && Number(h.total) > 0) {
        const advAcct = (await resolveAdvanceAccount()) || { code: AP_ADVANCE_ACCOUNT };
        lines = [{ a: advAcct.code, d: '', n: h.total }];
      }
      return { status: 200, body: { ok: true, type, id, ...h, lines } };
    }
    if (type === 'INVOICE') {
      const h = (await qc(conn, `SELECT INVOICE_NO AS "no", TO_CHAR(INVOICE_DATE,'YYYY-MM-DD') AS "date", TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id }))[0];
      const lines = await qc(conn, `SELECT ACCOUNT_CODE AS "a", ITEM_DESCRIPTION AS "d", NVL(QTY,1) * NVL(UNIT_PRICE,0) AS "n" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id ORDER BY LINE_NO`, { id });
      // advance linked when the invoice was created (shown read-only in the edit form)
      let advNo = null, advanceApplied = 0;
      if (st.adj.length) {
        advanceApplied = Number(st.adj[0].applied);
        advNo = (await qc(conn, `SELECT ADVANCE_NO AS "no" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: st.adj[0].advanceId }))[0].no;
      }
      return { status: 200, body: { ok: true, type, id, ...h, lines, advNo, advanceApplied } };
    }
    if (type === 'SETTLEMENT') {
      const h = (await qc(conn, `SELECT JOURNAL_NO AS "no", TO_CHAR(JOURNAL_DATE,'YYYY-MM-DD') AS "date", DESCRIPTION AS "description", NVL(TOTAL_AMOUNT,0) AS "amount" FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id`, { id }))[0];
      return { status: 200, body: { ok: true, type, id, ...h } };
    }
    if (type === 'PAYMENT') {
      const h = (await qc(conn, `SELECT PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date", BANK_ACCOUNT_CODE AS "bank",
              PAYMENT_METHOD AS "method", NVL(TOTAL_AMOUNT,0) AS "total" FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id }))[0];
      // available = invoice total - advance adjusted - (paid - this payment's line),
      // i.e. what this payment line could be raised to without overpaying the invoice.
      const lines = await qc(conn, `SELECT pl.INVOICE_ID AS "invoiceId", pl.APPLIED_AMOUNT AS "amt", i.INVOICE_NO AS "invoiceNo",
              NVL(i.PAID_AMOUNT,0) AS "paid", NVL(i.ADVANCE_ADJUSTED,0) AS "adv",
              NVL(i.GROSS_AMOUNT,0) + NVL(i.TAX_AMOUNT,0) AS "invTotal"
         FROM XX_AP_PAYMENT_L_T pl JOIN XX_AP_INVOICE_H_T i ON i.INVOICE_ID = pl.INVOICE_ID
        WHERE pl.PAYMENT_ID = :id ORDER BY pl.PAYMENT_LINE_ID`, { id });
      return { status: 200, body: { ok: true, type, id, ...h, lines } };
    }
    const h = (await qc(conn, `SELECT r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date", r.BANK_ACCOUNT_CODE AS "bank", r.PAYMENT_METHOD AS "method", r.REFERENCE_NO AS "ref", r.REMARKS AS "remarks", r.REFUND_AMOUNT AS "amount", r.ADVANCE_ID AS "advanceId" FROM XX_AP_ADVANCE_REFUND_T r WHERE r.REFUND_ID = :id`, { id }))[0];
    return { status: 200, body: { ok: true, type, id, ...h } };
  } finally {
    await conn.close();
  }
};

// run `work` in ONE transaction: lock + guard, do the writes, single commit, rollback on any error
async function editTx(type, id, work) {
  const conn = await getConnection();
  try {
    const st = await checkEditable(conn, type, id, true);
    if (!st.editable) { await conn.rollback(); return { status: 400, body: { ok: false, error: st.reason } }; }
    await work(conn, st);
    await conn.commit();
    return { status: 200, body: { ok: true } };
  } catch (e) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    return { status: 400, body: { ok: false, error: e.message } };
  } finally {
    await conn.close();
  }
}

export const updateAdvance = async (body) => {
  const id = parseInt(body.advance_id, 10);
  const date = (body.date || '').trim();
  const bank = (body.bank_account_code || '').trim();
  const method = body.method || '';
  const ref = (body.reference_no || '').trim();
  if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'advance_id, date and bank_account_code are required' } };

  // Same FK rule as creation: the line account must exist in CHART_OF_ACCOUNT.
  const advanceAccount = await resolveAdvanceAccount();
  if (!advanceAccount) return { status: 400, body: { ok: false, error: ADVANCE_ACCOUNT_MISSING } };

  const lines = [];
  let total = 0;
  for (const l of Array.isArray(body.lines) ? body.lines : []) {
    const amt = roundCents(l.amount), d = (l.desc || '').trim();
    if (amt <= 0) continue;
    if (!d) return { status: 400, body: { ok: false, error: 'Description is required on every advance line' } };
    lines.push({ account: advanceAccount.code, desc: d, amount: amt }); total += amt;
  }
  total = roundCents(total);
  if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an amount greater than zero' } };

  return editTx('ADVANCE', id, async (conn, st) => {
    const no = st.head.no;
    await conn.execute(
      `UPDATE XX_AP_ADVANCE_T SET ADVANCE_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank, PAYMENT_METHOD = :method,
              REFERENCE_NO = :ref, ADVANCE_AMOUNT = :total, LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :id`,
      { p_date: date, bank, method, ref, total, id }, TX);
    await conn.execute(`DELETE FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id }, TX);
    let n = 0;
    for (const l of lines) {
      await conn.execute(
        `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT)
         VALUES (XX_AP_ADVANCE_L_S.NEXTVAL, :id, :lno, :acc, :p_desc, :amt)`,
        { id, lno: ++n, acc: l.account, p_desc: l.desc, amt: l.amount }, TX);
    }
    const note = [...new Set(lines.map((x) => x.desc))].join('; ');
    const jl = lines.map((l) => ({ account: advanceAccount.code, debit: l.amount, desc: l.desc }));
    jl.push({ account: bank, credit: total, desc: withNote(`Advance ${no} paid`, note) });
    await rewriteJournalTx(conn, { journalId: st.journal.journalId, journalNo: st.journal.journalNo, date, description: withNote(`Advance payment ${no}`, note) + (ref ? ` (${ref})` : ''), lines: jl });
  });
};

export const updateInvoice = async (body) => {
  const id = parseInt(body.invoice_id, 10);
  const date = (body.invoice_date || '').trim();
  const due = (body.due_date || '').trim() || date;
  const note = (body.note || '').trim();
  if (!id || !date) return { status: 400, body: { ok: false, error: 'invoice_id and invoice_date are required' } };
  if (!note) return { status: 400, body: { ok: false, error: 'Description is required' } };
  const lines = [];
  let gross = 0;
  for (const l of Array.isArray(body.lines) ? body.lines : []) {
    const amt = Number(l.amount || 0), acc = (l.account || '').trim();
    if (!acc || amt <= 0) continue;
    lines.push({ account: acc, desc: (l.desc || '').trim() || note, amount: amt }); gross += amt;
  }
  if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

  return editTx('INVOICE', id, async (conn, st) => {
    const no = st.head.no;
    // advance linked when the invoice was created: its applied amount stays the same
    const applied = st.adj.length ? Number(st.adj[0].applied) : 0;
    const advAcct = st.adj.length ? await resolveAdvanceAccount() : null;
    if (st.adj.length && !advAcct) throw new Error(ADVANCE_ACCOUNT_MISSING);
    await assertAccountsExist([AP_PAYABLE_ACCOUNT, ...lines.map((l) => l.account), advAcct && advAcct.code]);
    if (gross + 0.001 < applied) throw new Error(`Invoice total cannot be less than the advance already applied (${applied.toFixed(2)}).`);

    await conn.execute(
      `UPDATE XX_AP_INVOICE_H_T SET INVOICE_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), DUE_DATE = TO_DATE(:p_due,'YYYY-MM-DD'),
              GROSS_AMOUNT = :gross, REMARKS = :p_note,
              STATUS = CASE
                WHEN :gross + NVL(TAX_AMOUNT,0) - NVL(ADVANCE_ADJUSTED,0) - NVL(PAID_AMOUNT,0) <= 0 THEN 'Paid'
                WHEN NVL(ADVANCE_ADJUSTED,0) + NVL(PAID_AMOUNT,0) > 0 THEN 'Partially Paid'
                ELSE 'Draft' END,
              LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`,
      { p_date: date, p_due: due, gross, p_note: note, id }, TX);
    await conn.execute(`DELETE FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id }, TX);
    let n = 0;
    for (const l of lines) {
      await conn.execute(
        `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
         VALUES (XX_AP_INVOICE_L_S.NEXTVAL, :id, :lno, :acc, :p_desc, 1, :price)`,
        { id, lno: ++n, acc: l.account, p_desc: l.desc, price: l.amount }, TX);
    }

    // 1st journal: the invoice itself
    const jl = lines.map((l) => ({ account: l.account, debit: l.amount, desc: l.desc }));
    jl.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: withNote(`Invoice ${no}`, note) });
    await rewriteJournalTx(conn, { journalId: st.journals[0].journalId, journalNo: st.journals[0].journalNo, date, description: withNote(`Payable invoice ${no}`, note), lines: jl });

    // 2nd journal: "Advance ... applied to ..." (only when an advance was linked)
    if (st.adj.length) {
      const advNo = (await qc(conn, `SELECT ADVANCE_NO AS "no" FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: st.adj[0].advanceId }))[0].no;
      await rewriteJournalTx(conn, {
        journalId: st.journals[1].journalId, journalNo: st.journals[1].journalNo, date,
        description: withNote(`Advance ${advNo} applied to ${no}`, note),
        lines: [
          { account: AP_PAYABLE_ACCOUNT, debit: applied, desc: 'Advance applied' },
          { account: advAcct.code, credit: applied, desc: `Advance ${advNo}` },
        ],
      });
    }
  });
};

// ---------------------------------------------------------------- update a payment
// Same header, same invoice lines, same journal and GLMASTER row — only their values
// change. Invoices this payment settles are corrected by the difference between the
// old and new allocation, exactly like settle() does when the payment is created.
export const updatePayment = async (body) => {
  const id = parseInt(body.payment_id, 10);
  const date = (body.date || '').trim();
  const bank = (body.bank_account_code || '').trim();
  const method = body.method || '';
  if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'payment_id, date and bank_account_code are required' } };

  const lines = [];
  const seen = new Set();
  let total = 0;
  for (const l of Array.isArray(body.lines) ? body.lines : []) {
    const invoiceId = parseInt(l.invoice_id, 10);
    const amt = Number(l.amount || 0);
    if (!invoiceId || !(amt > 0)) continue;
    if (seen.has(invoiceId)) return { status: 400, body: { ok: false, error: 'Each invoice can only appear once in a payment.' } };
    seen.add(invoiceId);
    lines.push({ invoiceId, amount: Math.round(amt * 100) / 100 });
    total += amt;
  }
  total = Math.round(total * 100) / 100;
  if (!lines.length) return { status: 400, body: { ok: false, error: 'Add at least one invoice line with an amount greater than zero' } };

  return editTx('PAYMENT', id, async (conn, st) => {
    const no = st.head.no;
    const supplierId = Number(st.head.supplierId);

    const oldLines = await qc(conn, `SELECT INVOICE_ID AS "invoiceId", APPLIED_AMOUNT AS "amt" FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id });
    const delta = {};
    for (const ol of oldLines) delta[Number(ol.invoiceId)] = (delta[Number(ol.invoiceId)] || 0) - Number(ol.amt);
    for (const l of lines) delta[l.invoiceId] = (delta[l.invoiceId] || 0) + l.amount;

    for (const [key, change] of Object.entries(delta)) {
      if (Math.abs(change) < 0.001) continue;
      const invoiceId = parseInt(key, 10);
      const inv = (await qc(conn, `SELECT INVOICE_NO AS "no", SUPPLIER_ID AS "supplierId", STATUS AS "status",
              NVL(PAID_AMOUNT,0) AS "paid", NVL(ADVANCE_ADJUSTED,0) AS "adv",
              NVL(GROSS_AMOUNT,0) + NVL(TAX_AMOUNT,0) AS "invTotal"
         FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id FOR UPDATE`, { id: invoiceId }))[0];
      if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
      if (inv.status === 'Cancelled') throw new Error(`Invoice ${inv.no} is cancelled`);
      if (Number(inv.supplierId) !== supplierId) throw new Error(`Invoice ${inv.no} does not belong to this vendor.`);
      const newPaid = Math.round((Number(inv.paid) + change) * 100) / 100;
      if (newPaid < -0.001) throw new Error(`Invoice ${inv.no} has less paid than this payment already allocated.`);
      if (newPaid + Number(inv.adv) > Number(inv.invTotal) + 0.001) throw new Error(`Payment exceeds the balance of invoice ${inv.no}.`);
      await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = :paid, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { paid: newPaid, id: invoiceId }, TX);
      await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
           WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
           WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
           ELSE 'Open' END WHERE INVOICE_ID = :id`, { id: invoiceId }, TX);
    }

    await conn.execute(
      `UPDATE XX_AP_PAYMENT_H_T SET PAYMENT_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank,
              PAYMENT_METHOD = :method, TOTAL_AMOUNT = :total, LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`,
      { p_date: date, bank, method, total, id }, TX);

    await conn.execute(`DELETE FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id }, TX);
    for (const l of lines) {
      await conn.execute(
        `INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT)
         VALUES (XX_AP_PAYMENT_L_S.NEXTVAL, :pid, :iid, :amt)`,
        { pid: id, iid: l.invoiceId, amt: l.amount }, TX);
    }

    const notes = [];
    for (const l of lines) {
      const r = (await qc(conn, `SELECT REMARKS AS "note" FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: l.invoiceId }))[0];
      if (r && r.note) notes.push(r.note);
    }
    await rewriteJournalTx(conn, {
      journalId: st.journal.journalId, journalNo: st.journal.journalNo, date,
      description: withNote(`Settlement ${no}`, [...new Set(notes)].join('; ')),
      lines: [
        { account: AP_PAYABLE_ACCOUNT, debit: total, desc: 'Invoices settled' },
        { account: bank, credit: total, desc: `Payment ${no}` },
      ],
    });
  });
};

export const updateRefund = async (body) => {
  const id = parseInt(body.refund_id, 10);
  const date = (body.date || '').trim();
  const bank = (body.bank_account_code || '').trim();
  if (!id || !date || !bank) return { status: 400, body: { ok: false, error: 'refund_id, date and bank_account_code are required' } };
  const method = body.method || '', ref = (body.reference_no || '').trim(), remarks = (body.remarks || '').trim();

  return editTx('REFUND', id, async (conn, st) => {
    const r = (await qc(conn, `SELECT r.REFUND_AMOUNT AS "amount", a.ADVANCE_NO AS "advNo", a.ADVANCE_ID AS "advId" FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID WHERE r.REFUND_ID = :id`, { id }))[0];
    await conn.execute(
      `UPDATE XX_AP_ADVANCE_REFUND_T SET REFUND_DATE = TO_DATE(:p_date,'YYYY-MM-DD'), BANK_ACCOUNT_CODE = :bank, PAYMENT_METHOD = :method,
              REFERENCE_NO = :ref, REMARKS = :p_remarks, LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`,
      { p_date: date, bank, method, ref, p_remarks: remarks, id }, TX);
    const advAcct = await resolveAdvanceAccount();
    if (!advAcct) throw new Error(ADVANCE_ACCOUNT_MISSING);
    await assertAccountsExist([bank, advAcct.code]);
    const nt = (await qc(conn, `SELECT DISTINCT DESCRIPTION AS "note" FROM XX_AP_ADVANCE_L_T WHERE ADVANCE_ID = :id`, { id: r.advId })).map((x) => x.note).filter(Boolean).join('; ');
    await rewriteJournalTx(conn, {
      journalId: st.journal.journalId, journalNo: st.journal.journalNo, date,
      description: withNote(`Advance ${r.advNo} refunded`, nt) + (ref ? ` (${ref})` : ''),
      lines: [
        { account: bank, debit: Number(r.amount), desc: withNote(`Refund ${st.head.no}`, nt) },
        { account: advAcct.code, credit: Number(r.amount), desc: withNote(`Advance ${r.advNo} refunded`, nt) },
      ],
    });
  });
};

// ---------------------------------------------------------------- update an advance-only settlement (date only)
export const updateSettlement = async (body) => {
  const id = parseInt(body.journal_id, 10);
  const date = (body.date || '').trim();
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: 400, body: { ok: false, error: 'journal_id and a valid date are required' } };

  return editTx('SETTLEMENT', id, async (conn, st) => {
    const h = (await qc(conn, `SELECT DESCRIPTION AS "description" FROM XX_AP_JOURNAL_H_T WHERE JOURNAL_ID = :id`, { id }))[0];
    const lines = await qc(conn, `SELECT ACCOUNT_CODE AS "account", DEBIT_AMOUNT AS "debit", CREDIT_AMOUNT AS "credit", DESCRIPTION AS "desc"
         FROM XX_AP_JOURNAL_L_T WHERE JOURNAL_ID = :id ORDER BY LINE_NO`, { id });
    if (!lines.length) throw new Error('Journal lines not found for this settlement.');
    await assertAccountsExist(lines.map((l) => l.account));
    await rewriteJournalTx(conn, {
      journalId: id, journalNo: st.journal.journalNo, date, description: h.description,
      lines: lines.map((l) => ({ account: l.account, debit: Number(l.debit || 0), credit: Number(l.credit || 0), desc: l.desc })),
    });
  });
};