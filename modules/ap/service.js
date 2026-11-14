// // Accounts Payable routes — a direct port of D:\xampp\htdocs\hms\payable\api.php.
// import { getConnection, oracledb } from '../../config/db.js';
// import { postJournal, isPosted } from '../gl/service.js';

// // Real CHART_OF_ACCOUNT leaf accounts added specifically for this module (see
// // XX_AP_ADV_RFD_BANK_FK2 etc. — the whole app now points at this one chart).
// const AP_PAYABLE_ACCOUNT = '3020020000'; // Accounts Payable - Trade (liability)
// const AP_ADVANCE_ACCOUNT = '1020130000'; // Advances to Suppliers (asset) — clearing account
// // The AR side's equivalent control accounts — excluded from AP's own account
// // pickers below. All four control accounts live in the same shared real chart,
// // so without this exclusion the AP line/expense dropdown would also offer
// // "Accounts Receivable - Trade" and "Advance from Customers", which make no
// // sense on a vendor-facing line.
// const AR_RECEIVABLE_ACCOUNT = '1020120000';
// const AR_ADVANCE_ACCOUNT = '3020030000';

// // ---------------------------------------------------------------- vendors
// // Reads the company's real supplier master (SUPPLIER_INFO, copied over from the
// // BWA instance) — not a synthetic table of this module's own. STATUS there is a
// // NUMBER (1 = active), unlike this app's own earlier 'Y'/'N' convention.
// export const listVendors = async () => {
//   let rows;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(`SELECT SUPPLIER_ID AS "id", SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE STATUS=1 ORDER BY SUPPLIER_NAME`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       rows = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   return { status: 200, body: rows };
// };

// // ---------------------------------------------------------------- chart of accounts
// // Reads the company's real chart directly: ACCOUNT_TYPE=1 flags a cash/bank leaf
// // (the same flag the existing GL app's own cash dashboard uses), LASTLEVEL=1 flags
// // any posting-level leaf account (as opposed to a grouping/header node).
// export const getCoa = async () => {
//   // Excludes all four control accounts (both AP's own and AR's) — a line is
//   // always a real posting/expense-type account, never one of the clearing
//   // accounts the app manages automatically.
//   let expense;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//           WHERE LASTLEVEL = 1 AND ENABLED = 1 AND NVL(ACCOUNT_TYPE,0) != 1
//             AND ACCOUNT_ID NOT IN (:pay, :apAdv, :arRec, :arAdv) ORDER BY ACCOUNT_NAME`,
//         { pay: AP_PAYABLE_ACCOUNT, apAdv: AP_ADVANCE_ACCOUNT, arRec: AR_RECEIVABLE_ACCOUNT, arAdv: AR_ADVANCE_ACCOUNT },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       expense = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   let bank;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(`SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_TYPE = 1 AND ENABLED = 1 ORDER BY ACCOUNT_NAME`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       bank = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   // A payable invoice records a real expense — scoped to just Expense accounts
//   // (code starting '5', this chart's convention), unlike the broader 'expense'
//   // list above which Advance lines use for free-form earmarking (e.g. an
//   // Equipment Deposit, code '1...', is a valid thing to advance against but not
//   // a valid thing to invoice as an expense).
//   let invoiceExpense;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
//           WHERE LASTLEVEL = 1 AND ENABLED = 1 AND ACCOUNT_ID LIKE '5%' ORDER BY ACCOUNT_NAME`,
//         {},
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       invoiceExpense = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   return { status: 200, body: { expense, invoiceExpense, bank } };
// };

// // ---------------------------------------------------------------- one vendor's full picture
// export const getVendor = async (params) => {
//   const supplierId = parseInt(params.id, 10);
//   if (!supplierId) return { status: 400, body: { ok: false, error: 'id is required' } };

//   let sup;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(`SELECT SUPPLIER_NAME FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       sup = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   if (!sup.length) return { status: 400, body: { ok: false, error: 'Vendor not found' } };

//   let invoiceRows;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT INVOICE_ID AS "id", INVOICE_NO AS "no", SUPPLIER_INVOICE_NO AS "supNo",
//                 TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", TOTAL_AMOUNT AS "total", BALANCE_DUE AS "balance",
//                 ADVANCE_ADJUSTED AS "advanceAdjusted", PAID_AMOUNT AS "paid", STATUS AS "status", REMARKS AS "note"
//            FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY DUE_DATE`,
//         { id: supplierId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       invoiceRows = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }

//   let linkRows;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT aa.INVOICE_ID AS "invoiceId", a.ADVANCE_NO AS "advNo", aa.ADJUSTED_AMOUNT AS "amt"
//            FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
//           WHERE a.SUPPLIER_ID = :id`,
//         { id: supplierId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       linkRows = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const linksByInvoice = {};
//   for (const l of linkRows) (linksByInvoice[l.invoiceId] ||= []).push({ advNo: l.advNo, amt: Number(l.amt) });
//   for (const inv of invoiceRows) inv.links = linksByInvoice[inv.id] || [];

//   let advanceRows;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT ADVANCE_ID AS "id", ADVANCE_NO AS "no", TO_CHAR(ADVANCE_DATE,'YYYY-MM-DD') AS "date",
//                 ADVANCE_AMOUNT AS "total", ADJUSTED_AMOUNT AS "used", BALANCE_AMOUNT AS "balance", STATUS AS "status"
//            FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY ADVANCE_DATE DESC`,
//         { id: supplierId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       advanceRows = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }

//   let ledgerRows;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT h.DESCRIPTION AS "description", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
//                 h.TOTAL_AMOUNT AS "amount", h.SOURCE_TYPE AS "sourceType"
//            FROM XX_AP_JOURNAL_H_T h WHERE h.SUPPLIER_ID = :id ORDER BY h.JOURNAL_ID DESC FETCH FIRST 8 ROWS ONLY`,
//         { id: supplierId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       ledgerRows = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   for (const l of ledgerRows) l.positive = l.sourceType === 'ADVANCE';

//   let paymentRows;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT PAYMENT_ID AS "id", PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date",
//                 TOTAL_AMOUNT AS "total", STATUS AS "status"
//            FROM XX_AP_PAYMENT_H_T WHERE SUPPLIER_ID = :id ORDER BY PAYMENT_ID DESC`,
//         { id: supplierId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       paymentRows = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }

//   let refundRows;
//   {
//     const conn = await getConnection();
//     try {
//       const result = await conn.execute(
//         `SELECT r.REFUND_ID AS "id", r.REFUND_NO AS "no", TO_CHAR(r.REFUND_DATE,'YYYY-MM-DD') AS "date",
//                 r.REFUND_AMOUNT AS "amount", r.STATUS AS "status", a.ADVANCE_NO AS "advNo"
//            FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
//           WHERE a.SUPPLIER_ID = :id ORDER BY r.REFUND_ID DESC`,
//         { id: supplierId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       refundRows = result.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }

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
// // SUPPLIER_INFO.SUPPLIER_ID is assigned by its own SUPPLIER_AUTONUMBER trigger
// // (SUPPLIER_SEQ), so it's omitted here — reading SUPPLIER_SEQ.CURRVAL right after
// // the insert (same connection, before anything else touches that sequence) gives
// // back the id that was just generated.
// export const createVendor = async (body) => {
//   const name = (body.name || '').trim();
//   if (!name) return { status: 400, body: { ok: false, error: 'Vendor name is required' } };
//   let result;
//   let id;
//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(
//         `INSERT INTO SUPPLIER_INFO (SUPPLIER_NAME, CONTACT_PERSON, PHONE, EMAIL, ADDRESS, STATUS)
//          VALUES (:name, :contact, :phone, :email, :address, 1)`,
//         { name, contact: body.contact || null, phone: body.phone || null, email: body.email || null, address: body.address || null }
//       );
//       // CURRVAL is session-scoped — read it on this same connection, otherwise
//       // a pooled reconnect raises ORA-08002.
//       const r = await conn.execute(`SELECT SUPPLIER_SEQ.CURRVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       id = (r.rows || [])[0].id;
//       await conn.commit();
//       result = { ok: true };
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//       result = { ok: false, error: e.message };
//     } finally {
//       await conn.close();
//     }
//   }
//   if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };
//   return { status: 200, body: { ok: true, id } };
// };

