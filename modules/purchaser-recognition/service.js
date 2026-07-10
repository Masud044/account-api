// import { getConnection, oracledb } from '../../config/db.js';

// // ═══════════════════════════════════════════════════════════════
// // Helper: generate FORM_ID (format: PR-YYYY-NNNN, resets every year)
// // ═══════════════════════════════════════════════════════════════
// const generateFormId = async (conn, recognitionDate) => {
//   const year = new Date(recognitionDate).getFullYear();

//   const seqResult = await conn.execute(
//     `SELECT MAX(TO_NUMBER(SUBSTR(FORM_ID, -4, 4))) V_NO
//        FROM PURCHASE_RECOGNITION_H
//       WHERE SUBSTR(FORM_ID, 4, 4) = :year`,
//     { year: String(year) },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const nextSeq = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(4, '0');
//   return `PO-${year}-${nextSeq}`;
// };

// // ═══════════════════════════════════════════════════════════════
// // Helper: generate PO_NUMBER (format: PO-YYYY-MM-NNNN, resets every month)
// // ═══════════════════════════════════════════════════════════════
// const generatePoNumber = async (conn, recognitionDate) => {
//   const d = new Date(recognitionDate);
//   const year = d.getFullYear();
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const yearMonth = `${year}-${month}`;

//   const seqResult = await conn.execute(
//     `SELECT MAX(TO_NUMBER(SUBSTR(PO_NUMBER, -4, 4))) V_NO
//        FROM PURCHASE_RECOGNITION_H
//       WHERE SUBSTR(PO_NUMBER, 4, 7) = :yearMonth`,
//     { yearMonth },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const nextSeq = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(4, '0');
//   return `PO-${yearMonth}-${nextSeq}`;
// };

// // ═══════════════════════════════════════════════════════════════
// // Helper: generate INVOICE_NUMBER (format: YYYYMMNNN, resets every month)
// // ═══════════════════════════════════════════════════════════════
// const generateInvoiceNumber = async (conn, recognitionDate) => {
//   const d = new Date(recognitionDate);
//   const year = d.getFullYear();
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const yearMonth = `${year}${month}`;

//   const seqResult = await conn.execute(
//     `SELECT MAX(TO_NUMBER(SUBSTR(INVOICE_NUMBER, -3, 3))) V_NO
//        FROM PURCHASE_RECOGNITION_H
//       WHERE SUBSTR(INVOICE_NUMBER, 1, 6) = :yearMonth`,
//     { yearMonth },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const nextSeq = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, '0');
//   return `${yearMonth}${nextSeq}`;
// };

// // ═══════════════════════════════════════════════════════════════
// // Helper: resolve item details by ID from the ITEM table
// // ═══════════════════════════════════════════════════════════════
// const getItemMasterById = async (conn, itemId) => {
//   const result = await conn.execute(
//     `SELECT ITEM_ID, NAME, DESCRIPTION, PRICE
//        FROM ITEM
//       WHERE ITEM_ID = :itemId`,
//     { itemId },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return result.rows[0] ?? null;
// };

// // ═══════════════════════════════════════════════════════════════
// // ITEM — search/autocomplete for the item line picker
// // ═══════════════════════════════════════════════════════════════
// export const searchItems = async (keyword) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT ITEM_ID, NAME, DESCRIPTION, PRICE
//          FROM ITEM
//         WHERE UPPER(NAME) LIKE UPPER(:kw) OR UPPER(DESCRIPTION) LIKE UPPER(:kw)
//         ORDER BY NAME ASC
//         FETCH FIRST 50 ROWS ONLY`,
//       { kw: `%${keyword ?? ''}%` },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // PURCHASE RECOGNITION (H + D) — CRUD
// // ═══════════════════════════════════════════════════════════════

// // ─── CREATE (transaction: H → D → Approval Tracking) ─────────────────────────
// export const createPurchaseRecognition = async (data) => {
//   // data: { header: {...}, items: [{ itemNo, itemId, grnQty, qtyRecv, unitId, unit, unitPrice(optional-auto) }], createdBy }
//   const conn = await getConnection();
//   try {
//     const formId = await generateFormId(conn, data.header.recognitionDate);
//     const poNumber = await generatePoNumber(conn, data.header.recognitionDate);
//     const invoiceNumber = await generateInvoiceNumber(conn, data.header.recognitionDate);

//     // Resolve item master details (name / description / price) for each line
//     const resolvedItems = [];
//     for (const item of data.items) {
//       const master = item.itemId ? await getItemMasterById(conn, item.itemId) : null;
//       resolvedItems.push({
//         ...item,
//         description: item.description ?? master?.DESCRIPTION ?? null,
//         unitPrice:   item.unitPrice   ?? master?.PRICE       ?? 0,
//       });
//     }

//     // ✅ Total ager moto QTY_RECV (Receive Qty) * unitPrice diyei calculate hoy,
//     //    GRN_QTY sudhu additional tracking field, total-e effect nai
//     const totalAmount = resolvedItems.reduce(
//       (s, it) => s + Number(it.qtyRecv || 0) * Number(it.unitPrice || 0), 0
//     );

