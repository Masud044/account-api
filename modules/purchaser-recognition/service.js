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
//   return `PR-${year}-${nextSeq}`;
// };

// // ═══════════════════════════════════════════════════════════════
// // PURCHASE RECOGNITION (H + D) — CRUD
// // ═══════════════════════════════════════════════════════════════

// // ─── CREATE (transaction: H → D → Approval Tracking) ─────────────────────────
// export const createPurchaseRecognition = async (data) => {
//   // data: { header: {...}, items: [{ itemNo, description, qtyRecv, unitPrice, assetClassCode, assetTagId }], createdBy }
//   const conn = await getConnection();
//   try {
//     const formId = await generateFormId(conn, data.header.recognitionDate);

//     const totalAmount = data.items.reduce(
//       (s, it) => s + Number(it.qtyRecv || 0) * Number(it.unitPrice || 0), 0
//     );

//     // 1. Insert Header
//     await conn.execute(
//       `INSERT INTO PURCHASE_RECOGNITION_H (
//         FORM_ID, RECOGNITION_DATE, PO_NUMBER, INVOICE_NUMBER,
//         DEPARTMENT, REQUESTED_BY, SUPPLIER_ID, VENDOR_NAME, CONTACT_PERSON,
//         COST_CENTER_CODE, INVOICE_DATE, CREATED_BY, CREATION_DATE
//       ) VALUES (
//         :formId, TO_DATE(:recognitionDate,'YYYY-MM-DD'), :poNumber, :invoiceNumber,
//         :department, :requestedBy, :supplierId, :vendorName, :contactPerson,
//         :costCenterCode, TO_DATE(:invoiceDate,'YYYY-MM-DD'), :createdBy, SYSDATE
//       )`,
//       {
//         formId,
//         recognitionDate: data.header.recognitionDate,
//         poNumber:        data.header.poNumber ?? null,
//         invoiceNumber:   data.header.invoiceNumber ?? null,
//         department:      data.header.department ?? null,
//         requestedBy:     data.header.requestedBy ?? null,
//         supplierId:      data.header.supplierId ?? null,
//         vendorName:      data.header.vendorName ?? null,
//         contactPerson:   data.header.contactPerson ?? null,
//         costCenterCode:  data.header.costCenterCode ?? null,
//         invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
//         createdBy:       data.createdBy ?? null,
//       },
//       { autoCommit: false }
//     );

//     // 2. Insert Line Items
//     for (const item of data.items) {
//       const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
//       await conn.execute(
//         `INSERT INTO PURCHASE_RECOGNITION_D (
//            FORM_ID, ITEM_NO, DESCRIPTION, QTY_RECV, UNIT_PRICE, TOTAL_PRICE,
//           ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
//         ) VALUES (
//           :formId, :itemNo, :description, :qtyRecv, :unitPrice, :totalPrice,
//           :assetClassCode, :assetTagId, SYSDATE
//         )`,
//         {
//           formId,
//           itemNo:         item.itemNo ?? null,
//           description:    item.description ?? null,
//           qtyRecv:        Number(item.qtyRecv || 0),
//           unitPrice:      Number(item.unitPrice || 0),
//           totalPrice,
//           assetClassCode: item.assetClassCode ?? null,
//           assetTagId:     item.assetTagId ?? null,
//         },
//         { autoCommit: false }
//       );
//     }

//     // 3. Insert Approval Tracking row (all stages start Pending)
//     await conn.execute(
//       `INSERT INTO PURCHASE_APPROVAL_TRACKING (
//         FORM_ID, PO_NUMBER, VENDOR_NAME, TOTAL_AMOUNT,
//         STAGE1_IT_RECV, STAGE2_DEPT_HEAD, STAGE3_FINANCE, OVERALL_STATUS
//       ) VALUES (
//          :formId, :poNumber, :vendorName, :totalAmount,
//         'Pending', 'Pending', 'Pending', 'In Progress'
//       )`,
//       {
//         formId,
//         poNumber:   data.header.poNumber ?? null,
//         vendorName: data.header.vendorName ?? null,
//         totalAmount,
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
//       `SELECT * FROM PURCHASE_RECOGNITION_D WHERE FORM_ID = :formId ORDER BY ITEM_NO ASC, ID ASC`,
//       { formId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     return { ...header, items: dResult.rows };
//   } finally {
//     await conn.close();
//   }
// };