// // ---------------------------------------------------------------- record a new advance
// export const recordAdvance = async (body) => {
//   const supplierId = parseInt(body.supplier_id, 10);
//   const date = (body.date || '').trim();
//   const bankAccount = (body.bank_account_code || '').trim();
//   const method = body.method || '';
//   const ref = (body.reference_no || '').trim();
//   const lines = Array.isArray(body.lines) ? body.lines : [];

//   if (!supplierId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'supplier_id, date and bank_account_code are required' } };

//   const validLines = [];
//   let total = 0;
//   for (const l of lines) {
//     const amt = Number(l.amount || 0);
//     const acc = (l.account || '').trim();
//     if (!acc || amt <= 0) continue;
//     validLines.push({ account: acc, desc: (l.desc || '').trim(), amount: amt });
//     total += amt;
//   }
//   if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

//   let advanceId;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT XX_AP_ADVANCE_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       advanceId = (r.rows || [])[0].id;
//     } finally {
//       await conn.close();
//     }
//   }
//   const advanceNo = 'ADV-' + String(advanceId).padStart(6, '0');

//   let result;
//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(
//         `INSERT INTO XX_AP_ADVANCE_T (ADVANCE_ID, ADVANCE_NO, SUPPLIER_ID, ADVANCE_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, ADVANCE_AMOUNT)
//          VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :total)`,
//         { id: advanceId, no: advanceNo, sid: supplierId, p_date: date, bank: bankAccount, method, ref, total }
//       );
//       await conn.commit();
//       result = { ok: true };
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//       result = { ok: false, error: e.message };
//     } finally {
//       await conn.close();
//     }
//   }
//   if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };

//   // The journal side always debits the fixed Advances-to-Suppliers control account
//   // (AP_ADVANCE_ACCOUNT) — not each line's own account. The per-line account is
//   // purely descriptive earmarking, stored on XX_AP_ADVANCE_L_T for reference; it
//   // was a bug for it to also drive the journal, since the later invoice-apply step
//   // always credits AP_ADVANCE_ACCOUNT specifically — crediting an account that was
//   // never debited by the original advance, so its balance never reflected real
//   // advance balances and only ever went negative as advances were applied.
//   let lineNo = 1;
//   const journalLines = [];
//   for (const line of validLines) {
//     let lineId;
//     {
//       const conn = await getConnection();
//       try {
//         const r = await conn.execute(`SELECT XX_AP_ADVANCE_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//         lineId = (r.rows || [])[0].id;
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT) VALUES (:id, :aid, :lno, :acc, :desc, :amt)`,
//           { id: lineId, aid: advanceId, lno: lineNo, acc: line.account, desc: line.desc, amt: line.amount }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     journalLines.push({ account: AP_ADVANCE_ACCOUNT, debit: line.amount, desc: line.desc });
//     lineNo++;
//   }
//   journalLines.push({ account: bankAccount, credit: total, desc: `Advance ${advanceNo} paid` });
//   const jrn = await postJournal('AP', 'ADVANCE', advanceId, supplierId, date, `Advance payment ${advanceNo}` + (ref ? ` (${ref})` : ''), journalLines);

//   return { status: 200, body: { ok: true, advanceId, advanceNo, total, journalOk: jrn.ok } };
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

//   let dup;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT 1 FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :sid AND UPPER(INVOICE_NO) = UPPER(:no)`, { sid: supplierId, no: invoiceNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       dup = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   if (dup.length) return { status: 400, body: { ok: false, error: `${invoiceNo} already exists for this vendor` } };

//   const validLines = [];
//   let gross = 0;
//   for (const l of lines) {
//     const amt = Number(l.amount || 0);
//     const acc = (l.account || '').trim();
//     if (!acc || amt <= 0) continue;
//     validLines.push({ account: acc, desc: (l.desc || '').trim(), amount: amt });
//     gross += amt;
//   }
//   if (!validLines.length) return { status: 400, body: { ok: false, error: 'Add at least one line with an account and amount greater than zero' } };

//   let advance = null;
//   if (linkAdvanceId) {
//     let advRows;
//     {
//       const conn = await getConnection();
//       try {
//         const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id AND SUPPLIER_ID = :sid`, { id: linkAdvanceId, sid: supplierId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//         advRows = r.rows || [];
//       } finally {
//         await conn.close();
//       }
//     }
//     advance = advRows[0] || null;
//     if (!advance) return { status: 400, body: { ok: false, error: 'Selected advance not found for this vendor' } };
//     if (applyAmount <= 0) return { status: 400, body: { ok: false, error: 'Enter an amount to apply from the linked advance' } };
//     if (applyAmount > Math.min(Number(advance.BALANCE_AMOUNT), gross) + 0.001) {
//       return { status: 400, body: { ok: false, error: 'Apply amount exceeds the advance balance or the invoice total' } };
//     }
//   }

//   let invoiceId;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT XX_AP_INVOICE_H_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       invoiceId = (r.rows || [])[0].id;
//     } finally {
//       await conn.close();
//     }
//   }
//   let result;
//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(
//         `INSERT INTO XX_AP_INVOICE_H_T (INVOICE_ID, INVOICE_NO, SUPPLIER_ID, INVOICE_DATE, DUE_DATE, GROSS_AMOUNT, REMARKS)
//          VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), TO_DATE(:p_due,'YYYY-MM-DD'), :gross, :p_note)`,
//         { id: invoiceId, no: invoiceNo, sid: supplierId, p_date: invoiceDate, p_due: dueDate, gross, p_note: note }
//       );
//       await conn.commit();
//       result = { ok: true };
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//       result = { ok: false, error: e.message };
//     } finally {
//       await conn.close();
//     }
//   }
//   if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };

//   let lineNo = 1;
//   const journalLines = [];
//   for (const line of validLines) {
//     let lineId;
//     {
//       const conn = await getConnection();
//       try {
//         const r = await conn.execute(`SELECT XX_AP_INVOICE_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//         lineId = (r.rows || [])[0].id;
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
//            VALUES (:id, :iid, :lno, :acc, :desc, 1, :price)`,
//           { id: lineId, iid: invoiceId, lno: lineNo, acc: line.account, desc: line.desc, price: line.amount }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     journalLines.push({ account: line.account, debit: line.amount, desc: line.desc });
//     lineNo++;
//   }
//   journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: `Invoice ${invoiceNo}` });
//   await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, `Payable invoice ${invoiceNo}`, journalLines);

//   if (advance && applyAmount > 0) {
//     let adjId;
//     {
//       const conn = await getConnection();
//       try {
//         const r = await conn.execute(`SELECT XX_AP_ADV_ADJ_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//         adjId = (r.rows || [])[0].id;
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT) VALUES (:id, :aid, :iid, :amt)`,
//           { id: adjId, aid: advance.ADVANCE_ID, iid: invoiceId, amt: applyAmount }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
//              STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :aid`,
//           { amt: applyAmount, aid: advance.ADVANCE_ID }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = :amt,
//              STATUS = CASE WHEN GROSS_AMOUNT - :amt <= 0 THEN 'Paid' ELSE 'Partially Paid' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//           { amt: applyAmount, iid: invoiceId }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, `Advance ${advance.ADVANCE_NO} applied to ${invoiceNo}`, [
//       { account: AP_PAYABLE_ACCOUNT, debit: applyAmount, desc: 'Advance applied' },
//       { account: AP_ADVANCE_ACCOUNT, credit: applyAmount, desc: `Advance ${advance.ADVANCE_NO}` },
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

