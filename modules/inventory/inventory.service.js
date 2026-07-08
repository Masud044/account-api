// import { getConnection, oracledb } from '../../config/db.js';

// // ═══════════════════════════════════════════════════════════════
// // Helper: generate GRN_NO (INVENTORY_H theke, running number 100+)
// // ═══════════════════════════════════════════════════════════════
// // ═══════════════════════════════════════════════════════════════
// // Helper: generate GRN_NO — format: GRN-YYYY-MM-XXXX
// // Sequence proti mash e 0001 theke abar shuru hoy
// // ═══════════════════════════════════════════════════════════════
// const generateGrnNo = async (conn) => {
//   const yearMonth = await conn.execute(
//     `SELECT TO_CHAR(SYSDATE, 'YYYY') Y, TO_CHAR(SYSDATE, 'MM') M FROM DUAL`,
//     {},
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const { Y: year, M: month } = yearMonth.rows[0];
//   const prefix = `GRN-${year}-${month}-`;

//   const seqResult = await conn.execute(
//     `SELECT MAX(TO_NUMBER(SUBSTR(GRN_NO, -4))) V_NO
//        FROM INVENTORY_H
//       WHERE GRN_NO LIKE :prefix || '%'`,
//     { prefix },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const lastNo = Number(seqResult.rows[0]?.V_NO || 0);
//   const nextNo = String(lastNo + 1).padStart(4, '0');

//   return `${prefix}${nextNo}`;
// };

// export const getNextGrnNo = async () => {
//   const conn = await getConnection();
//   try {
//     return await generateGrnNo(conn);
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // Helper: generate PO_NO — format: PO-YYYY-MM-XXXX
// // ═══════════════════════════════════════════════════════════════
// const generatePoNo = async (conn) => {
//   const yearMonth = await conn.execute(
//     `SELECT TO_CHAR(SYSDATE, 'YYYY') Y, TO_CHAR(SYSDATE, 'MM') M FROM DUAL`,
//     {},
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const { Y: year, M: month } = yearMonth.rows[0];
//   const prefix = `PO-${year}-${month}-`;

//   const seqResult = await conn.execute(
//     `SELECT MAX(TO_NUMBER(SUBSTR(PO_NO, -4))) V_NO
//        FROM INVENTORY_H
//       WHERE PO_NO LIKE :prefix || '%'`,
//     { prefix },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const lastNo = Number(seqResult.rows[0]?.V_NO || 0);
//   const nextNo = String(lastNo + 1).padStart(4, '0');

//   return `${prefix}${nextNo}`;
// };

// export const getNextPoNo = async () => {
//   const conn = await getConnection();
//   try {
//     return await generatePoNo(conn);
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // CREATE — header + multiple line items, single transaction
// // data = { invDate, storeId, poNo, grnNo?, creationBy?, items: [...] }
// // ═══════════════════════════════════════════════════════════════
// export const createInventory = async (data) => {
//   const conn = await getConnection();
//   try {
//     const grnNo = data.grnNo || await generateGrnNo(conn);
//      const poNo  = data.poNo  || await generatePoNo(conn);  

//     // 1) HEADER INSERT
//     const hSql = `
//       INSERT INTO INVENTORY_H (
//         INV_DATE, STORE_ID, GRN_NO, PO_NO, CREATION_BY
//       ) VALUES (
//         :invDate, :storeId, :grnNo, :poNo, :creationBy
//       )
//       RETURNING ID INTO :outId
//     `;
//     const hBinds = {
//       invDate:    data.invDate ? new Date(data.invDate) : new Date(),
//       storeId:    data.storeId,
//       grnNo,
//       poNo,      
//       creationBy: data.creationBy ?? null,
//       outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
//     };
//     const hResult = await conn.execute(hSql, hBinds, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
//     const hid = hResult.outBinds.outId[0];

