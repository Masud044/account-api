import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// service.js
export async function createCustomer(data) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO CUSTOMER_INFO (
        CUSTOMER_NAME, ENTRY_BY, PASSWORD, ORG_ID, ADDRESS, CONTACT_PERSON,
        PHONE, EMAIL, MOBILE, DUE, REMARKS, FAX
      ) VALUES (
        :CUSTOMER_NAME, :ENTRY_BY, :PASSWORD, :ORG_ID, :ADDRESS, :CONTACT_PERSON,
        :PHONE, :EMAIL, :MOBILE, :DUE, :REMARKS, :FAX
      )`,
      {
        CUSTOMER_NAME:  data.CUSTOMER_NAME,
        ENTRY_BY:       data.ENTRY_BY  ?? null,
        PASSWORD:       data.PASSWORD  ?? null,
        ORG_ID:         data.ORG_ID    ?? null,
        ADDRESS:        data.ADDRESS   ?? null,
        CONTACT_PERSON: data.CONTACT_PERSON ?? null,
        PHONE:          data.PHONE     ?? null,
        EMAIL:          data.EMAIL     ?? null,
        MOBILE:         data.MOBILE    ?? null,
        DUE:            data.DUE       ?? null,
        REMARKS:        data.REMARKS   ?? null,
        FAX:            data.FAX       ?? null,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}

export async function getCustomers(customerId) {
  const connection = await getConnection();
  try {
    const sql = customerId
      ? "SELECT * FROM CUSTOMER_INFO WHERE CUSTOMER_ID = :id"
      : "SELECT * FROM CUSTOMER_INFO ORDER BY CUSTOMER_ID";
    const result = await connection.execute(sql, customerId ? { id: Number(customerId) } : {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// export async function updateCustomer(data) {
//   const connection = await getConnection();
//   try {
//     const set = [];
//     const binds = { customer_id_bv: data.CUSTOMER_ID };
//     for (const [key, value] of Object.entries(data)) {
//       const upper = key.toUpperCase();
//       if (upper !== "CUSTOMER_ID" && value !== null) {
//         const placeholder = `${key.toLowerCase()}_bv`;
//         set.push(`${upper} = :${placeholder}`);
//         binds[placeholder] = value;
//       }
//     }
//     set.push("UPDATE_DATE = SYSDATE");
//     const sql = `UPDATE CUSTOMER_INFO SET ${set.join(", ")} WHERE CUSTOMER_ID = :customer_id_bv`;
//     const result = await connection.execute(sql, binds, { autoCommit: true });
//     return result.rowsAffected;
//   } finally {
//     await connection.close();
//   }
// }

export async function updateCustomer(data) {
  const connection = await getConnection();
  try {
    const set = [];
    const binds = { customer_id_bv: data.CUSTOMER_ID };
    for (const [key, value] of Object.entries(data)) {
      const upper = key.toUpperCase();
      if (upper !== "CUSTOMER_ID" && upper !== "UPDATE_BY" && value !== null) {
        const placeholder = `${key.toLowerCase()}_bv`;
        set.push(`${upper} = :${placeholder}`);
        binds[placeholder] = value;
      }
    }
    set.push("UPDATE_BY = :update_by_bv");
    binds.update_by_bv = data.UPDATE_BY ?? null;

    set.push("UPDATE_DATE = SYSDATE");

    const sql = `UPDATE CUSTOMER_INFO SET ${set.join(", ")} WHERE CUSTOMER_ID = :customer_id_bv`;
    const result = await connection.execute(sql, binds, { autoCommit: true });
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}

export async function deleteCustomer(customerId) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM CUSTOMER_INFO WHERE CUSTOMER_ID = :customer_id_bv",
      { customer_id_bv: Number(customerId) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}
