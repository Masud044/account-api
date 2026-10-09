// Double-entry journal posting, shared by the AP and AR routes — a direct port of
// ap_post_journal()/ar_post_journal() from the PHP config.php files, including the
// best-effort mirror into the company's pre-existing general ledger
// (GLMASTER/GLDETAILS, not created by this app — see postLegacyGl below).
import { getConnection, oracledb } from '../../config/db.js';

/**
 * Posts a balanced double-entry journal for either module.
 * @param {'AP'|'AR'} module
 * @param lines array of {account, debit, credit, desc}
 */
export async function postJournal(module, sourceType, sourceId, partyId, date, description, lines) {
  let totalDebit = 0, totalCredit = 0;
  for (const l of lines) {
    totalDebit += Number(l.debit || 0);
    totalCredit += Number(l.credit || 0);
  }
  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { ok: false, error: `Journal out of balance: Debit ${totalDebit} vs Credit ${totalCredit}` };
  }

  const hTable = module === 'AP' ? 'XX_AP_JOURNAL_H_T' : 'XX_AR_JOURNAL_H_T';
  const lTable = module === 'AP' ? 'XX_AP_JOURNAL_L_T' : 'XX_AR_JOURNAL_L_T';
  const hSeq = module === 'AP' ? 'XX_AP_JOURNAL_H_S' : 'XX_AR_JOURNAL_H_S';
  const lSeq = module === 'AP' ? 'XX_AP_JOURNAL_L_S' : 'XX_AR_JOURNAL_L_S';
  const partyCol = module === 'AP' ? 'SUPPLIER_ID' : 'CUSTOMER_ID';

  let journalId;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT ${hSeq}.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      journalId = (result.rows || [])[0].id;
    } finally {
      await conn.close();
    }
  }
  const journalNo = (module === 'AP' ? 'JRN-' : 'JRN-AR-') + String(journalId).padStart(6, '0');

  let hResult;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO ${hTable} (JOURNAL_ID, JOURNAL_NO, JOURNAL_DATE, SOURCE_TYPE, SOURCE_ID, ${partyCol}, DESCRIPTION, TOTAL_AMOUNT)
         VALUES (:id, :no, TO_DATE(:p_date,'YYYY-MM-DD'), :stype, :sid, :partyid, :p_desc, :total)`,
        { id: journalId, no: journalNo, p_date: date, stype: sourceType, sid: sourceId, partyid: partyId, p_desc: description, total: totalDebit }
      );
      await conn.commit();
      hResult = { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      hResult = { ok: false, error: e.message };
    } finally {
      await conn.close();
    }
  }
  if (!hResult.ok) return hResult;

  let lineNo = 1;
  for (const l of lines) {
    const debit = Number(l.debit || 0), credit = Number(l.credit || 0);
    if (debit <= 0 && credit <= 0) continue;
    let lineId;
    {
      const conn = await getConnection();
      try {
        const result = await conn.execute(`SELECT ${lSeq}.NEXTVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        lineId = (result.rows || [])[0].id;
      } finally {
        await conn.close();
      }
    }
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO ${lTable} (JOURNAL_LINE_ID, JOURNAL_ID, LINE_NO, ACCOUNT_CODE, DEBIT_AMOUNT, CREDIT_AMOUNT, DESCRIPTION)
           VALUES (:id, :jid, :lno, :acc, :dr, :cr, :p_desc)`,
          { id: lineId, jid: journalId, lno: lineNo, acc: l.account, dr: debit, cr: credit, p_desc: l.desc || '' }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
    lineNo++;
  }

  await postLegacyGl(partyId, journalNo, date, description, lines);

  return { ok: true, journal_id: journalId, journal_no: journalNo };
}

/**
 * Mirrors a posting into the company's pre-existing general ledger (GLMASTER /
 * GLDETAILS). Account codes used throughout this app ARE the real
 * CHART_OF_ACCOUNT.ACCOUNT_ID values directly (no separate synthetic chart or
 * crosswalk — that was retired once the app switched to using CHART_OF_ACCOUNT as
 * its one chart of accounts). Lines sharing an account are merged (GLDETAILS
 * enforces one row per GLMASTERID+CODE). A single cash/bank line (ACCOUNT_TYPE=1,
 * the same flag the existing GL app's own cash dashboard uses) makes it a Receipt
 * (VOUCHER_TYPE=1) or Payment (2); otherwise it's a General Journal (3). Posted as
 * POSTED=0, same as any other new voucher there. Best-effort: never throws.
 */
async function postLegacyGl(partyId, voucherNo, date, description, lines) {
  const merged = {};
  for (const l of lines) {
    const debit = Number(l.debit || 0), credit = Number(l.credit || 0);
    if (debit <= 0 && credit <= 0) continue;
    const code = l.account;
    let accRows;
    {
      const conn = await getConnection();
      try {
        const result = await conn.execute(`SELECT ACCOUNT_NAME AS "name", ACCOUNT_TYPE AS "type" FROM CHART_OF_ACCOUNT WHERE ACCOUNT_ID = :code`, { code }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        accRows = result.rows || [];
      } finally {
        await conn.close();
      }
    }
    if (!accRows.length) continue; // unknown account — skip the legacy mirror for this line
    const { name, type } = accRows[0];
    if (!merged[code]) merged[code] = { debit: 0, credit: 0, desc: l.desc || '', isBank: Number(type) === 1, name };
    merged[code].debit += debit;
    merged[code].credit += credit;
  }
  const codes = Object.keys(merged);
  if (!codes.length) return;

  const cashCodes = codes.filter((c) => merged[c].isBank);
  let voucherType = 3, cashAccount = null;
  if (cashCodes.length === 1) {
    cashAccount = cashCodes[0];
    voucherType = merged[cashAccount].debit > 0 ? 1 : 2;
  }

  // CURRVAL is session-scoped, so the id must be read on the SAME connection
  // that performed the insert above — a pooled helper would land on a
  // different session and raise ORA-08002.
  let glResult;
  let glMasterId;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO GLMASTER (VOUCHERNO, TRANS_DATE, VOUCHER_TYPE, DESCRIPTION, CASHACCOUNT, POSTED, CUSTOMER_ID, GL_ENTRY_DATE)
         VALUES (:vno, TO_DATE(:p_date,'YYYY-MM-DD'), :vtype, :p_desc, :cash, 0, :party, TO_DATE(:p_date,'YYYY-MM-DD'))`,
        { vno: voucherNo, p_date: date, vtype: voucherType, p_desc: description, cash: cashAccount, party: partyId }
      );
      const idResult = await conn.execute(`SELECT GLD_SEQ.CURRVAL AS "id" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      glMasterId = (idResult.rows || [])[0].id;
      await conn.commit();
      glResult = { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      glResult = { ok: false, error: e.message };
    } finally {
      await conn.close();
    }
  }
  if (!glResult.ok) return;
  for (const code of codes) {
    const m = merged[code];
    {
      const conn = await getConnection();
      try {
        await conn.execute(
          `INSERT INTO GLDETAILS (GLMASTERID, CODE, DEBIT, CREDIT, CODEDESCRIPTION, DESCRIPTION)
           VALUES (:mid, :code, :dr, :cr, :cdesc, :p_desc)`,
          { mid: glMasterId, code, dr: m.debit, cr: m.credit, cdesc: m.name, p_desc: m.desc }
        );
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
      } finally {
        await conn.close();
      }
    }
  }
}

/**
 * True if any journal entry this app posted for a given source transaction
 * (an invoice, payment/receipt, refund, or advance — identified by its own
 * SOURCE_TYPE/SOURCE_ID in our journal, same as postJournal uses) has already
 * been marked POSTED=1 on its GLMASTER mirror voucher. Once that's happened the
 * transaction is part of the formally posted books, so this app should refuse
 * to cancel/reverse it from here — any correction at that point has to go
 * through the general ledger directly, not by unwinding it in this app.
 */
export async function isPosted(module, sourceType, sourceId) {
  let rows;
  {
    const conn = await getConnection();
    try {
      const jrnH = module === 'AP' ? 'XX_AP_JOURNAL_H_T' : 'XX_AR_JOURNAL_H_T';
      const result = await conn.execute(
        `SELECT COUNT(*) AS "cnt" FROM ${jrnH} h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
          WHERE h.SOURCE_TYPE = :st AND h.SOURCE_ID = :sid AND g.POSTED = 1`,
        { st: sourceType, sid: sourceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return Number(rows[0].cnt) > 0;
}

/**
 * Every GLMASTER voucher id (ascending, oldest first) ever posted for a given
 * source transaction — an invoice, payment/receipt, refund, or advance — via
 * the SOURCE_TYPE/SOURCE_ID it was journaled under (same identity postJournal
 * and isPosted use). A single transaction can have more than one: e.g. an
 * invoice gets one voucher when created and another if an advance is later
 * applied to it. Used by the attachments feature (GLDOC.GLMASTERID) to know
 * which voucher(s) a file should be filed against/looked up under.
 */
export async function resolveGlMasterIds(module, sourceType, sourceId) {
  let rows;
  {
    const conn = await getConnection();
    try {
      const jrnH = module === 'AP' ? 'XX_AP_JOURNAL_H_T' : 'XX_AR_JOURNAL_H_T';
      const result = await conn.execute(
        `SELECT g.ID AS "id" FROM ${jrnH} h JOIN GLMASTER g ON g.VOUCHERNO = h.JOURNAL_NO
          WHERE h.SOURCE_TYPE = :st AND h.SOURCE_ID = :sid ORDER BY g.ID ASC`,
        { st: sourceType, sid: sourceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return rows.map((r) => r.id);
}
