// Shared file-attachment routes — used against AP invoices/payments and AR
// invoices/receipts. Files are stored as BLOBs in the company's pre-existing
// GLDOC table (not created by this app) rather than on disk: each row links
// to a GLMASTER voucher via GLMASTERID. Since an entity's transaction is
// always journaled (postJournal/postLegacyGl in gl.js) before a user can get
// to its attachments button, there's always at least one GLMASTER voucher to
// hang the file on by the time this is called — new uploads go on the
// earliest one, but listing looks across every voucher that source ever got
// (e.g. an invoice's creation entry plus a later advance-applied entry) so a
// file never "disappears" depending on which voucher it landed on.
// ORIGINAL_NAME/MIME_TYPE/FILE_SIZE were added to GLDOC (it was empty, 0 rows)
// since the legacy table only ever carried the voucher link and the bytes.
import { getConnection, oracledb } from '../../config/db.js';
import { resolveGlMasterIds } from '../gl/service.js';

// entityType -> the {module, sourceType} postJournal/isPosted filed it under
const ENTITY_MAP = {
  AP_INVOICE: ['AP', 'INVOICE'],
  AP_PAYMENT: ['AP', 'PAYMENT'],
  AR_INVOICE: ['AR', 'INVOICE'],
  AR_RECEIPT: ['AR', 'RECEIPT'],
};

async function glMasterIdsFor(entityType, entityId) {
  const mapping = ENTITY_MAP[entityType];
  if (!mapping) return null;
  return resolveGlMasterIds(mapping[0], mapping[1], entityId);
}

// ---------------------------------------------------------------- list attachments for one entity
export const listAttachments = async (params) => {
  const entityType = params.entityType;
  const entityId = parseInt(params.entityId, 10);
  const glIds = entityId ? await glMasterIdsFor(entityType, entityId) : null;
  if (glIds === null) return { status: 400, body: { ok: false, error: 'entityType and entityId are required' } };
  if (!glIds.length) return { status: 200, body: [] };

  const placeholders = glIds.map((_, i) => `:g${i}`).join(',');
  const binds = {};
  glIds.forEach((id, i) => { binds[`g${i}`] = id; });
  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT ID AS "id", ORIGINAL_NAME AS "name", MIME_TYPE AS "mime", FILE_SIZE AS "size",
                TO_CHAR(CREATION_DATE,'YYYY-MM-DD HH24:MI') AS "date"
           FROM GLDOC WHERE GLMASTERID IN (${placeholders}) ORDER BY ID DESC`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  return { status: 200, body: rows };
};

// ---------------------------------------------------------------- upload a file against one entity
export const uploadAttachment = async (body, file) => {
  const entityType = body.entityType;
  const entityId = parseInt(body.entityId, 10);
  if (!file) return { status: 400, body: { ok: false, error: 'No file received' } };
  const glIds = entityId ? await glMasterIdsFor(entityType, entityId) : null;
  if (glIds === null) return { status: 400, body: { ok: false, error: 'entityType and entityId are required' } };
  if (!glIds.length) return { status: 400, body: { ok: false, error: 'No GL voucher found yet for this transaction — try again in a moment.' } };

  const glMasterId = glIds[0]; // earliest/primary voucher for this source
  let result;
  {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO GLDOC (DOC_FILE, GLMASTERID, ORIGINAL_NAME, MIME_TYPE, FILE_SIZE)
         VALUES (:doc, :gmid, :oname, :mime, :fsize)`,
        {
          doc: { val: file.buffer, type: oracledb.BLOB },
          gmid: glMasterId,
          oname: file.originalname,
          mime: file.mimetype,
          fsize: file.size,
        }
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
  return { status: 200, body: { ok: true, name: file.originalname } };
};

// ---------------------------------------------------------------- download one attachment
export const downloadAttachment = async (params) => {
  const id = parseInt(params.id, 10);
  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT DOC_FILE AS "file", ORIGINAL_NAME AS "oname", MIME_TYPE AS "mime" FROM GLDOC WHERE ID = :id`, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  if (!rows.length || !rows[0].file) return { status: 404, body: 'Not found', sendText: true };
  return { status: 200, body: rows[0].file, file: { mime: rows[0].mime, oname: rows[0].oname } };
};

// ---------------------------------------------------------------- delete an attachment
export const deleteAttachment = async (params) => {
  const id = parseInt(params.id, 10);
  let rows;
  {
    const conn = await getConnection();
    try {
      const result = await conn.execute(`SELECT ID FROM GLDOC WHERE ID = :id`, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows || [];
    } finally {
      await conn.close();
    }
  }
  if (!rows.length) return { status: 404, body: { ok: false, error: 'Not found' } };
  {
    const conn = await getConnection();
    try {
      await conn.execute(`DELETE FROM GLDOC WHERE ID = :id`, { id });
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    } finally {
      await conn.close();
    }
  }
  return { status: 200, body: { ok: true } };
};