//   let openAdvances;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(
//         `SELECT ADVANCE_ID, BALANCE_AMOUNT FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :sid AND STATUS != 'Cancelled' AND BALANCE_AMOUNT > 0 ORDER BY ADVANCE_DATE, ADVANCE_ID`,
//         { sid: supplierId },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       openAdvances = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const availableAdvance = openAdvances.reduce((s, a) => s + Number(a.BALANCE_AMOUNT), 0);
//   if (totalFromAdvance > availableAdvance + 0.001) return { status: 400, body: { ok: false, error: 'Requested advance offset exceeds available advance balance' } };

//   let paymentId = null, paymentNo = null;
//   if (totalPayNow > 0) {
//     {
//       const conn = await getConnection();
//       try {
//         const r = await conn.execute(`SELECT XX_AP_PAYMENT_H_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//         paymentId = (r.rows || [])[0].id;
//       } finally {
//         await conn.close();
//       }
//     }
//     paymentNo = 'PAY-' + String(paymentId).padStart(6, '0');
//     let result;
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `INSERT INTO XX_AP_PAYMENT_H_T (PAYMENT_ID, PAYMENT_NO, SUPPLIER_ID, PAYMENT_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, TOTAL_AMOUNT)
//            VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :total)`,
//           { id: paymentId, no: paymentNo, sid: supplierId, p_date: date, bank: bankAccount, method, total: totalPayNow }
//         );
//         await conn.commit();
//         result = { ok: true };
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//         result = { ok: false, error: e.message };
//       } finally {
//         await conn.close();
//       }
//     }
//     if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };
//   }

//   const advanceRemaining = openAdvances.map((a) => ({ ...a }));
//   for (const a of applications) {
//     const invoiceId = parseInt(a.invoiceId, 10);
//     const payNow = Number(a.payNow || 0);
//     const fromAdvance = Number(a.fromAdvance || 0);
//     if (!invoiceId || (payNow <= 0 && fromAdvance <= 0)) continue;

//     if (payNow > 0 && paymentId) {
//       let lineId;
//       {
//         const conn = await getConnection();
//         try {
//           const r = await conn.execute(`SELECT XX_AP_PAYMENT_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//           lineId = (r.rows || [])[0].id;
//         } finally {
//           await conn.close();
//         }
//       }
//       {
//         const conn = await getConnection();
//         try {
//           await conn.execute(`INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT) VALUES (:id, :pid, :iid, :amt)`, { id: lineId, pid: paymentId, iid: invoiceId, amt: payNow });
//           await conn.commit();
//         } catch (e) {
//           try { await conn.rollback(); } catch (_) { /* ignore */ }
//         } finally {
//           await conn.close();
//         }
//       }
//       {
//         const conn = await getConnection();
//         try {
//           await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: payNow, iid: invoiceId });
//           await conn.commit();
//         } catch (e) {
//           try { await conn.rollback(); } catch (_) { /* ignore */ }
//         } finally {
//           await conn.close();
//         }
//       }
//     }

//     if (fromAdvance > 0) {
//       let left = fromAdvance;
//       for (const adv of advanceRemaining) {
//         if (left <= 0) break;
//         const take = Math.min(left, Number(adv.BALANCE_AMOUNT));
//         if (take <= 0) continue;
//         let adjId;
//         {
//           const conn = await getConnection();
//           try {
//             const r = await conn.execute(`SELECT XX_AP_ADV_ADJ_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//             adjId = (r.rows || [])[0].id;
//           } finally {
//             await conn.close();
//           }
//         }
//         {
//           const conn = await getConnection();
//           try {
//             await conn.execute(
//               `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT, PAYMENT_ID) VALUES (:id, :advid, :iid, :amt, :pid)`,
//               { id: adjId, advid: adv.ADVANCE_ID, iid: invoiceId, amt: take, pid: paymentId }
//             );
//             await conn.commit();
//           } catch (e) {
//             try { await conn.rollback(); } catch (_) { /* ignore */ }
//           } finally {
//             await conn.close();
//           }
//         }
//         {
//           const conn = await getConnection();
//           try {
//             await conn.execute(
//               `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
//                  STATUS = CASE WHEN ADVANCE_AMOUNT - (ADJUSTED_AMOUNT + :amt) <= 0 THEN 'Fully Adjusted' ELSE 'Partially Adjusted' END,
//                  LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//               { amt: take, advid: adv.ADVANCE_ID }
//             );
//             await conn.commit();
//           } catch (e) {
//             try { await conn.rollback(); } catch (_) { /* ignore */ }
//           } finally {
//             await conn.close();
//           }
//         }
//         {
//           const conn = await getConnection();
//           try {
//             await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: take, iid: invoiceId });
//             await conn.commit();
//           } catch (e) {
//             try { await conn.rollback(); } catch (_) { /* ignore */ }
//           } finally {
//             await conn.close();
//           }
//         }
//         adv.BALANCE_AMOUNT = Number(adv.BALANCE_AMOUNT) - take;
//         left -= take;
//       }
//     }

//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
//              WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
//              WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
//              ELSE STATUS END WHERE INVOICE_ID = :iid`,
//           { iid: invoiceId }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//   }

//   const journalLines = [];
//   if (totalPayNow + totalFromAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, debit: totalPayNow + totalFromAdvance, desc: 'Invoices settled' });
//   if (totalPayNow > 0) journalLines.push({ account: bankAccount, credit: totalPayNow, desc: paymentNo || 'Payment' });
//   if (totalFromAdvance > 0) journalLines.push({ account: AP_ADVANCE_ACCOUNT, credit: totalFromAdvance, desc: 'Advance applied' });
//   await postJournal('AP', 'PAYMENT', paymentId || 0, supplierId, date, 'Settlement' + (paymentNo ? ` ${paymentNo}` : ''), journalLines);

//   return { status: 200, body: { ok: true, paymentNo, totalPayNow, totalFromAdvance } };
// };

// // ---------------------------------------------------------------- cancel an invoice
// export const cancelInvoice = async (body) => {
//   const invoiceId = parseInt(body.invoice_id, 10);
//   if (!invoiceId) return { status: 400, body: { ok: false, error: 'invoice_id is required' } };

//   let rows;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       rows = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const invoice = rows[0];
//   if (!invoice) return { status: 400, body: { ok: false, error: 'Invoice not found' } };
//   if (invoice.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Invoice is already cancelled' } };
//   if (Number(invoice.PAID_AMOUNT) > 0) return { status: 400, body: { ok: false, error: 'This invoice has cash payments recorded — cancel the related payment(s) first.' } };
//   if (await isPosted('AP', 'INVOICE', invoiceId)) return { status: 400, body: { ok: false, error: 'This invoice has already been posted to the general ledger and can no longer be cancelled.' } };

//   let adjustments;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       adjustments = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   for (const adj of adjustments) {
//     if (adj.PAYMENT_ID !== null) return { status: 400, body: { ok: false, error: 'This invoice has an advance applied via a payment — cancel that payment first.' } };
//   }

