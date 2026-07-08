// import { getConnection, oracledb } from '../../config/db.js';

// // ─── CREATE INVOICE (transaction: H → L → D) ─────────────────────────────────
// export const createInvoice = async (data) => {
//   // data: { customerId, invoiceDate, createdBy, lines: [{ productionId, productionQty, price }] }
//   const conn = await getConnection();
//   try {
//     const totQty = data.lines.reduce((s, l) => s + Number(l.productionQty || 0), 0);
//     const totAmt = data.lines.reduce((s, l) => s + Number(l.productionQty || 0) * Number(l.price || 0), 0);

//     // 1. Insert Header
//     const hResult = await conn.execute(
//       `INSERT INTO SAL_INVOICE_H (
//         INVOICE_DATE, TOT_QTY, TOT_AMT, CREATED_BY, CUSTOMER_ID, CREATION_DATE
//       ) VALUES (
//         TO_DATE(:invoiceDate, 'YYYY-MM-DD'), :totQty, :totAmt, :createdBy, :customerId, SYSDATE
//       ) RETURNING HID INTO :outHid`,
//       {
//         invoiceDate: data.invoiceDate,
//         totQty,
//         totAmt,
//         createdBy:  data.createdBy ?? null,
//         customerId: data.customerId,
//         outHid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     const hid = hResult.outBinds.outHid[0];

//     // 2. Insert Lines + Details
//     for (const line of data.lines) {
//       const lResult = await conn.execute(
//         `INSERT INTO SAL_INVOICE_L (HID, PRODUTION_ID)
//          VALUES (:hid, :productionId)
//          RETURNING LID INTO :outLid`,
//         {
//           hid,
//           productionId: line.productionId,
//           outLid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//         },
//         { autoCommit: false }
//       );
//       const lid = lResult.outBinds.outLid[0];

//       await conn.execute(
//         `INSERT INTO SAL_INVOICE_D (LID, PRODUCTION_QTY, PRICE, CREATION_BY, CREATION_DATE)
//          VALUES (:lid, :productionQty, :price, :creationBy, SYSDATE)`,
//         {
//           lid,
//           productionQty: Number(line.productionQty),
//           price:         Number(line.price),
//           creationBy:    data.createdBy ?? null,
//         },
//         { autoCommit: false }
//       );
//     }

//     await conn.commit();
//     return { hid, totQty, totAmt };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── GET ALL INVOICES (list) ──────────────────────────────────────────────────
// export const getAllInvoices = async () => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         h.HID,
//         h.INVOICE_DATE,
//         h.TOT_QTY,
//         h.TOT_AMT,
//         h.CREATION_DATE,
//         h.CUSTOMER_ID,
//         c.CUSTOMER_NAME
//       FROM SAL_INVOICE_H h
//       LEFT JOIN CUSTOMER_INFO c ON h.CUSTOMER_ID = c.CUSTOMER_ID
//       ORDER BY h.HID DESC
//     `;
//     const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── GET SINGLE INVOICE (full detail) ────────────────────────────────────────
// export const getInvoiceById = async (hid) => {
//   const conn = await getConnection();
//   try {
//     // Header + Customer info
//     const hResult = await conn.execute(
//       `SELECT
//         h.HID,
//         h.INVOICE_DATE,
//         h.TOT_QTY,
//         h.TOT_AMT,
//         h.CREATION_DATE,
//         h.CUSTOMER_ID,
//         c.CUSTOMER_NAME,
//         c.ADDRESS,
//         c.PHONE,
//         c.MOBILE,
//         c.EMAIL
//        FROM SAL_INVOICE_H h
//        LEFT JOIN CUSTOMER_INFO c ON h.CUSTOMER_ID = c.CUSTOMER_ID
//        WHERE h.HID = :hid`,
//       { hid },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const header = hResult.rows[0] ?? null;
//     if (!header) return null;