//     // 1. Insert Header
//    await conn.execute(
//   `INSERT INTO PURCHASE_RECOGNITION_H (
//     FORM_ID, RECOGNITION_DATE, PO_NUMBER, INVOICE_NUMBER,
//     DEPARTMENT, REQUESTED_BY, SUPPLIER_ID, VENDOR_NAME, CONTACT_PERSON,
//     COST_CENTER_CODE, INVOICE_DATE, DESCRIPTION, PURCHASE_TYPE, CREATED_BY, CREATION_DATE,
//     INV_TYPE, PAYMENT_CODE
//   ) VALUES (
//     :formId, TO_DATE(:recognitionDate,'YYYY-MM-DD'), :poNumber, :invoiceNumber,
//     :department, :requestedBy, :supplierId, :vendorName, :contactPerson,
//     :costCenterCode, TO_DATE(:invoiceDate,'YYYY-MM-DD'), :description, :purchaseType, :createdBy, SYSDATE,
//     :invType, :paymentCode
//   )`,
//   {
//     formId,
//     recognitionDate: data.header.recognitionDate,
//     poNumber,
//     invoiceNumber,
//     department:      data.header.department ?? null,
//     requestedBy:     data.header.requestedBy ?? null,
//     supplierId:      data.header.supplierId ?? null,
//     vendorName:      data.header.vendorName ?? null,
//     contactPerson:   data.header.contactPerson ?? null,
//     costCenterCode:  data.header.costCenterCode ?? null,
//     invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
//     description:     data.header.description ?? null,
//     purchaseType:    data.header.purchaseType ?? 'ITEM',
//     createdBy:       data.createdBy ?? null,
//     invType:         data.header.invType ?? null,       // 👈 যোগ করলাম
//     paymentCode:     data.header.paymentCode ?? null,   // 👈 যোগ করলাম
//   },
//   { autoCommit: false }
// );

//     // 2. Insert Line Items
//     for (const item of resolvedItems) {
//       const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
//       await conn.execute(
//         `INSERT INTO PURCHASE_RECOGNITION_D (
//            FORM_ID, ITEM_NO, ITEM_ID, DESCRIPTION, GRN_QTY, QTY_RECV, UNIT_ID, UOM,
//            UNIT_PRICE, TOTAL_PRICE, ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
//         ) VALUES (
//           :formId, :itemNo, :itemId, :description, :grnQty, :qtyRecv, :unitId, :uom,
//           :unitPrice, :totalPrice, :assetClassCode, :assetTagId, SYSDATE
//         )`,
//         {
//           formId,
//           itemNo:         item.itemNo ?? null,
//           itemId:         item.itemId ?? null,
//           description:    item.description ?? null,
//           grnQty:         Number(item.grnQty || 0),
//           qtyRecv:        Number(item.qtyRecv || 0),
//           unitId:         item.unitId ?? null,
//           uom:            item.unit ?? null,
//           unitPrice:      Number(item.unitPrice || 0),
//           totalPrice,
//           assetClassCode: item.assetClassCode ?? null,
//           assetTagId:     item.assetTagId ?? null,
//         },
//         { autoCommit: false }
//       );
//     }

//     // 3. Insert Approval Tracking row (single status, starts Pending)
//     await conn.execute(
//       `INSERT INTO PURCHASE_APPROVAL_TRACKING (
//         FORM_ID, PO_NUMBER, VENDOR_NAME, TOTAL_AMOUNT, OVERALL_STATUS
//       ) VALUES (
//          :formId, :poNumber, :vendorName, :totalAmount, 'Pending'
//       )`,
//       {
//         formId,
//         poNumber,
//         vendorName: data.header.vendorName ?? null,
//         totalAmount,
//       },
//       { autoCommit: false }
//     );

//     await conn.commit();
//     return { formId, poNumber, invoiceNumber, totalAmount };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── GET ALL (list page — one row per form, item count + live total + status) ─
// export const getAllPurchaseRecognitions = async () => {
//   const conn = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         h.ID,
//         h.FORM_ID,
//         h.RECOGNITION_DATE,
//         h.PO_NUMBER,
//         h.DEPARTMENT,
//         h.VENDOR_NAME,
//         h.SUPPLIER_ID,
//         h.DESCRIPTION,
//         h.PURCHASE_TYPE,
//         h.ACTION_CREATED,
//         h.CREATION_DATE,
//         (SELECT COUNT(*) FROM PURCHASE_RECOGNITION_D d WHERE d.FORM_ID = h.FORM_ID) AS ITEM_COUNT,
//         (SELECT NVL(SUM(TOTAL_PRICE),0) FROM PURCHASE_RECOGNITION_D d WHERE d.FORM_ID = h.FORM_ID) AS TOTAL_AMOUNT,
//         t.OVERALL_STATUS
//       FROM PURCHASE_RECOGNITION_H h
//       LEFT JOIN PURCHASE_APPROVAL_TRACKING t ON t.FORM_ID = h.FORM_ID
//       ORDER BY h.ID DESC
//     `;
//     const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── GET SINGLE (header + items, for detail/edit view) ────────────────────────
// export const getPurchaseRecognitionByFormId = async (formId) => {
//   const conn = await getConnection();
//   try {
//     const hResult = await conn.execute(
//       `SELECT * FROM PURCHASE_RECOGNITION_H WHERE FORM_ID = :formId`,
//       { formId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const header = hResult.rows[0] ?? null;
//     if (!header) return null;

