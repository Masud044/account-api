import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE INVOICE (transaction: H → L → D) ─────────────────────────────────
export const createInvoice = async (data) => {
  // data: { customerId, invoiceDate, createdBy, lines: [{ productionId, productionQty, price }] }
  const conn = await getConnection();
  try {
    const totQty = data.lines.reduce((s, l) => s + Number(l.productionQty || 0), 0);
    const totAmt = data.lines.reduce((s, l) => s + Number(l.productionQty || 0) * Number(l.price || 0), 0);

    // 1. Insert Header
    const hResult = await conn.execute(
      `INSERT INTO SAL_INVOICE_H (
        INVOICE_DATE, TOT_QTY, TOT_AMT, CREATED_BY, CUSTOMER_ID, CREATION_DATE
      ) VALUES (
        TO_DATE(:invoiceDate, 'YYYY-MM-DD'), :totQty, :totAmt, :createdBy, :customerId, SYSDATE
      ) RETURNING HID INTO :outHid`,
      {
        invoiceDate: data.invoiceDate,
        totQty,
        totAmt,
        createdBy:  data.createdBy ?? null,
        customerId: data.customerId,
        outHid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );
    const hid = hResult.outBinds.outHid[0];

    // 2. Insert Lines + Details
    for (const line of data.lines) {
      const lResult = await conn.execute(
        `INSERT INTO SAL_INVOICE_L (HID, PRODUTION_ID)
         VALUES (:hid, :productionId)
         RETURNING LID INTO :outLid`,
        {
          hid,
          productionId: line.productionId,
          outLid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: false }
      );
      const lid = lResult.outBinds.outLid[0];

      await conn.execute(
        `INSERT INTO SAL_INVOICE_D (LID, PRODUCTION_QTY, PRICE, CREATION_BY, CREATION_DATE)
         VALUES (:lid, :productionQty, :price, :creationBy, SYSDATE)`,
        {
          lid,
          productionQty: Number(line.productionQty),
          price:         Number(line.price),
          creationBy:    data.createdBy ?? null,
        },
        { autoCommit: false }
      );
    }

    await conn.commit();
    return { hid, totQty, totAmt };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── GET ALL INVOICES (list) ──────────────────────────────────────────────────
export const getAllInvoices = async () => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        h.HID,
        h.INVOICE_DATE,
        h.TOT_QTY,
        h.TOT_AMT,
        h.CREATION_DATE,
        h.CUSTOMER_ID,
        c.CUSTOMER_NAME
      FROM SAL_INVOICE_H h
      LEFT JOIN CUSTOMER_INFO c ON h.CUSTOMER_ID = c.CUSTOMER_ID
      ORDER BY h.HID DESC
    `;
    const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE INVOICE (full detail) ────────────────────────────────────────
export const getInvoiceById = async (hid) => {
  const conn = await getConnection();
  try {
    // Header + Customer info
    const hResult = await conn.execute(
      `SELECT
        h.HID,
        h.INVOICE_DATE,
        h.TOT_QTY,
        h.TOT_AMT,
        h.CREATION_DATE,
        h.CUSTOMER_ID,
        c.CUSTOMER_NAME,
        c.ADDRESS,
        c.PHONE,
        c.MOBILE,
        c.EMAIL
       FROM SAL_INVOICE_H h
       LEFT JOIN CUSTOMER_INFO c ON h.CUSTOMER_ID = c.CUSTOMER_ID
       WHERE h.HID = :hid`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const header = hResult.rows[0] ?? null;
    if (!header) return null;

    // Lines + Details + Production info
    const lResult = await conn.execute(
      `SELECT
        l.LID,
        l.PRODUTION_ID,
        d.DID,
        d.PRODUCTION_QTY,
        d.PRICE,
        (d.PRODUCTION_QTY * d.PRICE) AS LINE_TOTAL,
        ep.PRODUCTION_DATE,
        ep.QTY AS AVAILABLE_QTY
       FROM SAL_INVOICE_L l
       LEFT JOIN SAL_INVOICE_D d  ON l.LID      = d.LID
       LEFT JOIN EGG_PRODUCTION ep ON l.PRODUTION_ID = ep.ID
       WHERE l.HID = :hid
       ORDER BY l.LID ASC`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return { ...header, lines: lResult.rows };
  } finally {
    await conn.close();
  }
};

// ─── DELETE INVOICE (cascade) ─────────────────────────────────────────────────
export const deleteInvoice = async (hid) => {
  const conn = await getConnection();
  try {
    // Get LIDs
    const lResult = await conn.execute(
      `SELECT LID FROM SAL_INVOICE_L WHERE HID = :hid`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Delete details
    for (const row of lResult.rows) {
      await conn.execute(
        `DELETE FROM SAL_INVOICE_D WHERE LID = :lid`,
        { lid: row.LID },
        { autoCommit: false }
      );
    }

    // Delete lines
    await conn.execute(
      `DELETE FROM SAL_INVOICE_L WHERE HID = :hid`,
      { hid },
      { autoCommit: false }
    );

    // Delete header
    const result = await conn.execute(
      `DELETE FROM SAL_INVOICE_H WHERE HID = :hid`,
      { hid },
      { autoCommit: false }
    );

    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};