// // ─── UPDATE (header fields + full item replace) ───────────────────────────────
// export const updatePurchaseRecognition = async (formId, data) => {
//   // data: { header: {...}, items: [...], updatedBy }
//   const conn = await getConnection();
//   try {
//     const hResult = await conn.execute(
//       `UPDATE PURCHASE_RECOGNITION_H
//          SET RECOGNITION_DATE = TO_DATE(:recognitionDate,'YYYY-MM-DD'),
//              PO_NUMBER        = :poNumber,
//              INVOICE_NUMBER   = :invoiceNumber,
//              DEPARTMENT       = :department,
//              REQUESTED_BY     = :requestedBy,
//              SUPPLIER_ID      = :supplierId,
//              VENDOR_NAME      = :vendorName,
//              CONTACT_PERSON   = :contactPerson,
//              COST_CENTER_CODE = :costCenterCode,
//              INVOICE_DATE     = TO_DATE(:invoiceDate,'YYYY-MM-DD'),
//              UPDATED_BY       = :updatedBy,
//              UPDATED_DATE     = SYSDATE
//        WHERE FORM_ID = :formId`,
//       {
//         recognitionDate: data.header.recognitionDate,
//         poNumber:        data.header.poNumber ?? null,
//         invoiceNumber:   data.header.invoiceNumber ?? null,
//         department:      data.header.department ?? null,
//         requestedBy:     data.header.requestedBy ?? null,
//         supplierId:      data.header.supplierId ?? null,
//         vendorName:      data.header.vendorName ?? null,
//         contactPerson:   data.header.contactPerson ?? null,
//         costCenterCode:  data.header.costCenterCode ?? null,
//         invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
//         updatedBy:       data.updatedBy ?? null,
//         formId,
//       },
//       { autoCommit: false }
//     );
//     if (hResult.rowsAffected === 0) throw new Error('Purchase recognition form not found.');

//     await conn.execute(
//       `DELETE FROM PURCHASE_RECOGNITION_D WHERE FORM_ID = :formId`,
//       { formId },
//       { autoCommit: false }
//     );

//     let totalAmount = 0;
//     for (const item of data.items) {
//       const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
//       totalAmount += totalPrice;
//       await conn.execute(
//         `INSERT INTO PURCHASE_RECOGNITION_D (
//            FORM_ID, ITEM_NO, DESCRIPTION, QTY_RECV, UNIT_PRICE, TOTAL_PRICE,
//           ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
//         ) VALUES (
//           :formId, :itemNo, :description, :qtyRecv, :unitPrice, :totalPrice,
//           :assetClassCode, :assetTagId, SYSDATE
//         )`,
//         {
//           formId,
//           itemNo:         item.itemNo ?? null,
//           description:    item.description ?? null,
//           qtyRecv:        Number(item.qtyRecv || 0),
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
//          SET PO_NUMBER    = :poNumber,
//              VENDOR_NAME  = :vendorName,
//              TOTAL_AMOUNT = :totalAmount,
//              UPDATED_DATE = SYSDATE
//        WHERE FORM_ID = :formId`,
//       {
//         poNumber:   data.header.poNumber ?? null,
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
// // APPROVAL TRACKING — CRUD
// // ═══════════════════════════════════════════════════════════════

// const VALID_STAGES = ['STAGE1_IT_RECV', 'STAGE2_DEPT_HEAD', 'STAGE3_FINANCE'];

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

// // ─── UPDATE STAGE (update one stage, then recalculate overall status) ────────
// export const updateApprovalStage = async (formId, stage, value) => {
//   if (!VALID_STAGES.includes(stage)) {
//     throw new Error(`Invalid stage: ${stage}`);
//   }

//   const conn = await getConnection();
//   try {
//     const updateResult = await conn.execute(
//       `UPDATE PURCHASE_APPROVAL_TRACKING
//          SET ${stage} = :value, UPDATED_DATE = SYSDATE
//        WHERE FORM_ID = :formId`,
//       { value, formId },
//       { autoCommit: false }
//     );
//     if (updateResult.rowsAffected === 0) throw new Error('Approval tracking row not found.');

//     const rowResult = await conn.execute(
//       `SELECT STAGE1_IT_RECV, STAGE2_DEPT_HEAD, STAGE3_FINANCE
//          FROM PURCHASE_APPROVAL_TRACKING WHERE FORM_ID = :formId`,
//       { formId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const row = rowResult.rows[0];
//     const overallStatus =
//       row.STAGE1_IT_RECV === 'Approved' &&
//       row.STAGE2_DEPT_HEAD === 'Approved' &&
//       row.STAGE3_FINANCE === 'Approved'
//         ? 'Fully Approved'
//         : 'In Progress';

//     await conn.execute(
//       `UPDATE PURCHASE_APPROVAL_TRACKING SET OVERALL_STATUS = :overallStatus WHERE FORM_ID = :formId`,
//       { overallStatus, formId },
//       { autoCommit: false }
//     );