//     // Lines + Details + Production info
//     const lResult = await conn.execute(
//       `SELECT
//         l.LID,
//         l.PRODUTION_ID,
//         d.DID,
//         d.PRODUCTION_QTY,
//         d.PRICE,
//         (d.PRODUCTION_QTY * d.PRICE) AS LINE_TOTAL,
//         ep.PRODUCTION_DATE,
//         ep.QTY AS AVAILABLE_QTY
//        FROM SAL_INVOICE_L l
//        LEFT JOIN SAL_INVOICE_D d  ON l.LID      = d.LID
//        LEFT JOIN EGG_PRODUCTION ep ON l.PRODUTION_ID = ep.ID
//        WHERE l.HID = :hid
//        ORDER BY l.LID ASC`,
//       { hid },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return { ...header, lines: lResult.rows };
//   } finally {
//     await conn.close();
//   }
// };

// // ─── DELETE INVOICE (cascade) ─────────────────────────────────────────────────
// export const deleteInvoice = async (hid) => {
//   const conn = await getConnection();
//   try {
//     // Get LIDs
//     const lResult = await conn.execute(
//       `SELECT LID FROM SAL_INVOICE_L WHERE HID = :hid`,
//       { hid },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     // Delete details
//     for (const row of lResult.rows) {
//       await conn.execute(
//         `DELETE FROM SAL_INVOICE_D WHERE LID = :lid`,
//         { lid: row.LID },
//         { autoCommit: false }
//       );
//     }

//     // Delete lines
//     await conn.execute(
//       `DELETE FROM SAL_INVOICE_L WHERE HID = :hid`,
//       { hid },
//       { autoCommit: false }
//     );

//     // Delete header
//     const result = await conn.execute(
//       `DELETE FROM SAL_INVOICE_H WHERE HID = :hid`,
//       { hid },
//       { autoCommit: false }
//     );

//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };


// // ─── UPDATE INVOICE (diff-based upsert: update unchanged, insert new, delete removed) ──
// export const updateInvoice = async (hid, data) => {
//   // data: { customerId, invoiceDate, updatedBy, lines: [{ productionId, productionQty, price }] }
//   const conn = await getConnection();
//   try {
//     const totQty = data.lines.reduce((s, l) => s + Number(l.productionQty || 0), 0);
//     const totAmt = data.lines.reduce((s, l) => s + Number(l.productionQty || 0) * Number(l.price || 0), 0);

//     // 1. Update header (proper UPDATED_BY / UPDATED_DATE audit trail)
//     const hResult = await conn.execute(
//       `UPDATE SAL_INVOICE_H
//          SET INVOICE_DATE = TO_DATE(:invoiceDate, 'YYYY-MM-DD'),
//              TOT_QTY       = :totQty,
//              TOT_AMT       = :totAmt,
//              CUSTOMER_ID   = :customerId,
//              UPDATED_BY    = :updatedBy,
//              UPDATED_DATE  = SYSDATE
//        WHERE HID = :hid`,
//       {
//         invoiceDate: data.invoiceDate,
//         totQty,
//         totAmt,
//         customerId: data.customerId,
//         updatedBy:  data.updatedBy ?? null,
//         hid,
//       },
//       { autoCommit: false }
//     );
//     if (hResult.rowsAffected === 0) throw new Error('Invoice not found.');

//     // 2. Fetch existing lines + details for this invoice
//     const existingResult = await conn.execute(
//       `SELECT l.LID, l.PRODUTION_ID, d.DID
//          FROM SAL_INVOICE_L l
//          LEFT JOIN SAL_INVOICE_D d ON l.LID = d.LID
//         WHERE l.HID = :hid`,
//       { hid },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const existingByProdId = new Map(
//       existingResult.rows.map((r) => [String(r.PRODUTION_ID), r])
//     );
//     const incomingProdIds = new Set(data.lines.map((l) => String(l.productionId)));

//     // 3. Delete lines that were removed by the user
//     for (const row of existingResult.rows) {
//       if (!incomingProdIds.has(String(row.PRODUTION_ID))) {
//         if (row.DID) {
//           await conn.execute(
//             `DELETE FROM SAL_INVOICE_D WHERE DID = :did`,
//             { did: row.DID },
//             { autoCommit: false }
//           );
//         }
//         await conn.execute(
//           `DELETE FROM SAL_INVOICE_L WHERE LID = :lid`,
//           { lid: row.LID },
//           { autoCommit: false }
//         );
//       }
//     }

//     // 4. Upsert incoming lines — update if unchanged production, insert if new
//     for (const line of data.lines) {
//       const existing = existingByProdId.get(String(line.productionId));