//     // 2) LINE ITEMS INSERT
//     const items = data.items || [];
//     const lineSql = `
//       INSERT INTO INVENTORIES (
//         HID, INVQTY, ITEM, PRICE, INVTDATE, INVSTATUS, INVOICE_STATUS,
//         ITEMTYPE, ACCOUNTED, UNIT, UNIT_PRICE, UNIT_ID,
//         SELLING_UNIT_PRICE, INVENTORY_TYPE, RECEIVE_QTY
//       ) VALUES (
//         :hid, :invQty, :item, :price, :invtDate, :invStatus, :invoiceStatus,
//         :itemType, :accounted, :unit, :unitPrice, :unitId,
//         :sellingUnitPrice, :inventoryType, :receiveQty
//       )
//     `;

//     for (const it of items) {
//       const lineBinds = {
//         hid,
//         invQty:           it.invQty           ?? null,
//         item:             it.item,
//         price:            it.price            ?? null,
//         invtDate:         it.invtDate ? new Date(it.invtDate) : (data.invDate ? new Date(data.invDate) : new Date()),
//         invStatus:        it.invStatus        ?? 1,
//         invoiceStatus:    it.invoiceStatus    ?? 0,
//         itemType:         it.itemType         ?? null,
//         accounted:        it.accounted        ?? null,
//         unit:             it.unit             ?? null,
//         unitPrice:        it.unitPrice != null ? String(it.unitPrice) : null, // VARCHAR2 column
//         unitId:           it.unitId           ?? null,
//         sellingUnitPrice: it.sellingUnitPrice ?? null,
//         inventoryType:    it.inventoryType    ?? null,
//         receiveQty:       it.receiveQty       ?? null,
//       };
//       await conn.execute(lineSql, lineBinds, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
//     }

//     await conn.commit();
//     return { hid, grnNo, poNo, itemCount: items.length };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // UPDATE — header update + diff-based upsert of line items
// // data = { invDate, storeId, poNo, grnNo, updateBy?, items: [{ tid?, ... }] }
// // ═══════════════════════════════════════════════════════════════
// export const updateInventory = async (hid, data) => {
//   const conn = await getConnection();
//   try {
//     // 1) HEADER UPDATE
//     const hSql = `
//       UPDATE INVENTORY_H SET
//         INV_DATE     = :invDate,
//         STORE_ID     = :storeId,
//         GRN_NO       = :grnNo,
//         PO_NO        = :poNo,
//         UPDATE_BY    = :updateBy,
//         UPDATED_DATE = SYSDATE
//       WHERE ID = :hid
//     `;
//     await conn.execute(hSql, {
//       hid,
//       invDate:  data.invDate ? new Date(data.invDate) : null,
//       storeId:  data.storeId,
//       grnNo:    data.grnNo || null,
//       poNo:     data.poNo  || null,
//       updateBy: data.updateBy ?? null,
//     }, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });

//     const items = data.items || [];

//     // 2) EXISTING TIDs
//     const existingResult = await conn.execute(
//       `SELECT TID FROM INVENTORIES WHERE HID = :hid`,
//       { hid },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const existingTids = existingResult.rows.map(r => r.TID);
//     const incomingTids  = items.filter(it => it.tid).map(it => Number(it.tid));

//     // 3) DELETE — payload e r nai emon lines
//     const toDelete = existingTids.filter(tid => !incomingTids.includes(tid));
//     for (const tid of toDelete) {
//       await conn.execute(`DELETE FROM INVENTORIES WHERE TID = :tid`, { tid }, { autoCommit: false });
//     }