//     await conn.commit();
//     return { formId, [stage]: value, overallStatus };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
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
  const yearMonth = `${year}-${month}`; // 7 chars, e.g. 2026-07

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
// e.g. 202607085
// ═══════════════════════════════════════════════════════════════
const generateInvoiceNumber = async (conn, recognitionDate) => {
  const d = new Date(recognitionDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`; // 6 chars, e.g. 202607

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
// Table: ITEM(ID, NAME, DESCRIPTION, PRICE)
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
  // data: { header: { recognitionDate, invoiceNumber, department, requestedBy,
  //                    supplierId, vendorName, contactPerson, costCenterCode,
  //                    invoiceDate, description },
  //         items: [{ itemNo, itemId, qtyRecv, unitPrice(optional-auto), assetClassCode, assetTagId }],
  //         createdBy }
  const conn = await getConnection();
  try {
    const formId = await generateFormId(conn, data.header.recognitionDate);
const poNumber = await generatePoNumber(conn, data.header.recognitionDate);
const invoiceNumber = await generateInvoiceNumber(conn, data.header.recognitionDate);   // 👈 নতুন

    // Resolve item master details (name / description / price) for each line
    const resolvedItems = [];
    for (const item of data.items) {
      const master = item.itemId ? await getItemMasterById(conn, item.itemId) : null;
      resolvedItems.push({
        ...item,
        description: item.description ?? master?.DESCRIPTION  ?? null,
        unitPrice:   item.unitPrice   ?? master?.PRICE    ?? 0,
      });
    }

    const totalAmount = resolvedItems.reduce(
      (s, it) => s + Number(it.qtyRecv || 0) * Number(it.unitPrice || 0), 0
    );

    // 1. Insert Header
    // await conn.execute(
    //   `INSERT INTO PURCHASE_RECOGNITION_H (
    //     FORM_ID, RECOGNITION_DATE, PO_NUMBER, INVOICE_NUMBER,
    //     DEPARTMENT, REQUESTED_BY, SUPPLIER_ID, VENDOR_NAME, CONTACT_PERSON,
    //     COST_CENTER_CODE, INVOICE_DATE, DESCRIPTION, CREATED_BY, CREATION_DATE
    //   ) VALUES (
    //     :formId, TO_DATE(:recognitionDate,'YYYY-MM-DD'), :poNumber, :invoiceNumber,
    //     :department, :requestedBy, :supplierId, :vendorName, :contactPerson,
    //     :costCenterCode, TO_DATE(:invoiceDate,'YYYY-MM-DD'), :description, :createdBy, SYSDATE
    //   )`,
    //   {
    //     formId,
    //     recognitionDate: data.header.recognitionDate,
    //     poNumber,
    //     invoiceNumber:   data.header.invoiceNumber ?? null,
    //     department:      data.header.department ?? null,
    //     requestedBy:     data.header.requestedBy ?? null,
    //     supplierId:      data.header.supplierId ?? null,
    //     vendorName:      data.header.vendorName ?? null,
    //     contactPerson:   data.header.contactPerson ?? null,
    //     costCenterCode:  data.header.costCenterCode ?? null,
    //     invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
    //     description:     data.header.description ?? null,
    //     createdBy:       data.createdBy ?? null,
    //   },
    //   { autoCommit: false }
    // );

   await conn.execute(
  `INSERT INTO PURCHASE_RECOGNITION_H (
    FORM_ID, RECOGNITION_DATE, PO_NUMBER, INVOICE_NUMBER,
    DEPARTMENT, REQUESTED_BY, SUPPLIER_ID, VENDOR_NAME, CONTACT_PERSON,
    COST_CENTER_CODE, INVOICE_DATE, DESCRIPTION, PURCHASE_TYPE, CREATED_BY, CREATION_DATE
  ) VALUES (
    :formId, TO_DATE(:recognitionDate,'YYYY-MM-DD'), :poNumber, :invoiceNumber,
    :department, :requestedBy, :supplierId, :vendorName, :contactPerson,
    :costCenterCode, TO_DATE(:invoiceDate,'YYYY-MM-DD'), :description, :purchaseType, :createdBy, SYSDATE
  )`,
  {
    formId,
    recognitionDate: data.header.recognitionDate,
    poNumber,
    invoiceNumber,   // 👈 এখন auto-generated (আগের data.header.invoiceNumber বাদ)
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
  },
  { autoCommit: false }
);

    // 2. Insert Line Items
    for (const item of resolvedItems) {
      const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
      await conn.execute(
        `INSERT INTO PURCHASE_RECOGNITION_D (
           FORM_ID, ITEM_NO, ITEM_ID, DESCRIPTION, QTY_RECV, UNIT_PRICE, TOTAL_PRICE,
          ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
        ) VALUES (
          :formId, :itemNo, :itemId, :description, :qtyRecv, :unitPrice, :totalPrice,
          :assetClassCode, :assetTagId, SYSDATE
        )`,
        {
          formId,
          itemNo:         item.itemNo ?? null,
          itemId:         item.itemId ?? null,
          description:    item.description ?? null,
          qtyRecv:        Number(item.qtyRecv || 0),
          unitPrice:      Number(item.unitPrice || 0),
          totalPrice,
          assetClassCode: item.assetClassCode ?? null,
          assetTagId:     item.assetTagId ?? null,
        },
        { autoCommit: false }
      );
    }

    // 3. Insert Approval Tracking row (single status, starts Pending)
    await conn.execute(
      `INSERT INTO PURCHASE_APPROVAL_TRACKING (
        FORM_ID, PO_NUMBER, VENDOR_NAME, TOTAL_AMOUNT, OVERALL_STATUS
      ) VALUES (
         :formId, :poNumber, :vendorName, :totalAmount, 'Pending'
      )`,
      {
        formId,
        poNumber,
        vendorName: data.header.vendorName ?? null,
        totalAmount,
      },
      { autoCommit: false }
    );

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
        h.CREATION_DATE,
        (SELECT COUNT(*) FROM PURCHASE_RECOGNITION_D d WHERE d.FORM_ID = h.FORM_ID) AS ITEM_COUNT,
        (SELECT NVL(SUM(TOTAL_PRICE),0) FROM PURCHASE_RECOGNITION_D d WHERE d.FORM_ID = h.FORM_ID) AS TOTAL_AMOUNT,
        t.OVERALL_STATUS
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
export const getPurchaseRecognitionByFormId = async (formId) => {
  const conn = await getConnection();
  try {
    const hResult = await conn.execute(
      `SELECT * FROM PURCHASE_RECOGNITION_H WHERE FORM_ID = :formId`,
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
    // const hResult = await conn.execute(
    //   `UPDATE PURCHASE_RECOGNITION_H
    //      SET RECOGNITION_DATE = TO_DATE(:recognitionDate,'YYYY-MM-DD'),
    //          INVOICE_NUMBER   = :invoiceNumber,
    //          DEPARTMENT       = :department,
    //          REQUESTED_BY     = :requestedBy,
    //          SUPPLIER_ID      = :supplierId,
    //          VENDOR_NAME      = :vendorName,
    //          CONTACT_PERSON   = :contactPerson,
    //          COST_CENTER_CODE = :costCenterCode,
    //          INVOICE_DATE     = TO_DATE(:invoiceDate,'YYYY-MM-DD'),
    //          DESCRIPTION      = :description,
    //          UPDATED_BY       = :updatedBy,
    //          UPDATED_DATE     = SYSDATE
    //    WHERE FORM_ID = :formId`,
    //   {
    //     recognitionDate: data.header.recognitionDate,
    //     invoiceNumber:   data.header.invoiceNumber ?? null,
    //     department:      data.header.department ?? null,
    //     requestedBy:     data.header.requestedBy ?? null,
    //     supplierId:      data.header.supplierId ?? null,
    //     vendorName:      data.header.vendorName ?? null,
    //     contactPerson:   data.header.contactPerson ?? null,
    //     costCenterCode:  data.header.costCenterCode ?? null,
    //     invoiceDate:     data.header.invoiceDate ?? data.header.recognitionDate,
    //     description:     data.header.description ?? null,
    //     updatedBy:       data.updatedBy ?? null,
    //     formId,
    //   },
    //   { autoCommit: false }
    // );

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
        description: item.description ?? master?.DESCRIPTION  ?? null,
        unitPrice:   item.unitPrice   ?? master?.PRICE    ?? 0,
      });
    }

    let totalAmount = 0;
    for (const item of resolvedItems) {
      const totalPrice = Number(item.qtyRecv || 0) * Number(item.unitPrice || 0);
      totalAmount += totalPrice;
      await conn.execute(
        `INSERT INTO PURCHASE_RECOGNITION_D (
           FORM_ID, ITEM_NO, ITEM_ID, DESCRIPTION, QTY_RECV, UNIT_PRICE, TOTAL_PRICE,
          ASSET_CLASS_CODE, ASSET_TAG_ID, CREATION_DATE
        ) VALUES (
          :formId, :itemNo, :itemId, :description, :qtyRecv, :unitPrice, :totalPrice,
          :assetClassCode, :assetTagId, SYSDATE
        )`,
        {
          formId,
          itemNo:         item.itemNo ?? null,
          itemId:         item.itemId ?? null,
          description:    item.description ?? null,
          qtyRecv:        Number(item.qtyRecv || 0),
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
export const updateApprovalStatus = async (formId, status) => {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const conn = await getConnection();
  try {
    const updateResult = await conn.execute(
      `UPDATE PURCHASE_APPROVAL_TRACKING
         SET OVERALL_STATUS = :status, UPDATED_DATE = SYSDATE
       WHERE FORM_ID = :formId`,
      { status, formId },
      { autoCommit: false }
    );
    if (updateResult.rowsAffected === 0) throw new Error('Approval tracking row not found.');

    await conn.commit();
    return { formId, status };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};