//   for (const adj of adjustments) {
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
//              STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//           { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//   }

//   let lines;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT ACCOUNT_CODE AS "code", LINE_AMOUNT AS "amount", ITEM_DESCRIPTION AS "desc" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       lines = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const journalLines = [{ account: AP_PAYABLE_ACCOUNT, debit: Number(invoice.GROSS_AMOUNT) + Number(invoice.TAX_AMOUNT), desc: 'Invoice cancelled' }];
//   for (const l of lines) journalLines.push({ account: l.code, credit: l.amount, desc: l.desc });
//   await postJournal('AP', 'INVOICE', invoiceId, invoice.SUPPLIER_ID, new Date().toISOString().slice(0, 10), `Invoice ${invoice.INVOICE_NO} cancelled`, journalLines);

//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { id: invoiceId });
//       await conn.commit();
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//     } finally {
//       await conn.close();
//     }
//   }

//   return { status: 200, body: { ok: true, invoiceNo: invoice.INVOICE_NO } };
// };

// // ---------------------------------------------------------------- cancel a payment
// export const cancelPayment = async (body) => {
//   const paymentId = parseInt(body.payment_id, 10);
//   if (!paymentId) return { status: 400, body: { ok: false, error: 'payment_id is required' } };

//   let rows;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: paymentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       rows = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const payment = rows[0];
//   if (!payment) return { status: 400, body: { ok: false, error: 'Payment not found' } };
//   if (payment.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Payment is already cancelled' } };
//   if (await isPosted('AP', 'PAYMENT', paymentId)) return { status: 400, body: { ok: false, error: 'This payment has already been posted to the general ledger and can no longer be cancelled.' } };

//   let payLines;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id: paymentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       payLines = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   let advAdjustments;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id: paymentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       advAdjustments = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }

//   let totalCash = 0, totalAdvance = 0;

//   for (const pl of payLines) {
//     totalCash += Number(pl.APPLIED_AMOUNT);
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT - :amt,
//              STATUS = CASE
//                WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - (PAID_AMOUNT - :amt) <= 0 THEN 'Paid'
//                WHEN ADVANCE_ADJUSTED + (PAID_AMOUNT - :amt) > 0 THEN 'Partially Paid'
//                ELSE 'Draft' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//           { amt: pl.APPLIED_AMOUNT, iid: pl.INVOICE_ID }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//   }

//   for (const adj of advAdjustments) {
//     totalAdvance += Number(adj.ADJUSTED_AMOUNT);
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
//              STATUS = CASE WHEN ADJUSTED_AMOUNT - :amt <= 0 THEN 'Open' ELSE 'Partially Adjusted' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//           { amt: adj.ADJUSTED_AMOUNT, advid: adj.ADVANCE_ID }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(
//           `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED - :amt,
//              STATUS = CASE
//                WHEN GROSS_AMOUNT + TAX_AMOUNT - (ADVANCE_ADJUSTED - :amt) - PAID_AMOUNT <= 0 THEN 'Paid'
//                WHEN (ADVANCE_ADJUSTED - :amt) + PAID_AMOUNT > 0 THEN 'Partially Paid'
//                ELSE 'Draft' END,
//              LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
//           { amt: adj.ADJUSTED_AMOUNT, iid: adj.INVOICE_ID }
//         );
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//     {
//       const conn = await getConnection();
//       try {
//         await conn.execute(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
//         await conn.commit();
//       } catch (e) {
//         try { await conn.rollback(); } catch (_) { /* ignore */ }
//       } finally {
//         await conn.close();
//       }
//     }
//   }

//   const journalLines = [];
//   if (totalCash + totalAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: totalCash + totalAdvance, desc: 'Settlement reversed' });
//   if (totalCash > 0) journalLines.push({ account: payment.BANK_ACCOUNT_CODE, debit: totalCash, desc: `Payment ${payment.PAYMENT_NO} cancelled` });
//   if (totalAdvance > 0) journalLines.push({ account: AP_ADVANCE_ACCOUNT, debit: totalAdvance, desc: 'Advance restored' });
//   if (journalLines.length) await postJournal('AP', 'PAYMENT', paymentId, payment.SUPPLIER_ID, new Date().toISOString().slice(0, 10), `Payment ${payment.PAYMENT_NO} cancelled`, journalLines);

//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(`UPDATE XX_AP_PAYMENT_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`, { id: paymentId });
//       await conn.commit();
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//     } finally {
//       await conn.close();
//     }
//   }

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

//   let rows;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       rows = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const advance = rows[0];
//   if (!advance) return { status: 400, body: { ok: false, error: 'Advance not found' } };
//   if (advance.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'This advance is cancelled' } };
//   if (amount > Number(advance.BALANCE_AMOUNT) + 0.001) return { status: 400, body: { ok: false, error: 'Refund amount exceeds the available (unadjusted) advance balance' } };

//   let refundId;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT XX_AP_ADV_REFUND_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       refundId = (r.rows || [])[0].id;
//     } finally {
//       await conn.close();
//     }
//   }
//   const refundNo = 'REF-' + String(refundId).padStart(6, '0');

//   let result;
//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(
//         `INSERT INTO XX_AP_ADVANCE_REFUND_T (REFUND_ID, REFUND_NO, ADVANCE_ID, REFUND_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, REFUND_AMOUNT, REMARKS)
//          VALUES (:id, :no, :advid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :amt, :p_remarks)`,
//         { id: refundId, no: refundNo, advid: advanceId, p_date: date, bank: bankAccount, method, ref, amt: amount, p_remarks: remarks }
//       );
//       await conn.commit();
//       result = { ok: true };
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//       result = { ok: false, error: e.message };
//     } finally {
//       await conn.close();
//     }
//   }
//   if (!result.ok) return { status: 400, body: { ok: false, error: result.error } };

//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(
//         `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT + :amt,
//            STATUS = CASE
//              WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT + :amt) > 0 THEN 'Partially Adjusted'
//              WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted'
//              ELSE 'Refunded' END,
//            LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//         { amt: amount, advid: advanceId }
//       );
//       await conn.commit();
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//     } finally {
//       await conn.close();
//     }
//   }

//   const jrn = await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, date, `Advance ${advance.ADVANCE_NO} refunded` + (ref ? ` (${ref})` : ''), [
//     { account: bankAccount, debit: amount, desc: `Refund ${refundNo}` },
//     { account: AP_ADVANCE_ACCOUNT, credit: amount, desc: `Advance ${advance.ADVANCE_NO} refunded` },
//   ]);

//   return { status: 200, body: { ok: true, refundId, refundNo, amount, journalOk: jrn.ok } };
// };

// // ---------------------------------------------------------------- cancel an advance refund
// export const cancelRefund = async (body) => {
//   const refundId = parseInt(body.refund_id, 10);
//   if (!refundId) return { status: 400, body: { ok: false, error: 'refund_id is required' } };

//   let rows;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id`, { id: refundId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       rows = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const refund = rows[0];
//   if (!refund) return { status: 400, body: { ok: false, error: 'Refund not found' } };
//   if (refund.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Refund is already cancelled' } };
//   if (await isPosted('AP', 'REFUND', refundId)) return { status: 400, body: { ok: false, error: 'This refund has already been posted to the general ledger and can no longer be cancelled.' } };

//   let advRows;
//   {
//     const conn = await getConnection();
//     try {
//       const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: refund.ADVANCE_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//       advRows = r.rows || [];
//     } finally {
//       await conn.close();
//     }
//   }
//   const advance = advRows[0];
//   if (!advance) return { status: 400, body: { ok: false, error: 'Related advance not found' } };