//     // 4) UPDATE / INSERT
//     const updateSql = `
//       UPDATE INVENTORIES SET
//         INVQTY             = :invQty,
//         ITEM               = :item,
//         PRICE              = :price,
//         INVTDATE           = :invtDate,
//         INVSTATUS          = :invStatus,
//         INVOICE_STATUS     = :invoiceStatus,
//         ITEMTYPE           = :itemType,
//         ACCOUNTED          = :accounted,
//         UNIT               = :unit,
//         UNIT_PRICE         = :unitPrice,
//         UNIT_ID            = :unitId,
//         SELLING_UNIT_PRICE = :sellingUnitPrice,
//         INVENTORY_TYPE     = :inventoryType,
//         RECEIVE_QTY        = :receiveQty,
//         UPDATE_DATE        = SYSDATE
//       WHERE TID = :tid
//     `;
//     const insertSql = `
//       INSERT INTO INVENTORIES (
//         HID, INVQTY, ITEM, PRICE, INVTDATE, INVSTATUS, INVOICE_STATUS,
//         ITEMTYPE, ACCOUNTED, UNIT, UNIT_PRICE, UNIT_ID,
//         SELLING_UNIT_PRICE, INVENTORY_TYPE, RECEIVE_QTY
//       ) VALUES (
//         :hid, :invQty, :item, :price, :invtDate, :invStatus, :invoiceStatus,
//         :itemType, :accounted, :unit, :unitPrice, :unitId,
//         :sellingUnitPrice, :inventoryType, :receiveQty
//       )
//     `;

//     for (const it of items) {
//       const lineBinds = {
//         invQty:           it.invQty           ?? null,
//         item:             it.item,
//         price:            it.price            ?? null,
//         invtDate:         it.invtDate ? new Date(it.invtDate) : new Date(),
//         invStatus:        it.invStatus        ?? 1,
//         invoiceStatus:    it.invoiceStatus    ?? 0,
//         itemType:         it.itemType         ?? null,
//         accounted:        it.accounted        ?? null,
//         unit:             it.unit             ?? null,
//         unitPrice:        it.unitPrice != null ? String(it.unitPrice) : null,
//         unitId:           it.unitId           ?? null,
//         sellingUnitPrice: it.sellingUnitPrice ?? null,
//         inventoryType:    it.inventoryType    ?? null,
//         receiveQty:       it.receiveQty       ?? null,
//       };

//       if (it.tid) {
//         await conn.execute(updateSql, { ...lineBinds, tid: Number(it.tid) }, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
//       } else {
//         await conn.execute(insertSql, { ...lineBinds, hid }, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
//       }
//     }

//     await conn.commit();
//     return { rowsAffected: items.length };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // LIST — header level, joined with store, aggregated item count/qty
// // ═══════════════════════════════════════════════════════════════
// export const getAllInventories = async ({ page = 1, limit = 20 } = {}) => {
//   const conn = await getConnection();
//   try {
//     const offset = (page - 1) * limit;
//     const sql = `
//       SELECT *
//       FROM (
//         SELECT g.*, ROWNUM AS RN
//         FROM (
//           SELECT
//             h.ID              AS HID,
//             h.INV_DATE,
//             h.STORE_ID,
//             h.GRN_NO,
//             h.PO_NO,
//             h.CREATION_DATE,
//             h.UPDATED_DATE,
//             st.STORE_NAME,
//             st.LOCATION       AS STORE_LOCATION,
//             COUNT(inv.TID)    AS ITEM_COUNT,
//             SUM(inv.INVQTY)   AS TOTAL_QTY
//           FROM INVENTORY_H h
//           LEFT JOIN INVENTORIES inv ON inv.HID = h.ID
//           LEFT JOIN STORES st       ON h.STORE_ID = st.STORE_ID
//           GROUP BY h.ID, h.INV_DATE, h.STORE_ID, h.GRN_NO, h.PO_NO,
//                    h.CREATION_DATE, h.UPDATED_DATE, st.STORE_NAME, st.LOCATION
//           ORDER BY h.ID DESC
//         ) g
//       )
//       WHERE RN > :offset AND RN <= :endRow
//     `;
//     const result = await conn.execute(sql, { offset, endRow: offset + limit }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // GET SINGLE — header + full line items array (with item/uom/stock joins)
// // ═══════════════════════════════════════════════════════════════
// export const getInventoryById = async (hid) => {
//   const conn = await getConnection();
//   try {
//     const hSql = `
//       SELECT h.ID AS HID, h.INV_DATE, h.STORE_ID, h.GRN_NO, h.PO_NO,
//              h.CREATION_DATE, h.CREATION_BY, h.UPDATED_DATE, h.UPDATE_BY,
//              st.STORE_NAME, st.LOCATION AS STORE_LOCATION
//       FROM INVENTORY_H h
//       LEFT JOIN STORES st ON h.STORE_ID = st.STORE_ID
//       WHERE h.ID = :hid
//     `;
//     const hResult = await conn.execute(hSql, { hid }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//     const header = hResult.rows[0];
//     if (!header) return null;