//     const dResult = await conn.execute(
//       `SELECT d.*, i.NAME AS ITEM_NAME
//          FROM PURCHASE_RECOGNITION_D d
//          LEFT JOIN ITEM i ON i.ITEM_ID = d.ITEM_ID
//         WHERE d.FORM_ID = :formId
//         ORDER BY d.ITEM_NO ASC, d.ID ASC`,
//       { formId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return { ...header, items: dResult.rows };
//   } finally {
//     await conn.close();
//   }
// };

// // ─── UPDATE (header fields + full item replace) ───────────────────────────────
// // PO_NUMBER is never regenerated/changed on update — it stays fixed once created.
// export const updatePurchaseRecognition = async (formId, data) => {
//   // data: { header: {...}, items: [...], updatedBy }
//   const conn = await getConnection();
//   try {
//     const hResult = await conn.execute(
//   `UPDATE PURCHASE_RECOGNITION_H
//      SET RECOGNITION_DATE = TO_DATE(:recognitionDate,'YYYY-MM-DD'),
//          DEPARTMENT       = :department,
//          REQUESTED_BY     = :requestedBy,
//          SUPPLIER_ID      = :supplierId,
//          VENDOR_NAME      = :vendorName,
//          CONTACT_PERSON   = :contactPerson,
//          COST_CENTER_CODE = :costCenterCode,
//          INVOICE_DATE     = TO_DATE(:invoiceDate,'YYYY-MM-DD'),
//          DESCRIPTION      = :description,
//          PURCHASE_TYPE    = :purchaseType,
//          INV_TYPE         = :invType,       -- 👈 যোগ
//          PAYMENT_CODE     = :paymentCode,   -- 👈 যোগ
//          UPDATED_BY       = :updatedBy,
//          UPDATED_DATE     = SYSDATE
//    WHERE FORM_ID = :formId`,
//   {
//     recognitionDate: data.header.recognitionDate,
//     department:      data.header.department ?? null,
//     requestedBy:     data.header.requestedBy ?? null,
//     supplierId:      data.header.supplierId ?? null,
//     vendorName:      data.header.vendorName ?? null,
//     contactPerson:   data.header.contactPerson ?? null,
//     costCenterCode:  data.header.costCenterCode ?? null,
//     invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
//     description:     data.header.description ?? null,
//     purchaseType:    data.header.purchaseType ?? 'ITEM',
//     invType:         data.header.invType ?? null,       // 👈 যোগ
//     paymentCode:     data.header.paymentCode ?? null,   // 👈 যোগ
//     updatedBy:       data.updatedBy ?? null,
//     formId,
//   },
//   { autoCommit: false }
// );
//     if (hResult.rowsAffected === 0) throw new Error('Purchase recognition form not found.');

//     await conn.execute(
//       `DELETE FROM PURCHASE_RECOGNITION_D WHERE FORM_ID = :formId`,
//       { formId },
//       { autoCommit: false }
//     );

//     // Resolve item master details (name / description / price) for each line
//     const resolvedItems = [];
//     for (const item of data.items) {
//       const master = item.itemId ? await getItemMasterById(conn, item.itemId) : null;
//       resolvedItems.push({
//         ...item,
//         description: item.description ?? master?.DESCRIPTION ?? null,
//         unitPrice:   item.unitPrice   ?? master?.PRICE       ?? 0,
//       });
//     }

//     let totalAmount = 0;
//     for (const item of resolvedItems) {
//       const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
//       totalAmount += totalPrice;
//       await conn.execute(
//         `INSERT INTO PURCHASE_RECOGNITION_D (
//            FORM_ID, ITEM_NO, ITEM_ID, DESCRIPTION, GRN_QTY, QTY_RECV, UNIT_ID, UOM,
//            UNIT_PRICE, TOTAL_PRICE, ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
//         ) VALUES (
//           :formId, :itemNo, :itemId, :description, :grnQty, :qtyRecv, :unitId, :uom,
//           :unitPrice, :totalPrice, :assetClassCode, :assetTagId, SYSDATE
//         )`,
//         {
//           formId,
//           itemNo:         item.itemNo ?? null,
//           itemId:         item.itemId ?? null,
//           description:    item.description ?? null,
//           grnQty:         Number(item.grnQty || 0),
//           qtyRecv:        Number(item.qtyRecv || 0),
//           unitId:         item.unitId ?? null,
//           uom:            item.unit ?? null,
//           unitPrice:      Number(item.unitPrice || 0),
//           totalPrice,
//           assetClassCode: item.assetClassCode ?? null,
//           assetTagId:     item.assetTagId ?? null,
//         },
//         { autoCommit: false }
//       );
//     }