//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(
//         `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT - :amt,
//            STATUS = CASE
//              WHEN ADVANCE_AMOUNT - ADJUSTED_AMOUNT - (REFUNDED_AMOUNT - :amt) <= 0 THEN
//                CASE WHEN ADJUSTED_AMOUNT > 0 THEN 'Fully Adjusted' ELSE 'Refunded' END
//              WHEN ADJUSTED_AMOUNT > 0 OR (REFUNDED_AMOUNT - :amt) > 0 THEN 'Partially Adjusted'
//              ELSE 'Open' END,
//            LAST_UPDATED_DATE = SYSDATE WHERE ADVANCE_ID = :advid`,
//         { amt: refund.REFUND_AMOUNT, advid: refund.ADVANCE_ID }
//       );
//       await conn.commit();
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//     } finally {
//       await conn.close();
//     }
//   }

//   await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, new Date().toISOString().slice(0, 10), `Refund ${refund.REFUND_NO} cancelled`, [
//     { account: AP_ADVANCE_ACCOUNT, debit: refund.REFUND_AMOUNT, desc: 'Advance refund reversed' },
//     { account: refund.BANK_ACCOUNT_CODE, credit: refund.REFUND_AMOUNT, desc: `Refund ${refund.REFUND_NO} cancelled` },
//   ]);

//   {
//     const conn = await getConnection();
//     try {
//       await conn.execute(`UPDATE XX_AP_ADVANCE_REFUND_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`, { id: refundId });
//       await conn.commit();
//     } catch (e) {
//       try { await conn.rollback(); } catch (_) { /* ignore */ }
//     } finally {
//       await conn.close();
//     }
//   }

//   return { status: 200, body: { ok: true, refundNo: refund.REFUND_NO } };
// };


// Accounts Payable routes — a direct port of D:\xampp\htdocs\hms\payable\api.php.
import { getConnection, oracledb } from '../../config/db.js';
import { postJournal, isPosted } from '../gl/service.js';

// Real CHART_OF_ACCOUNT leaf accounts added specifically for this module (see
// XX_AP_ADV_RFD_BANK_FK2 etc. — the whole app now points at this one chart).
const AP_PAYABLE_ACCOUNT = '3020020000'; // Accounts Payable - Trade (liability)
const AP_ADVANCE_ACCOUNT = '1020130000'; // Advances to Suppliers (asset) — clearing account
// The AR side's equivalent control accounts — excluded from AP's own account
// pickers below. All four control accounts live in the same shared real chart,
// so without this exclusion the AP line/expense dropdown would also offer
// "Accounts Receivable - Trade" and "Advance from Customers", which make no
// sense on a vendor-facing line.
const AR_RECEIVABLE_ACCOUNT = '1020120000';
const AR_ADVANCE_ACCOUNT = '3020030000';