//       if (existing) {
//         // Same production date as before → keep LID/DID, just update qty/price
//         await conn.execute(
//           `UPDATE SAL_INVOICE_D
//              SET PRODUCTION_QTY = :productionQty,
//                  PRICE          = :price,
//                  UPDATED_BY     = :updatedBy,
//                  UPDATED_DATE   = SYSDATE
//            WHERE LID = :lid`,
//           {
//             productionQty: Number(line.productionQty),
//             price:         Number(line.price),
//             updatedBy:     data.updatedBy ?? null,
//             lid:           existing.LID,
//           },
//           { autoCommit: false }
//         );
//       } else {
//         // New production date → insert fresh L + D
//         const insL = await conn.execute(
//           `INSERT INTO SAL_INVOICE_L (HID, PRODUTION_ID)
//            VALUES (:hid, :productionId)
//            RETURNING LID INTO :outLid`,
//           {
//             hid,
//             productionId: line.productionId,
//             outLid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//           },
//           { autoCommit: false }
//         );
//         const lid = insL.outBinds.outLid[0];

//         await conn.execute(
//           `INSERT INTO SAL_INVOICE_D (LID, PRODUCTION_QTY, PRICE, CREATION_BY, CREATION_DATE)
//            VALUES (:lid, :productionQty, :price, :creationBy, SYSDATE)`,
//           {
//             lid,
//             productionQty: Number(line.productionQty),
//             price:         Number(line.price),
//             creationBy:    data.updatedBy ?? null,
//           },
//           { autoCommit: false }
//         );
//       }
//     }

//     await conn.commit();
//     return { hid, totQty, totAmt };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };


import { getConnection, oracledb } from '../../config/db.js';

// ─── CREATE INVOICE (transaction: H → L → D) ─────────────────────────────────
// export const createInvoice = async (data) => {
//   // data: { customerId, invoiceDate, createdBy, lines: [{ productionId, productionQty, price }] }
//   const conn = await getConnection();
//   try {
//     const totQty = data.lines.reduce((s, l) => s + Number(l.productionQty || 0), 0);
//     const totAmt = data.lines.reduce((s, l) => s + Number(l.productionQty || 0) * Number(l.price || 0), 0);

//     // ── Generate INVOICE_ID (format: YYYYMM + 3-digit running number) ──────────
//     const invoiceDateObj = new Date(data.invoiceDate);
//     const year  = invoiceDateObj.getFullYear();
//     const month = String(invoiceDateObj.getMonth() + 1).padStart(2, '0');

//     const seqResult = await conn.execute(
//       `SELECT SUBSTR(TO_CHAR(INVOICE_ID), -3, 3) V_NO
//          FROM SAL_INVOICE_H
//         WHERE INVOICE_ID IS NOT NULL
//         ORDER BY HID DESC
//         FETCH FIRST 1 ROWS ONLY`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const nextSeq   = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, '0');
//     const invoiceId = Number(`${year}${month}${nextSeq}`);

//     // 1. Insert Header
//     const hResult = await conn.execute(
//       `INSERT INTO SAL_INVOICE_H (
//         INVOICE_ID, INVOICE_DATE, TOT_QTY, TOT_AMT, CREATED_BY, CUSTOMER_ID, CREATION_DATE
//       ) VALUES (
//         :invoiceId, TO_DATE(:invoiceDate, 'YYYY-MM-DD'), :totQty, :totAmt, :createdBy, :customerId, SYSDATE
//       ) RETURNING HID INTO :outHid`,
//       {
//         invoiceId,
//         invoiceDate: data.invoiceDate,
//         totQty,
//         totAmt,
//         createdBy:  data.createdBy ?? null,
//         customerId: data.customerId,
//         outHid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//       },
//       { autoCommit: false }
//     );
//     const hid = hResult.outBinds.outHid[0];

//     // 2. Insert Lines + Details
//     for (const line of data.lines) {
//       const lResult = await conn.execute(
//         `INSERT INTO SAL_INVOICE_L (HID, PRODUTION_ID)
//          VALUES (:hid, :productionId)
//          RETURNING LID INTO :outLid`,
//         {
//           hid,
//           productionId: line.productionId,
//           outLid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
//         },
//         { autoCommit: false }
//       );
//       const lid = lResult.outBinds.outLid[0];