//     await conn.execute(
//       `UPDATE PURCHASE_APPROVAL_TRACKING
//          SET VENDOR_NAME  = :vendorName,
//              TOTAL_AMOUNT = :totalAmount,
//              UPDATED_DATE = SYSDATE
//        WHERE FORM_ID = :formId`,
//       {
//         vendorName: data.header.vendorName ?? null,
//         totalAmount,
//         formId,
//       },
//       { autoCommit: false }
//     );

//     await conn.commit();
//     return { formId, totalAmount };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── DELETE (cascade across all 3 tables, manually — no FK enforcement) ──────
// export const deletePurchaseRecognition = async (formId) => {
//   const conn = await getConnection();
//   try {
//     await conn.execute(
//       `DELETE FROM PURCHASE_RECOGNITION_D WHERE FORM_ID = :formId`,
//       { formId },
//       { autoCommit: false }
//     );
//     await conn.execute(
//       `DELETE FROM PURCHASE_APPROVAL_TRACKING WHERE FORM_ID = :formId`,
//       { formId },
//       { autoCommit: false }
//     );
//     const result = await conn.execute(
//       `DELETE FROM PURCHASE_RECOGNITION_H WHERE FORM_ID = :formId`,
//       { formId },
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

// // ═══════════════════════════════════════════════════════════════
// // APPROVAL TRACKING — CRUD (single STATUS field: Pending → Approved)
// // ═══════════════════════════════════════════════════════════════

// const VALID_STATUSES = ['Pending', 'Approved', 'Rejected'];

// // ─── GET ALL (approval dashboard list) ────────────────────────────────────────
// export const getAllApprovalTracking = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT * FROM PURCHASE_APPROVAL_TRACKING ORDER BY ID DESC`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── GET SINGLE ────────────────────────────────────────────────────────────────
// export const getApprovalTrackingByFormId = async (formId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT * FROM PURCHASE_APPROVAL_TRACKING WHERE FORM_ID = :formId`,
//       { formId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };

// // ─── UPDATE STATUS (Pending → Approved / Rejected) ────────────────────────────
// export const updateApprovalStatus = async (formId, status) => {
//   if (!VALID_STATUSES.includes(status)) {
//     throw new Error(`Invalid status: ${status}`);
//   }

//   const conn = await getConnection();
//   try {
//     const updateResult = await conn.execute(
//       `UPDATE PURCHASE_APPROVAL_TRACKING
//          SET OVERALL_STATUS = :status, UPDATED_DATE = SYSDATE
//        WHERE FORM_ID = :formId`,
//       { status, formId },
//       { autoCommit: false }
//     );
//     if (updateResult.rowsAffected === 0) throw new Error('Approval tracking row not found.');

//     await conn.commit();
//     return { formId, status };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };


// // ─── LOCK RECOGNITION (mark inventory/payment as already created) ───────────
// export const lockRecognitionAction = async (formId) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE PURCHASE_RECOGNITION_H SET ACTION_CREATED = 1 WHERE FORM_ID = :formId`,
//       { formId },
//       { autoCommit: true }
//     );
//     return { rowsAffected: result.rowsAffected };
//   } finally {
//     await conn.close();
//   }
// };