//     const lineSql = `
//       SELECT
//         inv.TID, inv.INVQTY, inv.ITEM AS INV_ITEM_ID, inv.PRICE AS INV_PRICE,
//         inv.INVTDATE, inv.INVSTATUS, inv.INVOICE_STATUS, inv.ITEMTYPE, inv.ACCOUNTED,
//         inv.UNIT AS INV_UNIT, inv.UNIT_PRICE, inv.UNIT_ID AS INV_UNIT_ID,
//         inv.SELLING_UNIT_PRICE, inv.INVENTORY_TYPE, inv.RECEIVE_QTY,
//         inv.ENTRY_DATE, inv.UPDATE_DATE,
//         uom.NAME AS UOM_NAME,
//         ist.STOCK_QTY, ist.MINIMUM_LEVEL, ist.STATUS AS STOCK_STATUS,
//         ist.PRICE AS STOCK_PRICE, ist.LAST_PRICE, ist.UOM, ist.BOOKED,
//         itm.ITEM_ID, itm.NAME AS ITEM_NAME, itm.DESCRIPTION AS ITEM_DESCRIPTION,
//         itm.MODEL, itm.BRAND_ID, itm.SIZE_ID, itm.ORIGIN_ID, itm.CATEGORY_ID,
//         itm.TYPE_ID, itm.COLOR_ID, itm.SUBCAT_ID, itm.STATUS AS ITEM_STATUS, itm.UNIT AS ITEM_UNIT
//       FROM INVENTORIES inv
//       LEFT JOIN ITEM itm       ON inv.ITEM = itm.ITEM_ID
//       LEFT JOIN ITEM_STOCK ist ON inv.ITEM = ist.ITEM_ID AND ist.STORE_ID = :storeId
//       LEFT JOIN INV_UOM uom   ON inv.UNIT_ID = uom.ID
//       WHERE inv.HID = :hid
//       ORDER BY inv.TID
//     `;
//     const lineResult = await conn.execute(lineSql, { hid, storeId: header.STORE_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

//     return { ...header, items: lineResult.rows };
//   } finally {
//     await conn.close();
//   }
// };

// // ═══════════════════════════════════════════════════════════════
// // DELETE — protected: approved (INVSTATUS=2) line thakle delete allow na
// // ═══════════════════════════════════════════════════════════════
// export const deleteInventory = async (hid) => {
//   const conn = await getConnection();
//   try {
//     const check = await conn.execute(
//       `SELECT COUNT(*) CNT FROM INVENTORIES WHERE HID = :hid AND INVSTATUS = 2`,
//       { hid },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     if (check.rows[0].CNT > 0) {
//       throw new Error('Approved item(s) ache, delete kora jabe na.');
//     }

//     await conn.execute(`DELETE FROM INVENTORIES WHERE HID = :hid`, { hid }, { autoCommit: false });
//     const result = await conn.execute(`DELETE FROM INVENTORY_H WHERE ID = :hid`, { hid }, { autoCommit: false });
//     await conn.commit();
//     return { rowsAffected: result.rowsAffected };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// };

import { getConnection, oracledb } from '../../config/db.js';