//       await conn.execute(
//         `INSERT INTO SAL_INVOICE_D (LID, PRODUCTION_QTY, PRICE, CREATION_BY, CREATION_DATE)
//          VALUES (:lid, :productionQty, :price, :creationBy, SYSDATE)`,
//         {
//           lid,
//           productionQty: Number(line.productionQty),
//           price:         Number(line.price),
//           creationBy:    data.createdBy ?? null,
//         },
//         { autoCommit: false }
//       );
//     }

//     await conn.commit();
//     return { hid, invoiceId, totQty, totAmt };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

export const createInvoice = async (data) => {
  const conn = await getConnection();
  try {
   const totQty = data.lines.reduce((s, l) => s + Number(l.saleQty ?? l.productionQty ?? 0), 0);
const totAmt = Math.round(
  data.lines.reduce((s, l) => s + Number(l.saleQty ?? l.productionQty ?? 0) * Number(l.price || 0), 0) * 100
) / 100;

    // ── Generate INVOICE_ID (format: YYYYMM + 3-digit running number, resets each month) ──
    const invoiceDateObj = new Date(data.invoiceDate);
    const year  = invoiceDateObj.getFullYear();
    const month = String(invoiceDateObj.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}${month}`; // e.g. "202607"

    const seqResult = await conn.execute(
      `SELECT MAX(TO_NUMBER(SUBSTR(TO_CHAR(INVOICE_ID), -3, 3))) V_NO
         FROM SAL_INVOICE_H
        WHERE INVOICE_ID IS NOT NULL
          AND SUBSTR(TO_CHAR(INVOICE_ID), 1, 6) = :yearMonth`,
      { yearMonth },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const nextSeq   = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, '0');
    const invoiceId = Number(`${yearMonth}${nextSeq}`);

    // 1. Insert Header
    const hResult = await conn.execute(
      `INSERT INTO SAL_INVOICE_H (
        INVOICE_ID, INVOICE_DATE, TOT_QTY, TOT_AMT, CREATED_BY, CUSTOMER_ID, CREATION_DATE
      ) VALUES (
        :invoiceId, TO_DATE(:invoiceDate, 'YYYY-MM-DD'), :totQty, :totAmt, :createdBy, :customerId, SYSDATE
      ) RETURNING HID INTO :outHid`,
      {
        invoiceId,
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

    // 2. Insert Lines + Details (অপরিবর্তিত)
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
  `INSERT INTO SAL_INVOICE_D (LID, PRODUCTION_QTY, SALE_QTY, PRICE, CREATION_BY, CREATION_DATE)
   VALUES (:lid, :productionQty, :saleQty, :price, :creationBy, SYSDATE)`,
  {
    lid,
    productionQty: Number(line.productionQty),
    saleQty:       Number(line.saleQty ?? line.productionQty),
    price:         Number(line.price),
    creationBy:    data.createdBy ?? null,
  },
  { autoCommit: false }
);
    }

    await conn.commit();
    return { hid, invoiceId, totQty, totAmt };
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
        h.INVOICE_ID,
        TO_CHAR(h.INVOICE_DATE, 'YYYY-MM-DD') AS INVOICE_DATE,
        h.TOT_QTY,
        h.TOT_AMT,
        h.RECEIVE_CREATED,
        h.CREATION_DATE,
        h.CUSTOMER_ID,
        c.CUSTOMER_NAME,
        NVL(dq.PRODUCTION_QTY_SUM, 0) AS PRODUCTION_QTY
      FROM SAL_INVOICE_H h
      LEFT JOIN CUSTOMER_INFO c ON h.CUSTOMER_ID = c.CUSTOMER_ID
      LEFT JOIN (
        SELECT l.HID, SUM(d.PRODUCTION_QTY) AS PRODUCTION_QTY_SUM
        FROM SAL_INVOICE_L l
        JOIN SAL_INVOICE_D d ON l.LID = d.LID
        GROUP BY l.HID
      ) dq ON dq.HID = h.HID
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
    h.INVOICE_ID,
    TO_CHAR(h.INVOICE_DATE, 'YYYY-MM-DD') AS INVOICE_DATE,
    h.TOT_QTY,
    h.TOT_AMT,
    h.CREATION_DATE,
    h.RECEIVE_CREATED,
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
    d.SALE_QTY,
    d.PRICE,
    (d.SALE_QTY * d.PRICE) AS LINE_TOTAL,
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

// ─── UPDATE INVOICE (diff-based upsert: update unchanged, insert new, delete removed) ──
export const updateInvoice = async (hid, data) => {
  // data: { customerId, invoiceDate, updatedBy, lines: [{ productionId, productionQty, price }] }
  const conn = await getConnection();
  try {
   const totQty = data.lines.reduce((s, l) => s + Number(l.saleQty ?? l.productionQty ?? 0), 0);
const totAmt = Math.round(
  data.lines.reduce((s, l) => s + Number(l.saleQty ?? l.productionQty ?? 0) * Number(l.price || 0), 0) * 100
) / 100;
    // ... বাকি অপরিবর্তিত
    // 1. Update header (proper UPDATED_BY / UPDATED_DATE audit trail)
    // NOTE: INVOICE_ID is intentionally NOT touched here — it's assigned once
    // at creation time and stays fixed for the life of the invoice.
    const hResult = await conn.execute(
      `UPDATE SAL_INVOICE_H
         SET INVOICE_DATE = TO_DATE(:invoiceDate, 'YYYY-MM-DD'),
             TOT_QTY       = :totQty,
             TOT_AMT       = :totAmt,
             CUSTOMER_ID   = :customerId,
             UPDATED_BY    = :updatedBy,
             UPDATED_DATE  = SYSDATE
       WHERE HID = :hid`,
      {
        invoiceDate: data.invoiceDate,
        totQty,
        totAmt,
        customerId: data.customerId,
        updatedBy:  data.updatedBy ?? null,
        hid,
      },
      { autoCommit: false }
    );
    if (hResult.rowsAffected === 0) throw new Error('Invoice not found.');

    // 2. Fetch existing lines + details for this invoice
    const existingResult = await conn.execute(
      `SELECT l.LID, l.PRODUTION_ID, d.DID
         FROM SAL_INVOICE_L l
         LEFT JOIN SAL_INVOICE_D d ON l.LID = d.LID
        WHERE l.HID = :hid`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const existingByProdId = new Map(
      existingResult.rows.map((r) => [String(r.PRODUTION_ID), r])
    );
    const incomingProdIds = new Set(data.lines.map((l) => String(l.productionId)));

    // 3. Delete lines that were removed by the user
    for (const row of existingResult.rows) {
      if (!incomingProdIds.has(String(row.PRODUTION_ID))) {
        if (row.DID) {
          await conn.execute(
            `DELETE FROM SAL_INVOICE_D WHERE DID = :did`,
            { did: row.DID },
            { autoCommit: false }
          );
        }
        await conn.execute(
          `DELETE FROM SAL_INVOICE_L WHERE LID = :lid`,
          { lid: row.LID },
          { autoCommit: false }
        );
      }
    }

    // 4. Upsert incoming lines — update if unchanged production, insert if new
    for (const line of data.lines) {
      const existing = existingByProdId.get(String(line.productionId));

      if (existing) {
        // Same production date as before → keep LID/DID, just update qty/price
       // existing line update
await conn.execute(
  `UPDATE SAL_INVOICE_D
     SET PRODUCTION_QTY = :productionQty,
         SALE_QTY       = :saleQty,
         PRICE          = :price,
         UPDATED_BY     = :updatedBy,
         UPDATED_DATE   = SYSDATE
   WHERE LID = :lid`,
  {
    productionQty: Number(line.productionQty),
    saleQty:       Number(line.saleQty ?? line.productionQty),
    price:         Number(line.price),
    updatedBy:     data.updatedBy ?? null,
    lid:           existing.LID,
  },
  { autoCommit: false }
);
      } else {
        // New production date → insert fresh L + D
        const insL = await conn.execute(
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
        const lid = insL.outBinds.outLid[0];

       // new line insert (removed date এ notun add hole)
await conn.execute(
  `INSERT INTO SAL_INVOICE_D (LID, PRODUCTION_QTY, SALE_QTY, PRICE, CREATION_BY, CREATION_DATE)
   VALUES (:lid, :productionQty, :saleQty, :price, :creationBy, SYSDATE)`,
  {
    lid,
    productionQty: Number(line.productionQty),
    saleQty:       Number(line.saleQty ?? line.productionQty),
    price:         Number(line.price),
    creationBy:    data.updatedBy ?? null,
  },
  { autoCommit: false }
);
      }
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


// ─── DASHBOARD: Invoice breakdown (date/month/year filter) ───────────────────
export const getInvoiceDashboardData = async (filters = {}) => {
  const conn = await getConnection();
  try {
    let whereClause = '';
    const binds = {};

    if (filters.date) {
      whereClause = `WHERE TO_CHAR(h.INVOICE_DATE, 'YYYY-MM-DD') = :date`;
      binds.date = filters.date;
    } else {
      const conditions = [];
      if (filters.month) {
        conditions.push(`EXTRACT(MONTH FROM h.INVOICE_DATE) = :month`);
        binds.month = Number(filters.month);
      }
      if (filters.year) {
        conditions.push(`EXTRACT(YEAR FROM h.INVOICE_DATE) = :year`);
        binds.year = Number(filters.year);
      }
      if (conditions.length) whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const rowsResult = await conn.execute(
      `SELECT
         TO_CHAR(h.INVOICE_DATE, 'YYYY-MM-DD') AS GL_ENTRY_DATE,
         NVL(c.CUSTOMER_NAME, 'Unknown')        AS DESCRIPTION,
         h.TOT_AMT                              AS AMT
       FROM SAL_INVOICE_H h
       LEFT JOIN CUSTOMER_INFO c ON h.CUSTOMER_ID = c.CUSTOMER_ID
       ${whereClause}
       ORDER BY h.INVOICE_DATE DESC`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const totalResult = await conn.execute(
      `SELECT NVL(SUM(h.TOT_AMT), 0) AS TOTAL
       FROM SAL_INVOICE_H h
       ${whereClause}`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      rows:  rowsResult.rows,
      total: totalResult.rows[0]?.TOTAL ?? 0,
    };
  } finally {
    await conn.close();
  }
};

// ─── DASHBOARD: Monthly invoice summary (for chart) ──────────────────────────
export const getInvoiceMonthlySummary = async (year) => {
  const conn = await getConnection();
  try {
    const binds = {};
    let whereClause = '';
    if (year) {
      whereClause = `WHERE EXTRACT(YEAR FROM INVOICE_DATE) = :year`;
      binds.year = Number(year);
    }

    const result = await conn.execute(
      `SELECT
         TO_CHAR(INVOICE_DATE, 'YYYY-MM') AS MONTH,
         SUM(TOT_AMT)                     AS TOTAL_AMT,
         SUM(TOT_QTY)                     AS TOTAL_QTY,
         COUNT(*)                         AS INVOICE_COUNT
       FROM SAL_INVOICE_H
       ${whereClause}
       GROUP BY TO_CHAR(INVOICE_DATE, 'YYYY-MM')
       ORDER BY MONTH ASC`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};


// ─── DASHBOARD: Daily invoice summary (for chart) ────────────────────────────
export const getInvoiceDailySummary = async (month, year) => {
  const conn = await getConnection();
  try {
    const binds = {};
    const conditions = [];

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM INVOICE_DATE) = :month`);
      binds.month = Number(month);
    }
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM INVOICE_DATE) = :year`);
      binds.year = Number(year);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await conn.execute(
      `SELECT
         TO_CHAR(INVOICE_DATE, 'YYYY-MM-DD') AS DAY,
         SUM(TOT_AMT)                        AS TOTAL_AMT,
         SUM(TOT_QTY)                        AS TOTAL_QTY,
         COUNT(*)                            AS INVOICE_COUNT
       FROM SAL_INVOICE_H
       ${whereClause}
       GROUP BY TO_CHAR(INVOICE_DATE, 'YYYY-MM-DD')
       ORDER BY DAY ASC`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── LOCK INVOICE (mark as receive-voucher-created) ──────────────────────────
export const lockInvoiceForReceive = async (hid) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE SAL_INVOICE_H SET RECEIVE_CREATED = 1 WHERE HID = :hid`,
      { hid },
      { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};