// ---------------------------------------------------------------- vendors
// Reads the company's real supplier master (SUPPLIER_INFO, copied over from the
// BWA instance) — not a synthetic table of this module's own. STATUS there is a
// NUMBER (1 = active), unlike this app's own earlier 'Y'/'N' convention.
export const listVendors = async () => {
  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT SUPPLIER_ID AS "id", SUPPLIER_NAME AS "name" FROM SUPPLIER_INFO WHERE STATUS=1 ORDER BY SUPPLIER_NAME`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return { status: 200, body: rows };
};

// ---------------------------------------------------------------- chart of accounts
// Reads the company's real chart directly: ACCOUNT_TYPE=1 flags a cash/bank leaf
// (the same flag the existing GL app's own cash dashboard uses), LASTLEVEL=1 flags
// any posting-level leaf account (as opposed to a grouping/header node).
export const getCoa = async () => {
  // Excludes all four control accounts (both AP's own and AR's) — a line is
  // always a real posting/expense-type account, never one of the clearing
  // accounts the app manages automatically.
  let expense;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
          WHERE LASTLEVEL = 1 AND ENABLED = 1 AND NVL(ACCOUNT_TYPE,0) != 1
            AND ACCOUNT_ID NOT IN (:pay, :apAdv, :arRec, :arAdv) ORDER BY ACCOUNT_NAME`,
        { pay: AP_PAYABLE_ACCOUNT, apAdv: AP_ADVANCE_ACCOUNT, arRec: AR_RECEIVABLE_ACCOUNT, arAdv: AR_ADVANCE_ACCOUNT },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      expense = result.rows || [];
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
  // A payable invoice records a real expense — scoped to just Expense accounts
  // (code starting '5', this chart's convention), unlike the broader 'expense'
  // list above which Advance lines use for free-form earmarking (e.g. an
  // Equipment Deposit, code '1...', is a valid thing to advance against but not
  // a valid thing to invoice as an expense).
  let invoiceExpense;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT ACCOUNT_ID AS "code", ACCOUNT_NAME AS "name" FROM CHART_OF_ACCOUNT
          WHERE LASTLEVEL = 1 AND ENABLED = 1 AND ACCOUNT_ID LIKE '5%' ORDER BY ACCOUNT_NAME`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      invoiceExpense = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return { status: 200, body: { expense, invoiceExpense, bank } };
};

// ---------------------------------------------------------------- one vendor's full picture
export const getVendor = async (params) => {
  const supplierId = parseInt(params.id, 10);
  if (!supplierId) return { status: 400, body: { ok: false, error: 'id is required' } };

  let sup;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT SUPPLIER_NAME FROM SUPPLIER_INFO WHERE SUPPLIER_ID = :id`, { id: supplierId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      sup = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  if (!sup.length) return { status: 400, body: { ok: false, error: 'Vendor not found' } };

  let invoiceRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT INVOICE_ID AS "id", INVOICE_NO AS "no", SUPPLIER_INVOICE_NO AS "supNo",
                TO_CHAR(DUE_DATE,'YYYY-MM-DD') AS "due", TOTAL_AMOUNT AS "total", BALANCE_DUE AS "balance",
                ADVANCE_ADJUSTED AS "advanceAdjusted", PAID_AMOUNT AS "paid", STATUS AS "status", REMARKS AS "note"
           FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY DUE_DATE`,
        { id: supplierId },
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
           FROM XX_AP_ADVANCE_ADJUSTMENT_T aa JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = aa.ADVANCE_ID
          WHERE a.SUPPLIER_ID = :id`,
        { id: supplierId },
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
           FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :id AND STATUS != 'Cancelled' ORDER BY ADVANCE_DATE DESC`,
        { id: supplierId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      advanceRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

  let ledgerRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT h.JOURNAL_ID AS "journalId", h.JOURNAL_NO AS "journalNo", h.SOURCE_ID AS "sourceId",
                h.DESCRIPTION AS "description", TO_CHAR(h.JOURNAL_DATE,'YYYY-MM-DD') AS "date",
                h.TOTAL_AMOUNT AS "amount", h.SOURCE_TYPE AS "sourceType"
           FROM XX_AP_JOURNAL_H_T h WHERE h.SUPPLIER_ID = :id ORDER BY h.JOURNAL_ID DESC FETCH FIRST 20 ROWS ONLY`,
        { id: supplierId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      ledgerRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  for (const l of ledgerRows) l.positive = l.sourceType === 'ADVANCE';

  let paymentRows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT PAYMENT_ID AS "id", PAYMENT_NO AS "no", TO_CHAR(PAYMENT_DATE,'YYYY-MM-DD') AS "date",
                TOTAL_AMOUNT AS "total", STATUS AS "status"
           FROM XX_AP_PAYMENT_H_T WHERE SUPPLIER_ID = :id ORDER BY PAYMENT_ID DESC`,
        { id: supplierId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      paymentRows = result.rows || [];
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
           FROM XX_AP_ADVANCE_REFUND_T r JOIN XX_AP_ADVANCE_T a ON a.ADVANCE_ID = r.ADVANCE_ID
          WHERE a.SUPPLIER_ID = :id ORDER BY r.REFUND_ID DESC`,
        { id: supplierId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      refundRows = result.rows || [];
    } finally {
      await conn.close();
    }
  }

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
// SUPPLIER_INFO.SUPPLIER_ID is assigned by its own SUPPLIER_AUTONUMBER trigger
// (SUPPLIER_SEQ), so it's omitted here — reading SUPPLIER_SEQ.CURRVAL right after
// the insert (same connection, before anything else touches that sequence) gives
// back the id that was just generated.
export const createVendor = async (body) => {
  const name = (body.name || '').trim();
  if (!name) return { status: 400, body: { ok: false, error: 'Vendor name is required' } };
  let result;
  let id;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO SUPPLIER_INFO (SUPPLIER_NAME, CONTACT_PERSON, PHONE, EMAIL, ADDRESS, STATUS)
         VALUES (:name, :contact, :phone, :email, :address, 1)`,
        { name, contact: body.contact || null, phone: body.phone || null, email: body.email || null, address: body.address || null }
      );
      // CURRVAL is session-scoped — read it on this same connection, otherwise
      // a pooled reconnect raises ORA-08002.
      const r = await conn.execute(`SELECT SUPPLIER_SEQ.CURRVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
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

// ---------------------------------------------------------------- record a new advance
export const recordAdvance = async (body) => {
  const supplierId = parseInt(body.supplier_id, 10);
  const date = (body.date || '').trim();
  const bankAccount = (body.bank_account_code || '').trim();
  const method = body.method || '';
  const ref = (body.reference_no || '').trim();
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!supplierId || !date || !bankAccount) return { status: 400, body: { ok: false, error: 'supplier_id, date and bank_account_code are required' } };

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
      const r = await conn.execute(`SELECT XX_AP_ADVANCE_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      advanceId = (r.rows || [])[0].id;
    } finally {
      await conn.close();
    }
  }
  const advanceNo = 'ADV-' + String(advanceId).padStart(6, '0');

  let result;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO XX_AP_ADVANCE_T (ADVANCE_ID, ADVANCE_NO, SUPPLIER_ID, ADVANCE_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, ADVANCE_AMOUNT)
         VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :ref, :total)`,
        { id: advanceId, no: advanceNo, sid: supplierId, p_date: date, bank: bankAccount, method, ref, total }
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

  // The journal side always debits the fixed Advances-to-Suppliers control account
  // (AP_ADVANCE_ACCOUNT) — not each line's own account. The per-line account is
  // purely descriptive earmarking, stored on XX_AP_ADVANCE_L_T for reference; it
  // was a bug for it to also drive the journal, since the later invoice-apply step
  // always credits AP_ADVANCE_ACCOUNT specifically — crediting an account that was
  // never debited by the original advance, so its balance never reflected real
  // advance balances and only ever went negative as advances were applied.
  let lineNo = 1;
  const journalLines = [];
  for (const line of validLines) {
    let lineId;
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AP_ADVANCE_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        lineId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AP_ADVANCE_L_T (ADVANCE_LINE_ID, ADVANCE_ID, LINE_NO, ACCOUNT_CODE, DESCRIPTION, AMOUNT) VALUES (:id, :aid, :lno, :acc, :desc, :amt)`,
          { id: lineId, aid: advanceId, lno: lineNo, acc: line.account, desc: line.desc, amt: line.amount }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    journalLines.push({ account: AP_ADVANCE_ACCOUNT, debit: line.amount, desc: line.desc });
    lineNo++;
  }
  journalLines.push({ account: bankAccount, credit: total, desc: `Advance ${advanceNo} paid` });
  const jrn = await postJournal('AP', 'ADVANCE', advanceId, supplierId, date, `Advance payment ${advanceNo}` + (ref ? ` (${ref})` : ''), journalLines);

  return { status: 200, body: { ok: true, advanceId, advanceNo, total, journalOk: jrn.ok } };
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

  let dup;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT 1 FROM XX_AP_INVOICE_H_T WHERE SUPPLIER_ID = :sid AND UPPER(INVOICE_NO) = UPPER(:no)`, { sid: supplierId, no: invoiceNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      dup = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  if (dup.length) return { status: 400, body: { ok: false, error: `${invoiceNo} already exists for this vendor` } };

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
        const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id AND SUPPLIER_ID = :sid`, { id: linkAdvanceId, sid: supplierId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        advRows = r.rows || [];
      } finally {
        await conn.close();
      }
    }
    advance = advRows[0] || null;
    if (!advance) return { status: 400, body: { ok: false, error: 'Selected advance not found for this vendor' } };
    if (applyAmount <= 0) return { status: 400, body: { ok: false, error: 'Enter an amount to apply from the linked advance' } };
    if (applyAmount > Math.min(Number(advance.BALANCE_AMOUNT), gross) + 0.001) {
      return { status: 400, body: { ok: false, error: 'Apply amount exceeds the advance balance or the invoice total' } };
    }
  }

  let invoiceId;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT XX_AP_INVOICE_H_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
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
        `INSERT INTO XX_AP_INVOICE_H_T (INVOICE_ID, INVOICE_NO, SUPPLIER_ID, INVOICE_DATE, DUE_DATE, GROSS_AMOUNT, REMARKS)
         VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), TO_DATE(:p_due,'YYYY-MM-DD'), :gross, :p_note)`,
        { id: invoiceId, no: invoiceNo, sid: supplierId, p_date: invoiceDate, p_due: dueDate, gross, p_note: note }
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
  const journalLines = [];
  for (const line of validLines) {
    let lineId;
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AP_INVOICE_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        lineId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AP_INVOICE_L_T (INVOICE_LINE_ID, INVOICE_ID, LINE_NO, ACCOUNT_CODE, ITEM_DESCRIPTION, QTY, UNIT_PRICE)
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
    journalLines.push({ account: line.account, debit: line.amount, desc: line.desc });
    lineNo++;
  }
  journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: gross, desc: `Invoice ${invoiceNo}` });
  await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, `Payable invoice ${invoiceNo}`, journalLines);

  if (advance && applyAmount > 0) {
    let adjId;
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AP_ADV_ADJ_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        adjId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT) VALUES (:id, :aid, :iid, :amt)`,
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
          `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
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
          `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = :amt,
             STATUS = CASE WHEN GROSS_AMOUNT - :amt <= 0 THEN 'Paid' ELSE 'Partially Paid' END,
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
    await postJournal('AP', 'INVOICE', invoiceId, supplierId, invoiceDate, `Advance ${advance.ADVANCE_NO} applied to ${invoiceNo}`, [
      { account: AP_PAYABLE_ACCOUNT, debit: applyAmount, desc: 'Advance applied' },
      { account: AP_ADVANCE_ACCOUNT, credit: applyAmount, desc: `Advance ${advance.ADVANCE_NO}` },
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

  let openAdvances;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(
        `SELECT ADVANCE_ID, BALANCE_AMOUNT FROM XX_AP_ADVANCE_T WHERE SUPPLIER_ID = :sid AND STATUS != 'Cancelled' AND BALANCE_AMOUNT > 0 ORDER BY ADVANCE_DATE, ADVANCE_ID`,
        { sid: supplierId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      openAdvances = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const availableAdvance = openAdvances.reduce((s, a) => s + Number(a.BALANCE_AMOUNT), 0);
  if (totalFromAdvance > availableAdvance + 0.001) return { status: 400, body: { ok: false, error: 'Requested advance offset exceeds available advance balance' } };

  let paymentId = null, paymentNo = null;
  if (totalPayNow > 0) {
    {
      const conn = await getConnection();
      try {
        const r = await conn.execute(`SELECT XX_AP_PAYMENT_H_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        paymentId = (r.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    paymentNo = 'PAY-' + String(paymentId).padStart(6, '0');
    let result;
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO XX_AP_PAYMENT_H_T (PAYMENT_ID, PAYMENT_NO, SUPPLIER_ID, PAYMENT_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, TOTAL_AMOUNT)
           VALUES (:id, :no, :sid, TO_DATE(:p_date,'YYYY-MM-DD'), :bank, :method, :total)`,
          { id: paymentId, no: paymentNo, sid: supplierId, p_date: date, bank: bankAccount, method, total: totalPayNow }
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

    if (payNow > 0 && paymentId) {
      let lineId;
      {
        const conn = await getConnection();
        try {
          const r = await conn.execute(`SELECT XX_AP_PAYMENT_L_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
          lineId = (r.rows || [])[0].id;
        } finally {
          await conn.close();
        }
      }
      {
        const conn = await getConnection();
        try {
          await conn.execute(`INSERT INTO XX_AP_PAYMENT_L_T (PAYMENT_LINE_ID, PAYMENT_ID, INVOICE_ID, APPLIED_AMOUNT) VALUES (:id, :pid, :iid, :amt)`, { id: lineId, pid: paymentId, iid: invoiceId, amt: payNow });
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
          await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: payNow, iid: invoiceId });
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
            const r = await conn.execute(`SELECT XX_AP_ADV_ADJ_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            adjId = (r.rows || [])[0].id;
          } finally {
            await conn.close();
          }
        }
        {
          const conn = await getConnection();
          try {
            await conn.execute(
              `INSERT INTO XX_AP_ADVANCE_ADJUSTMENT_T (ADJUSTMENT_ID, ADVANCE_ID, INVOICE_ID, ADJUSTED_AMOUNT, PAYMENT_ID) VALUES (:id, :advid, :iid, :amt, :pid)`,
              { id: adjId, advid: adv.ADVANCE_ID, iid: invoiceId, amt: take, pid: paymentId }
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
              `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT + :amt,
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
            await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED + :amt, LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`, { amt: take, iid: invoiceId });
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
          `UPDATE XX_AP_INVOICE_H_T SET STATUS = CASE
             WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - PAID_AMOUNT <= 0 THEN 'Paid'
             WHEN ADVANCE_ADJUSTED + PAID_AMOUNT > 0 THEN 'Partially Paid'
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
  if (totalPayNow + totalFromAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, debit: totalPayNow + totalFromAdvance, desc: 'Invoices settled' });
  if (totalPayNow > 0) journalLines.push({ account: bankAccount, credit: totalPayNow, desc: paymentNo || 'Payment' });
  if (totalFromAdvance > 0) journalLines.push({ account: AP_ADVANCE_ACCOUNT, credit: totalFromAdvance, desc: 'Advance applied' });
  await postJournal('AP', 'PAYMENT', paymentId || 0, supplierId, date, 'Settlement' + (paymentNo ? ` ${paymentNo}` : ''), journalLines);

  return { status: 200, body: { ok: true, paymentNo, totalPayNow, totalFromAdvance } };
};

// ---------------------------------------------------------------- cancel an invoice
export const cancelInvoice = async (body) => {
  const invoiceId = parseInt(body.invoice_id, 10);
  if (!invoiceId) return { status: 400, body: { ok: false, error: 'invoice_id is required' } };

  let rows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AP_INVOICE_H_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const invoice = rows[0];
  if (!invoice) return { status: 400, body: { ok: false, error: 'Invoice not found' } };
  if (invoice.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Invoice is already cancelled' } };
  if (Number(invoice.PAID_AMOUNT) > 0) return { status: 400, body: { ok: false, error: 'This invoice has cash payments recorded — cancel the related payment(s) first.' } };
  if (await isPosted('AP', 'INVOICE', invoiceId)) return { status: 400, body: { ok: false, error: 'This invoice has already been posted to the general ledger and can no longer be cancelled.' } };

  let adjustments;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      adjustments = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  for (const adj of adjustments) {
    if (adj.PAYMENT_ID !== null) return { status: 400, body: { ok: false, error: 'This invoice has an advance applied via a payment — cancel that payment first.' } };
  }

  for (const adj of adjustments) {
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
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
        await conn.execute(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
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
      const r = await conn.execute(`SELECT ACCOUNT_CODE AS "code", LINE_AMOUNT AS "amount", ITEM_DESCRIPTION AS "desc" FROM XX_AP_INVOICE_L_T WHERE INVOICE_ID = :id`, { id: invoiceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      lines = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const journalLines = [{ account: AP_PAYABLE_ACCOUNT, debit: Number(invoice.GROSS_AMOUNT) + Number(invoice.TAX_AMOUNT), desc: 'Invoice cancelled' }];
  for (const l of lines) journalLines.push({ account: l.code, credit: l.amount, desc: l.desc });
  await postJournal('AP', 'INVOICE', invoiceId, invoice.SUPPLIER_ID, new Date().toISOString().slice(0, 10), `Invoice ${invoice.INVOICE_NO} cancelled`, journalLines);

  {
    const conn = await getConnection();
    try {
      await conn.execute(`UPDATE XX_AP_INVOICE_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :id`, { id: invoiceId });
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

  return { status: 200, body: { ok: true, invoiceNo: invoice.INVOICE_NO } };
};

// ---------------------------------------------------------------- cancel a payment
export const cancelPayment = async (body) => {
  const paymentId = parseInt(body.payment_id, 10);
  if (!paymentId) return { status: 400, body: { ok: false, error: 'payment_id is required' } };

  let rows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AP_PAYMENT_H_T WHERE PAYMENT_ID = :id`, { id: paymentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const payment = rows[0];
  if (!payment) return { status: 400, body: { ok: false, error: 'Payment not found' } };
  if (payment.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Payment is already cancelled' } };
  if (await isPosted('AP', 'PAYMENT', paymentId)) return { status: 400, body: { ok: false, error: 'This payment has already been posted to the general ledger and can no longer be cancelled.' } };

  let payLines;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AP_PAYMENT_L_T WHERE PAYMENT_ID = :id`, { id: paymentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      payLines = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  let advAdjustments;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE PAYMENT_ID = :id`, { id: paymentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      advAdjustments = r.rows || [];
    } finally {
      await conn.close();
    }
  }

  let totalCash = 0, totalAdvance = 0;

  for (const pl of payLines) {
    totalCash += Number(pl.APPLIED_AMOUNT);
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE XX_AP_INVOICE_H_T SET PAID_AMOUNT = PAID_AMOUNT - :amt,
             STATUS = CASE
               WHEN GROSS_AMOUNT + TAX_AMOUNT - ADVANCE_ADJUSTED - (PAID_AMOUNT - :amt) <= 0 THEN 'Paid'
               WHEN ADVANCE_ADJUSTED + (PAID_AMOUNT - :amt) > 0 THEN 'Partially Paid'
               ELSE 'Draft' END,
             LAST_UPDATED_DATE = SYSDATE WHERE INVOICE_ID = :iid`,
          { amt: pl.APPLIED_AMOUNT, iid: pl.INVOICE_ID }
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
          `UPDATE XX_AP_ADVANCE_T SET ADJUSTED_AMOUNT = ADJUSTED_AMOUNT - :amt,
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
          `UPDATE XX_AP_INVOICE_H_T SET ADVANCE_ADJUSTED = ADVANCE_ADJUSTED - :amt,
             STATUS = CASE
               WHEN GROSS_AMOUNT + TAX_AMOUNT - (ADVANCE_ADJUSTED - :amt) - PAID_AMOUNT <= 0 THEN 'Paid'
               WHEN (ADVANCE_ADJUSTED - :amt) + PAID_AMOUNT > 0 THEN 'Partially Paid'
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
        await conn.execute(`DELETE FROM XX_AP_ADVANCE_ADJUSTMENT_T WHERE ADJUSTMENT_ID = :id`, { id: adj.ADJUSTMENT_ID });
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
  }

  const journalLines = [];
  if (totalCash + totalAdvance > 0) journalLines.push({ account: AP_PAYABLE_ACCOUNT, credit: totalCash + totalAdvance, desc: 'Settlement reversed' });
  if (totalCash > 0) journalLines.push({ account: payment.BANK_ACCOUNT_CODE, debit: totalCash, desc: `Payment ${payment.PAYMENT_NO} cancelled` });
  if (totalAdvance > 0) journalLines.push({ account: AP_ADVANCE_ACCOUNT, debit: totalAdvance, desc: 'Advance restored' });
  if (journalLines.length) await postJournal('AP', 'PAYMENT', paymentId, payment.SUPPLIER_ID, new Date().toISOString().slice(0, 10), `Payment ${payment.PAYMENT_NO} cancelled`, journalLines);

  {
    const conn = await getConnection();
    try {
      await conn.execute(`UPDATE XX_AP_PAYMENT_H_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE PAYMENT_ID = :id`, { id: paymentId });
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

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

  let rows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: advanceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
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
      const r = await conn.execute(`SELECT XX_AP_ADV_REFUND_S.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      refundId = (r.rows || [])[0].id;
    } finally {
      await conn.close();
    }
  }
  const refundNo = 'REF-' + String(refundId).padStart(6, '0');

  let result;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO XX_AP_ADVANCE_REFUND_T (REFUND_ID, REFUND_NO, ADVANCE_ID, REFUND_DATE, BANK_ACCOUNT_CODE, PAYMENT_METHOD, REFERENCE_NO, REFUND_AMOUNT, REMARKS)
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
        `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT + :amt,
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

  const jrn = await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, date, `Advance ${advance.ADVANCE_NO} refunded` + (ref ? ` (${ref})` : ''), [
    { account: bankAccount, debit: amount, desc: `Refund ${refundNo}` },
    { account: AP_ADVANCE_ACCOUNT, credit: amount, desc: `Advance ${advance.ADVANCE_NO} refunded` },
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
      const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_REFUND_T WHERE REFUND_ID = :id`, { id: refundId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = r.rows || [];
    } finally {
      await conn.close();
    }
  }
  const refund = rows[0];
  if (!refund) return { status: 400, body: { ok: false, error: 'Refund not found' } };
  if (refund.STATUS === 'Cancelled') return { status: 400, body: { ok: false, error: 'Refund is already cancelled' } };
  if (await isPosted('AP', 'REFUND', refundId)) return { status: 400, body: { ok: false, error: 'This refund has already been posted to the general ledger and can no longer be cancelled.' } };

  let advRows;
  {
    const conn = await getConnection();
    try {
      const r = await conn.execute(`SELECT * FROM XX_AP_ADVANCE_T WHERE ADVANCE_ID = :id`, { id: refund.ADVANCE_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
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
        `UPDATE XX_AP_ADVANCE_T SET REFUNDED_AMOUNT = REFUNDED_AMOUNT - :amt,
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

  await postJournal('AP', 'REFUND', refundId, advance.SUPPLIER_ID, new Date().toISOString().slice(0, 10), `Refund ${refund.REFUND_NO} cancelled`, [
    { account: AP_ADVANCE_ACCOUNT, debit: refund.REFUND_AMOUNT, desc: 'Advance refund reversed' },
    { account: refund.BANK_ACCOUNT_CODE, credit: refund.REFUND_AMOUNT, desc: `Refund ${refund.REFUND_NO} cancelled` },
  ]);

  {
    const conn = await getConnection();
    try {
      await conn.execute(`UPDATE XX_AP_ADVANCE_REFUND_T SET STATUS = 'Cancelled', LAST_UPDATED_DATE = SYSDATE WHERE REFUND_ID = :id`, { id: refundId });
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }

  return { status: 200, body: { ok: true, refundNo: refund.REFUND_NO } };
};

// ---------------------------------------------------------------- read-only transaction details (view / print / excel)
const VIEW_TYPES = ['INVOICE', 'ADVANCE', 'PAYMENT', 'REFUND'];

async function runSelect(sql, binds = {}) {
  const conn = await getConnection();
  try {
    const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return r.rows || [];
  } finally {
    await conn.close();
  }
}

const num = (v) => Number(v || 0);

export const getTransaction = async (params, query = {}) => {
  const sourceType = String(params.sourceType || '').toUpperCase();
  if (!VIEW_TYPES.includes(sourceType)) return { status: 400, body: { ok: false, error: 'sourceType must be INVOICE, ADVANCE, PAYMENT or REFUND' } };
  const sourceId = parseInt(params.sourceId, 10);
  if (Number.isNaN(sourceId) || sourceId < 0) return { status: 400, body: { ok: false, error: 'Invalid sourceId' } };
  const journalId = parseInt(query.journalId, 10) || 0;

  let title = '', status = '', date = '', supplierId = null, note = '';
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
      { label: 'Balance due', value: h.balance, money: true }, { label: 'Remarks', value: h.note || '-' },
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
    summary = [
      { label: 'Date', value: h.date }, { label: 'Paid from', value: h.bank || '-' },
      { label: 'Method', value: h.method || '-' }, { label: 'Reference', value: h.ref || '-' },
      { label: 'Advance amount', value: h.total, money: true }, { label: 'Adjusted to invoices', value: h.adjusted, money: true },
      { label: 'Refunded', value: h.refunded, money: true }, { label: 'Balance', value: h.balance, money: true },
    ];
    const lines = await runSelect(
      `SELECT l.LINE_NO AS "lineNo", l.ACCOUNT_CODE AS "account", l.DESCRIPTION AS "desc", l.AMOUNT AS "amount"
         FROM XX_AP_ADVANCE_L_T l WHERE l.ADVANCE_ID = :id ORDER BY l.LINE_NO`, { id: sourceId });
    sections.push({ title: 'Advance lines', columns: [{ key: 'lineNo', label: '#' }, { key: 'account', label: 'Account' }, { key: 'desc', label: 'Description' }, { key: 'amount', label: 'Amount', money: true }], rows: lines });
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
      e = { journalId: r.journalId, journalNo: r.journalNo, date: r.date, description: r.description || '', kind: /cancel|revers/i.test(r.description || '') ? 'Reversal' : 'Original', lines: [] };
      entries.push(e);
    }
    e.lines.push({ account: r.account, accountName: r.accountName || '', debit: num(r.debit), credit: num(r.credit) });
    totalDebit += num(r.debit);
    totalCredit += num(r.credit);
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
      summary, sections: sections.filter((s) => s.rows.length),
      journal: { entries, totalDebit: Math.round(totalDebit * 100) / 100, totalCredit: Math.round(totalCredit * 100) / 100 },
    },
  };
};