import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════════════════════════════════════════════════
// Helper: generate FORM_ID (format: PR-YYYY-NNNN, resets every year)
// ═══════════════════════════════════════════════════════════════
const generateFormId = async (conn, recognitionDate) => {
  const year = new Date(recognitionDate).getFullYear();

  const seqResult = await conn.execute(
    `SELECT MAX(TO_NUMBER(SUBSTR(FORM_ID, -4, 4))) V_NO
       FROM PURCHASE_RECOGNITION_H
      WHERE SUBSTR(FORM_ID, 4, 4) = :year`,
    { year: String(year) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const nextSeq = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(4, '0');
  return `PO-${year}-${nextSeq}`;
};

// ═══════════════════════════════════════════════════════════════
// Helper: generate PO_NUMBER (format: PO-YYYY-MM-NNNN, resets every month)
// ═══════════════════════════════════════════════════════════════
const generatePoNumber = async (conn, recognitionDate) => {
  const d = new Date(recognitionDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}-${month}`;

  const seqResult = await conn.execute(
    `SELECT MAX(TO_NUMBER(SUBSTR(PO_NUMBER, -4, 4))) V_NO
       FROM PURCHASE_RECOGNITION_H
      WHERE SUBSTR(PO_NUMBER, 4, 7) = :yearMonth`,
    { yearMonth },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const nextSeq = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(4, '0');
  return `PO-${yearMonth}-${nextSeq}`;
};

// ═══════════════════════════════════════════════════════════════
// Helper: generate INVOICE_NUMBER (format: YYYYMMNNN, resets every month)
// ═══════════════════════════════════════════════════════════════
const generateInvoiceNumber = async (conn, recognitionDate) => {
  const d = new Date(recognitionDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  const seqResult = await conn.execute(
    `SELECT MAX(TO_NUMBER(SUBSTR(INVOICE_NUMBER, -3, 3))) V_NO
       FROM PURCHASE_RECOGNITION_H
      WHERE SUBSTR(INVOICE_NUMBER, 1, 6) = :yearMonth`,
    { yearMonth },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const nextSeq = String((Number(seqResult.rows[0]?.V_NO || 0) + 1)).padStart(3, '0');
  return `${yearMonth}${nextSeq}`;
};

// ═══════════════════════════════════════════════════════════════
// Helper: resolve item details by ID from the ITEM table
// ═══════════════════════════════════════════════════════════════
const getItemMasterById = async (conn, itemId) => {
  const result = await conn.execute(
    `SELECT ITEM_ID, NAME, DESCRIPTION, PRICE
       FROM ITEM
      WHERE ITEM_ID = :itemId`,
    { itemId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows[0] ?? null;
};

// ═══════════════════════════════════════════════════════════════
// ITEM — search/autocomplete for the item line picker
// ═══════════════════════════════════════════════════════════════
export const searchItems = async (keyword) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ITEM_ID, NAME, DESCRIPTION, PRICE
         FROM ITEM
        WHERE UPPER(NAME) LIKE UPPER(:kw) OR UPPER(DESCRIPTION) LIKE UPPER(:kw)
        ORDER BY NAME ASC
        FETCH FIRST 50 ROWS ONLY`,
      { kw: `%${keyword ?? ''}%` },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// PURCHASE RECOGNITION (H + D) — CRUD
// ═══════════════════════════════════════════════════════════════

// ─── CREATE (transaction: H → D → Approval Tracking) ─────────────────────────
export const createPurchaseRecognition = async (data) => {
  // data: { header: {...}, items: [{ itemNo, itemId, grnQty, qtyRecv, unitId, unit, unitPrice(optional-auto) }], createdBy }
  const conn = await getConnection();
  try {
    const formId = await generateFormId(conn, data.header.recognitionDate);
    const poNumber = await generatePoNumber(conn, data.header.recognitionDate);
    const invoiceNumber = await generateInvoiceNumber(conn, data.header.recognitionDate);

    // Resolve item master details (name / description / price) for each line
    const resolvedItems = [];
    for (const item of data.items) {
      const master = item.itemId ? await getItemMasterById(conn, item.itemId) : null;
      resolvedItems.push({
        ...item,
        description: item.description ?? master?.DESCRIPTION ?? null,
        unitPrice:   item.unitPrice   ?? master?.PRICE       ?? 0,
      });
    }

    // ✅ Total ager moto QTY_RECV (Receive Qty) * unitPrice diyei calculate hoy,
    //    GRN_QTY sudhu additional tracking field, total-e effect nai
    const totalAmount = resolvedItems.reduce(
      (s, it) => s + Number(it.qtyRecv || 0) * Number(it.unitPrice || 0), 0
    );

    // 1. Insert Header
   await conn.execute(
  `INSERT INTO PURCHASE_RECOGNITION_H (
    FORM_ID, RECOGNITION_DATE, PO_NUMBER, INVOICE_NUMBER,
    DEPARTMENT, REQUESTED_BY, SUPPLIER_ID, VENDOR_NAME, CONTACT_PERSON,
    COST_CENTER_CODE, INVOICE_DATE, DESCRIPTION, PURCHASE_TYPE, CREATED_BY, CREATION_DATE,
    INV_TYPE, PAYMENT_CODE, STATUS
  ) VALUES (
    :formId, TO_DATE(:recognitionDate,'YYYY-MM-DD'), :poNumber, :invoiceNumber,
    :department, :requestedBy, :supplierId, :vendorName, :contactPerson,
    :costCenterCode, TO_DATE(:invoiceDate,'YYYY-MM-DD'), :description, :purchaseType, :createdBy, SYSDATE,
    :invType, :paymentCode, 1
  )`,
  {
    formId,
    recognitionDate: data.header.recognitionDate,
    poNumber,
    invoiceNumber,
    department:      data.header.department ?? null,
    requestedBy:     data.header.requestedBy ?? null,
    supplierId:      data.header.supplierId ?? null,
    vendorName:      data.header.vendorName ?? null,
    contactPerson:   data.header.contactPerson ?? null,
    costCenterCode:  data.header.costCenterCode ?? null,
    invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
    description:     data.header.description ?? null,
    purchaseType:    data.header.purchaseType ?? 'ITEM',
    createdBy:       data.createdBy ?? null,
    invType:         data.header.invType ?? null,
    paymentCode:     data.header.paymentCode ?? null,
  },
  { autoCommit: false }
);

    // 2. Insert Line Items
    for (const item of resolvedItems) {
      const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
      await conn.execute(
        `INSERT INTO PURCHASE_RECOGNITION_D (
           FORM_ID, ITEM_NO, ITEM_ID, DESCRIPTION, GRN_QTY, QTY_RECV, UNIT_ID, UOM,
           UNIT_PRICE, TOTAL_PRICE, ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
        ) VALUES (
          :formId, :itemNo, :itemId, :description, :grnQty, :qtyRecv, :unitId, :uom,
          :unitPrice, :totalPrice, :assetClassCode, :assetTagId, SYSDATE
        )`,
        {
          formId,
          itemNo:         item.itemNo ?? null,
          itemId:         item.itemId ?? null,
          description:    item.description ?? null,
          grnQty:         Number(item.grnQty || 0),
          qtyRecv:        Number(item.qtyRecv || 0),
          unitId:         item.unitId ?? null,
          uom:            item.unit ?? null,
          unitPrice:      Number(item.unitPrice || 0),
          totalPrice,
          assetClassCode: item.assetClassCode ?? null,
          assetTagId:     item.assetTagId ?? null,
        },
        { autoCommit: false }
      );
    }

    // 3. Insert Approval Tracking row (single status, starts Pending)
    // await conn.execute(
    //   `INSERT INTO PURCHASE_APPROVAL_TRACKING (
    //     FORM_ID, PO_NUMBER, VENDOR_NAME, TOTAL_AMOUNT, OVERALL_STATUS
    //   ) VALUES (
    //      :formId, :poNumber, :vendorName, :totalAmount, 'Pending'
    //   )`,
    //   {
    //     formId,
    //     poNumber,
    //     vendorName: data.header.vendorName ?? null,
    //     totalAmount,
    //   },
    //   { autoCommit: false }
    // );

    await conn.commit();
    return { formId, poNumber, invoiceNumber, totalAmount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── GET ALL (list page — one row per form, item count + live total + status) ─
export const getAllPurchaseRecognitions = async () => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        h.ID,
        h.FORM_ID,
        h.RECOGNITION_DATE,
        h.PO_NUMBER,
        h.DEPARTMENT,
        h.VENDOR_NAME,
        h.SUPPLIER_ID,
        h.DESCRIPTION,
        h.PURCHASE_TYPE,
        h.ACTION_CREATED,
        h.CREATION_DATE,
        h.STATUS,
        (SELECT COUNT(*) FROM PURCHASE_RECOGNITION_D d WHERE d.FORM_ID = h.FORM_ID) AS ITEM_COUNT,
        (SELECT NVL(SUM(TOTAL_PRICE),0) FROM PURCHASE_RECOGNITION_D d WHERE d.FORM_ID = h.FORM_ID) AS TOTAL_AMOUNT,
        t.OVERALL_STATUS,
        t.REJECT_REASON
      FROM PURCHASE_RECOGNITION_H h
      LEFT JOIN PURCHASE_APPROVAL_TRACKING t ON t.FORM_ID = h.FORM_ID
      ORDER BY h.ID DESC
    `;
    const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE (header + items, for detail/edit view) ────────────────────────
// export const getPurchaseRecognitionByFormId = async (formId) => {
//   const conn = await getConnection();
//   try {
//     const hResult = await conn.execute(
//       `SELECT * FROM PURCHASE_RECOGNITION_H WHERE FORM_ID = :formId`,
//       { formId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const header = hResult.rows[0] ?? null;
//     if (!header) return null;

//     const dResult = await conn.execute(
//       `SELECT d.*, i.NAME AS ITEM_NAME
//          FROM PURCHASE_RECOGNITION_D d
//          LEFT JOIN ITEM i ON i.ITEM_ID = d.ITEM_ID
//         WHERE d.FORM_ID = :formId
//         ORDER BY d.ITEM_NO ASC, d.ID ASC`,
//       { formId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return { ...header, items: dResult.rows };
//   } finally {
//     await conn.close();
//   }
// };
// ─── GET SINGLE (header + items, for detail/edit view) ────────────────────────
export const getPurchaseRecognitionByFormId = async (formId) => {
  const conn = await getConnection();
  try {
    const hResult = await conn.execute(
      `SELECT h.*, t.OVERALL_STATUS, t.REJECT_REASON, t.TOTAL_AMOUNT AS TRACKED_TOTAL_AMOUNT
         FROM PURCHASE_RECOGNITION_H h
         LEFT JOIN PURCHASE_APPROVAL_TRACKING t ON t.FORM_ID = h.FORM_ID
        WHERE h.FORM_ID = :formId`,
      { formId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const header = hResult.rows[0] ?? null;
    if (!header) return null;

    const dResult = await conn.execute(
      `SELECT d.*, i.NAME AS ITEM_NAME
         FROM PURCHASE_RECOGNITION_D d
         LEFT JOIN ITEM i ON i.ITEM_ID = d.ITEM_ID
        WHERE d.FORM_ID = :formId
        ORDER BY d.ITEM_NO ASC, d.ID ASC`,
      { formId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return { ...header, items: dResult.rows };
  } finally {
    await conn.close();
  }
};
// ─── UPDATE (header fields + full item replace) ───────────────────────────────
// PO_NUMBER is never regenerated/changed on update — it stays fixed once created.
export const updatePurchaseRecognition = async (formId, data) => {
  // data: { header: {...}, items: [...], updatedBy }
  const conn = await getConnection();
  
  try {
    const statusCheck = await conn.execute(
      `SELECT STATUS FROM PURCHASE_RECOGNITION_H WHERE FORM_ID = :formId`,
      { formId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!statusCheck.rows[0]) throw new Error('Purchase recognition form not found.');
    if (Number(statusCheck.rows[0].STATUS) !== 1) {
      throw new Error('Only draft forms can be edited.');
    }
    const hResult = await conn.execute(
  `UPDATE PURCHASE_RECOGNITION_H
     SET RECOGNITION_DATE = TO_DATE(:recognitionDate,'YYYY-MM-DD'),
         DEPARTMENT       = :department,
         REQUESTED_BY     = :requestedBy,
         SUPPLIER_ID      = :supplierId,
         VENDOR_NAME      = :vendorName,
         CONTACT_PERSON   = :contactPerson,
         COST_CENTER_CODE = :costCenterCode,
         INVOICE_DATE     = TO_DATE(:invoiceDate,'YYYY-MM-DD'),
         DESCRIPTION      = :description,
         PURCHASE_TYPE    = :purchaseType,
         INV_TYPE         = :invType,
         PAYMENT_CODE     = :paymentCode,
         UPDATED_BY       = :updatedBy,
         UPDATED_DATE     = SYSDATE
   WHERE FORM_ID = :formId`,
  {
    recognitionDate: data.header.recognitionDate,
    department:      data.header.department ?? null,
    requestedBy:     data.header.requestedBy ?? null,
    supplierId:      data.header.supplierId ?? null,
    vendorName:      data.header.vendorName ?? null,
    contactPerson:   data.header.contactPerson ?? null,
    costCenterCode:  data.header.costCenterCode ?? null,
    invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
    description:     data.header.description ?? null,
    purchaseType:    data.header.purchaseType ?? 'ITEM',
    invType:         data.header.invType ?? null,
    paymentCode:     data.header.paymentCode ?? null,
    updatedBy:       data.updatedBy ?? null,
    formId,
  },
  { autoCommit: false }
);
    if (hResult.rowsAffected === 0) throw new Error('Purchase recognition form not found.');

    await conn.execute(
      `DELETE FROM PURCHASE_RECOGNITION_D WHERE FORM_ID = :formId`,
      { formId },
      { autoCommit: false }
    );

    // Resolve item master details (name / description / price) for each line
    const resolvedItems = [];
    for (const item of data.items) {
      const master = item.itemId ? await getItemMasterById(conn, item.itemId) : null;
      resolvedItems.push({
        ...item,
        description: item.description ?? master?.DESCRIPTION ?? null,
        unitPrice:   item.unitPrice   ?? master?.PRICE       ?? 0,
      });
    }

    let totalAmount = 0;
    for (const item of resolvedItems) {
      const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
      totalAmount += totalPrice;
      await conn.execute(
        `INSERT INTO PURCHASE_RECOGNITION_D (
           FORM_ID, ITEM_NO, ITEM_ID, DESCRIPTION, GRN_QTY, QTY_RECV, UNIT_ID, UOM,
           UNIT_PRICE, TOTAL_PRICE, ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
        ) VALUES (
          :formId, :itemNo, :itemId, :description, :grnQty, :qtyRecv, :unitId, :uom,
          :unitPrice, :totalPrice, :assetClassCode, :assetTagId, SYSDATE
        )`,
        {
          formId,
          itemNo:         item.itemNo ?? null,
          itemId:         item.itemId ?? null,
          description:    item.description ?? null,
          grnQty:         Number(item.grnQty || 0),
          qtyRecv:        Number(item.qtyRecv || 0),
          unitId:         item.unitId ?? null,
          uom:            item.unit ?? null,
          unitPrice:      Number(item.unitPrice || 0),
          totalPrice,
          assetClassCode: item.assetClassCode ?? null,
          assetTagId:     item.assetTagId ?? null,
        },
        { autoCommit: false }
      );
    }

    await conn.execute(
      `UPDATE PURCHASE_APPROVAL_TRACKING
         SET VENDOR_NAME  = :vendorName,
             TOTAL_AMOUNT = :totalAmount,
             UPDATED_DATE = SYSDATE
       WHERE FORM_ID = :formId`,
      {
        vendorName: data.header.vendorName ?? null,
        totalAmount,
        formId,
      },
      { autoCommit: false }
    );

    await conn.commit();
    return { formId, totalAmount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── DELETE (cascade across all 3 tables, manually — no FK enforcement) ──────
export const deletePurchaseRecognition = async (formId) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `DELETE FROM PURCHASE_RECOGNITION_D WHERE FORM_ID = :formId`,
      { formId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM PURCHASE_APPROVAL_TRACKING WHERE FORM_ID = :formId`,
      { formId },
      { autoCommit: false }
    );
    const result = await conn.execute(
      `DELETE FROM PURCHASE_RECOGNITION_H WHERE FORM_ID = :formId`,
      { formId },
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

// ═══════════════════════════════════════════════════════════════
// APPROVAL TRACKING — CRUD (single STATUS field: Pending → Approved)
// ═══════════════════════════════════════════════════════════════

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected'];

// ─── GET ALL (approval dashboard list) ────────────────────────────────────────
export const getAllApprovalTracking = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM PURCHASE_APPROVAL_TRACKING ORDER BY ID DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE ────────────────────────────────────────────────────────────────
export const getApprovalTrackingByFormId = async (formId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM PURCHASE_APPROVAL_TRACKING WHERE FORM_ID = :formId`,
      { formId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ─── UPDATE STATUS (Pending → Approved / Rejected) ────────────────────────────
// ─── UPDATE STATUS (Pending → Approved / Rejected) ────────────────────────────
// export const updateApprovalStatus = async (formId, status, reason = null) => {
//   if (!VALID_STATUSES.includes(status)) {
//     throw new Error(`Invalid status: ${status}`);
//   }
//   if (status === 'Rejected' && !reason) {
//     throw new Error('Rejection reason is required.');
//   }

//   const conn = await getConnection();
//   try {
//     const updateResult = await conn.execute(
//       `UPDATE PURCHASE_APPROVAL_TRACKING
//          SET OVERALL_STATUS = :status,
//              REJECT_REASON  = :reason,
//              UPDATED_DATE   = SYSDATE
//        WHERE FORM_ID = :formId`,
//       { status, reason, formId },
//       { autoCommit: false }
//     );
//     if (updateResult.rowsAffected === 0) throw new Error('Approval tracking row not found.');

//     await conn.commit();
//     return { formId, status, reason };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

export const updateApprovalStatus = async (formId, status, reason = null) => {
  if (!VALID_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  if (status === 'Rejected' && !reason) throw new Error('Rejection reason is required.');

  const conn = await getConnection();
  try {
    const updateResult = await conn.execute(
      `UPDATE PURCHASE_APPROVAL_TRACKING
         SET OVERALL_STATUS = :status, REJECT_REASON = :reason, UPDATED_DATE = SYSDATE
       WHERE FORM_ID = :formId`,
      { status, reason, formId },
      { autoCommit: false }
    );
    if (updateResult.rowsAffected === 0) throw new Error('Approval tracking row not found.');

    // ✅ Sync header STATUS: Approved → 3, Rejected → back to 1 (Draft, so it can be edited & resent)
    const headerStatus = status === 'Approved' ? 3 : status === 'Rejected' ? 1 : 2;
    await conn.execute(
      `UPDATE PURCHASE_RECOGNITION_H SET STATUS = :headerStatus WHERE FORM_ID = :formId`,
      { headerStatus, formId },
      { autoCommit: false }
    );

    await conn.commit();
    return { formId, status, reason };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── LOCK RECOGNITION (mark inventory/payment as already created) ───────────
export const lockRecognitionAction = async (formId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE PURCHASE_RECOGNITION_H SET ACTION_CREATED = 1 WHERE FORM_ID = :formId`,
      { formId },
      { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── SEND FOR APPROVAL (Draft → Waiting for Approval) ─────────────────────────
export const sendForApproval = async (formId) => {
  const conn = await getConnection();
  try {
    // Only allow from Draft (STATUS = 1)
    const hResult = await conn.execute(
      `SELECT PO_NUMBER, VENDOR_NAME, STATUS
         FROM PURCHASE_RECOGNITION_H WHERE FORM_ID = :formId`,
      { formId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const header = hResult.rows[0];
    if (!header) throw new Error('Form not found.');
    if (Number(header.STATUS) !== 1) throw new Error('Only draft forms can be sent for approval.');

    const totalResult = await conn.execute(
      `SELECT NVL(SUM(TOTAL_PRICE),0) AS TOTAL_AMOUNT
         FROM PURCHASE_RECOGNITION_D WHERE FORM_ID = :formId`,
      { formId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const totalAmount = totalResult.rows[0]?.TOTAL_AMOUNT ?? 0;

    await conn.execute(
      `UPDATE PURCHASE_RECOGNITION_H SET STATUS = 2 WHERE FORM_ID = :formId`,
      { formId },
      { autoCommit: false }
    );

    // Upsert-style: create tracking row if not exists, else reset to Pending
    const existing = await conn.execute(
      `SELECT ID FROM PURCHASE_APPROVAL_TRACKING WHERE FORM_ID = :formId`,
      { formId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existing.rows.length > 0) {
      await conn.execute(
        `UPDATE PURCHASE_APPROVAL_TRACKING
           SET OVERALL_STATUS = 'Pending', REJECT_REASON = NULL,
               TOTAL_AMOUNT = :totalAmount, UPDATED_DATE = SYSDATE
         WHERE FORM_ID = :formId`,
        { totalAmount, formId },
        { autoCommit: false }
      );
    } else {
      await conn.execute(
        `INSERT INTO PURCHASE_APPROVAL_TRACKING (
          FORM_ID, PO_NUMBER, VENDOR_NAME, TOTAL_AMOUNT, OVERALL_STATUS
        ) VALUES (:formId, :poNumber, :vendorName, :totalAmount, 'Pending')`,
        { formId, poNumber: header.PO_NUMBER, vendorName: header.VENDOR_NAME, totalAmount },
        { autoCommit: false }
      );
    }

    await conn.commit();
    return { formId, status: 2 };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};