// ═══════════════════════════════════════════════════════════════
// Helper: generate GRN_NO — format: GRN-YYYY-MM-XXXX
// Sequence proti mash e 0001 theke abar shuru hoy
// ═══════════════════════════════════════════════════════════════
const generateGrnNo = async (conn) => {
  const yearMonth = await conn.execute(
    `SELECT TO_CHAR(SYSDATE, 'YYYY') Y, TO_CHAR(SYSDATE, 'MM') M FROM DUAL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const { Y: year, M: month } = yearMonth.rows[0];
  const prefix = `GRN-${year}-${month}-`;

  const seqResult = await conn.execute(
    `SELECT MAX(TO_NUMBER(SUBSTR(GRN_NO, -4))) V_NO
       FROM INVENTORY_H
      WHERE GRN_NO LIKE :prefix || '%'`,
    { prefix },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const lastNo = Number(seqResult.rows[0]?.V_NO || 0);
  const nextNo = String(lastNo + 1).padStart(4, '0');

  return `${prefix}${nextNo}`;
};

export const getNextGrnNo = async () => {
  const conn = await getConnection();
  try {
    return await generateGrnNo(conn);
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// Helper: generate PO_NO — format: PO-YYYY-MM-XXXX
// ═══════════════════════════════════════════════════════════════
const generatePoNo = async (conn) => {
  const yearMonth = await conn.execute(
    `SELECT TO_CHAR(SYSDATE, 'YYYY') Y, TO_CHAR(SYSDATE, 'MM') M FROM DUAL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const { Y: year, M: month } = yearMonth.rows[0];
  const prefix = `PO-${year}-${month}-`;

  const seqResult = await conn.execute(
    `SELECT MAX(TO_NUMBER(SUBSTR(PO_NO, -4))) V_NO
       FROM INVENTORY_H
      WHERE PO_NO LIKE :prefix || '%'`,
    { prefix },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const lastNo = Number(seqResult.rows[0]?.V_NO || 0);
  const nextNo = String(lastNo + 1).padStart(4, '0');

  return `${prefix}${nextNo}`;
};

export const getNextPoNo = async () => {
  const conn = await getConnection();
  try {
    return await generatePoNo(conn);
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// Helper: generate INVOICE_NUMBER — format: INV-YYYY-MM-XXXX
// Sequence proti mash e 0001 theke abar shuru hoy
// ═══════════════════════════════════════════════════════════════
const generateInvoiceNumber = async (conn) => {
  const yearMonth = await conn.execute(
    `SELECT TO_CHAR(SYSDATE, 'YYYY') Y, TO_CHAR(SYSDATE, 'MM') M FROM DUAL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const { Y: year, M: month } = yearMonth.rows[0];
  const prefix = `${year}-${month}-`;

  const seqResult = await conn.execute(
    `SELECT MAX(TO_NUMBER(SUBSTR(INVOICE_NUMBER, -4))) V_NO
       FROM INVENTORY_H
      WHERE INVOICE_NUMBER LIKE :prefix || '%'`,
    { prefix },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const lastNo = Number(seqResult.rows[0]?.V_NO || 0);
  const nextNo = String(lastNo + 1).padStart(4, '0');

  return `${prefix}${nextNo}`;
};

export const getNextInvoiceNumber = async () => {
  const conn = await getConnection();
  try {
    return await generateInvoiceNumber(conn);
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// CREATE — header + multiple line items, single transaction
// data = { invDate, storeId, poNo, grnNo?, invoiceNumber?, supplierId?, creationBy?, items: [...] }
// ═══════════════════════════════════════════════════════════════
export const createInventory = async (data) => {
  const conn = await getConnection();
  try {
    const grnNo = data.grnNo || await generateGrnNo(conn);
    const poNo  = data.poNo  || await generatePoNo(conn);
    const invoiceNumber = data.invoiceNumber || await generateInvoiceNumber(conn);

    // 1) HEADER INSERT
    const hSql = `
      INSERT INTO INVENTORY_H (
        INV_DATE, STORE_ID, GRN_NO, PO_NO, CREATION_BY, INVOICE_NUMBER, SUPPLIER_ID
      ) VALUES (
        :invDate, :storeId, :grnNo, :poNo, :creationBy, :invoiceNumber, :supplierId
      )
      RETURNING ID INTO :outId
    `;
    const hBinds = {
      invDate:       data.invDate ? new Date(data.invDate) : new Date(),
      storeId:       data.storeId,
      grnNo,
      poNo,
      creationBy:    data.creationBy ?? null,
      invoiceNumber,
      supplierId:    data.supplierId ?? null,
      outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    };
    const hResult = await conn.execute(hSql, hBinds, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
    const hid = hResult.outBinds.outId[0];

    // 2) LINE ITEMS INSERT
    const items = data.items || [];
    const lineSql = `
      INSERT INTO INVENTORIES (
        HID, INVQTY, ITEM, PRICE, INVTDATE, INVSTATUS, INVOICE_STATUS,
        ITEMTYPE, ACCOUNTED, UNIT, UNIT_PRICE, UNIT_ID,
        SELLING_UNIT_PRICE, INVENTORY_TYPE, RECEIVE_QTY
      ) VALUES (
        :hid, :invQty, :item, :price, :invtDate, :invStatus, :invoiceStatus,
        :itemType, :accounted, :unit, :unitPrice, :unitId,
        :sellingUnitPrice, :inventoryType, :receiveQty
      )
    `;

    for (const it of items) {
      const lineBinds = {
        hid,
        invQty:           it.invQty           ?? null,
        item:             it.item,
        price:            it.price            ?? null,
        invtDate:         it.invtDate ? new Date(it.invtDate) : (data.invDate ? new Date(data.invDate) : new Date()),
        invStatus:        it.invStatus        ?? 1,
        invoiceStatus:    it.invoiceStatus    ?? 0,
        itemType:         it.itemType         ?? null,
        accounted:        it.accounted        ?? null,
        unit:             it.unit             ?? null,
        unitPrice:        it.unitPrice != null ? String(it.unitPrice) : null, // VARCHAR2 column
        unitId:           it.unitId           ?? null,
        sellingUnitPrice: it.sellingUnitPrice ?? null,
        inventoryType:    it.inventoryType    ?? null,
        receiveQty:       it.receiveQty       ?? null,
      };
      await conn.execute(lineSql, lineBinds, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
    }

    await conn.commit();
    return { hid, grnNo, poNo, invoiceNumber, itemCount: items.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE — header update + diff-based upsert of line items
// data = { invDate, storeId, poNo, grnNo, supplierId?, updateBy?, items: [{ tid?, ... }] }
// NOTE: INVOICE_NUMBER kokhono re-generate hoy na, PO_NO er moto e fixed thake
// ═══════════════════════════════════════════════════════════════
export const updateInventory = async (hid, data) => {
  const conn = await getConnection();
  try {
    // 1) HEADER UPDATE
    const hSql = `
      UPDATE INVENTORY_H SET
        INV_DATE     = :invDate,
        STORE_ID     = :storeId,
        GRN_NO       = :grnNo,
        PO_NO        = :poNo,
        SUPPLIER_ID  = :supplierId,
        UPDATE_BY    = :updateBy,
        UPDATED_DATE = SYSDATE
      WHERE ID = :hid
    `;
    await conn.execute(hSql, {
      hid,
      invDate:    data.invDate ? new Date(data.invDate) : null,
      storeId:    data.storeId,
      grnNo:      data.grnNo || null,
      poNo:       data.poNo  || null,
      supplierId: data.supplierId ?? null,
      updateBy:   data.updateBy ?? null,
    }, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });

    const items = data.items || [];

    // 2) EXISTING TIDs
    const existingResult = await conn.execute(
      `SELECT TID FROM INVENTORIES WHERE HID = :hid`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const existingTids = existingResult.rows.map(r => r.TID);
    const incomingTids  = items.filter(it => it.tid).map(it => Number(it.tid));

    // 3) DELETE — payload e r nai emon lines
    const toDelete = existingTids.filter(tid => !incomingTids.includes(tid));
    for (const tid of toDelete) {
      await conn.execute(`DELETE FROM INVENTORIES WHERE TID = :tid`, { tid }, { autoCommit: false });
    }

    // 4) UPDATE / INSERT
    const updateSql = `
      UPDATE INVENTORIES SET
        INVQTY             = :invQty,
        ITEM               = :item,
        PRICE              = :price,
        INVTDATE           = :invtDate,
        INVSTATUS          = :invStatus,
        INVOICE_STATUS     = :invoiceStatus,
        ITEMTYPE           = :itemType,
        ACCOUNTED          = :accounted,
        UNIT               = :unit,
        UNIT_PRICE         = :unitPrice,
        UNIT_ID            = :unitId,
        SELLING_UNIT_PRICE = :sellingUnitPrice,
        INVENTORY_TYPE     = :inventoryType,
        RECEIVE_QTY        = :receiveQty,
        UPDATE_DATE        = SYSDATE
      WHERE TID = :tid
    `;
    const insertSql = `
      INSERT INTO INVENTORIES (
        HID, INVQTY, ITEM, PRICE, INVTDATE, INVSTATUS, INVOICE_STATUS,
        ITEMTYPE, ACCOUNTED, UNIT, UNIT_PRICE, UNIT_ID,
        SELLING_UNIT_PRICE, INVENTORY_TYPE, RECEIVE_QTY
      ) VALUES (
        :hid, :invQty, :item, :price, :invtDate, :invStatus, :invoiceStatus,
        :itemType, :accounted, :unit, :unitPrice, :unitId,
        :sellingUnitPrice, :inventoryType, :receiveQty
      )
    `;

    for (const it of items) {
      const lineBinds = {
        invQty:           it.invQty           ?? null,
        item:             it.item,
        price:            it.price            ?? null,
        invtDate:         it.invtDate ? new Date(it.invtDate) : new Date(),
        invStatus:        it.invStatus        ?? 1,
        invoiceStatus:    it.invoiceStatus    ?? 0,
        itemType:         it.itemType         ?? null,
        accounted:        it.accounted        ?? null,
        unit:             it.unit             ?? null,
        unitPrice:        it.unitPrice != null ? String(it.unitPrice) : null,
        unitId:           it.unitId           ?? null,
        sellingUnitPrice: it.sellingUnitPrice ?? null,
        inventoryType:    it.inventoryType    ?? null,
        receiveQty:       it.receiveQty       ?? null,
      };

      if (it.tid) {
        await conn.execute(updateSql, { ...lineBinds, tid: Number(it.tid) }, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
      } else {
        await conn.execute(insertSql, { ...lineBinds, hid }, { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT });
      }
    }

    await conn.commit();
    return { rowsAffected: items.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// LIST — header level, joined with store, aggregated item count/qty
// ═══════════════════════════════════════════════════════════════
export const getAllInventories = async ({ page = 1, limit = 20 } = {}) => {
  const conn = await getConnection();
  try {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT *
      FROM (
        SELECT g.*, ROWNUM AS RN
        FROM (
          SELECT
            h.ID              AS HID,
            h.INV_DATE,
            h.STORE_ID,
            h.GRN_NO,
            h.PO_NO,
            h.INVOICE_NUMBER,
            h.SUPPLIER_ID,
            h.CREATION_DATE,
            h.UPDATED_DATE,
            st.STORE_NAME,
            st.LOCATION       AS STORE_LOCATION,
            COUNT(inv.TID)    AS ITEM_COUNT,
            SUM(inv.INVQTY)   AS TOTAL_QTY
          FROM INVENTORY_H h
          LEFT JOIN INVENTORIES inv ON inv.HID = h.ID
          LEFT JOIN STORES st       ON h.STORE_ID = st.STORE_ID
          GROUP BY h.ID, h.INV_DATE, h.STORE_ID, h.GRN_NO, h.PO_NO,
                   h.INVOICE_NUMBER, h.SUPPLIER_ID,
                   h.CREATION_DATE, h.UPDATED_DATE, st.STORE_NAME, st.LOCATION
          ORDER BY h.ID DESC
        ) g
      )
      WHERE RN > :offset AND RN <= :endRow
    `;
    const result = await conn.execute(sql, { offset, endRow: offset + limit }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE — header + full line items array (with item/uom/stock joins)
// ═══════════════════════════════════════════════════════════════
export const getInventoryById = async (hid) => {
  const conn = await getConnection();
  try {
    const hSql = `
      SELECT h.ID AS HID, h.INV_DATE, h.STORE_ID, h.GRN_NO, h.PO_NO,
             h.INVOICE_NUMBER, h.SUPPLIER_ID,
             h.CREATION_DATE, h.CREATION_BY, h.UPDATED_DATE, h.UPDATE_BY,
             st.STORE_NAME, st.LOCATION AS STORE_LOCATION
      FROM INVENTORY_H h
      LEFT JOIN STORES st ON h.STORE_ID = st.STORE_ID
      WHERE h.ID = :hid
    `;
    const hResult = await conn.execute(hSql, { hid }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const header = hResult.rows[0];
    if (!header) return null;

    const lineSql = `
      SELECT
        inv.TID, inv.INVQTY, inv.ITEM AS INV_ITEM_ID, inv.PRICE AS INV_PRICE,
        inv.INVTDATE, inv.INVSTATUS, inv.INVOICE_STATUS, inv.ITEMTYPE, inv.ACCOUNTED,
        inv.UNIT AS INV_UNIT, inv.UNIT_PRICE, inv.UNIT_ID AS INV_UNIT_ID,
        inv.SELLING_UNIT_PRICE, inv.INVENTORY_TYPE, inv.RECEIVE_QTY,
        inv.ENTRY_DATE, inv.UPDATE_DATE,
        uom.NAME AS UOM_NAME,
        ist.STOCK_QTY, ist.MINIMUM_LEVEL, ist.STATUS AS STOCK_STATUS,
        ist.PRICE AS STOCK_PRICE, ist.LAST_PRICE, ist.UOM, ist.BOOKED,
        itm.ITEM_ID, itm.NAME AS ITEM_NAME, itm.DESCRIPTION AS ITEM_DESCRIPTION,
        itm.MODEL, itm.BRAND_ID, itm.SIZE_ID, itm.ORIGIN_ID, itm.CATEGORY_ID,
        itm.TYPE_ID, itm.COLOR_ID, itm.SUBCAT_ID, itm.STATUS AS ITEM_STATUS, itm.UNIT AS ITEM_UNIT
      FROM INVENTORIES inv
      LEFT JOIN ITEM itm       ON inv.ITEM = itm.ITEM_ID
      LEFT JOIN ITEM_STOCK ist ON inv.ITEM = ist.ITEM_ID AND ist.STORE_ID = :storeId
      LEFT JOIN INV_UOM uom   ON inv.UNIT_ID = uom.ID
      WHERE inv.HID = :hid
      ORDER BY inv.TID
    `;
    const lineResult = await conn.execute(lineSql, { hid, storeId: header.STORE_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return { ...header, items: lineResult.rows };
  } finally {
    await conn.close();
  }
};

// ═══════════════════════════════════════════════════════════════
// DELETE — protected: approved (INVSTATUS=2) line thakle delete allow na
// ═══════════════════════════════════════════════════════════════
export const deleteInventory = async (hid) => {
  const conn = await getConnection();
  try {
    const check = await conn.execute(
      `SELECT COUNT(*) CNT FROM INVENTORIES WHERE HID = :hid AND INVSTATUS = 2`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (check.rows[0].CNT > 0) {
      throw new Error('Approved item(s) ache, delete kora jabe na.');
    }

    await conn.execute(`DELETE FROM INVENTORIES WHERE HID = :hid`, { hid }, { autoCommit: false });
    const result = await conn.execute(`DELETE FROM INVENTORY_H WHERE ID = :hid`, { hid }, { autoCommit: false });
    await conn.commit();
    return { rowsAffected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};