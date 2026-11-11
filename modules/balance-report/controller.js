// import { getBalanceSheet } from "./service.js";

// export const balanceSheet = async (req, res) => {
//   try {
//     const data = await getBalanceSheet({ asOn: req.query.asOn });
//     return res.json({ success: true, data });
//   } catch (error) {
//     const status = error.statusCode || 500;
//     if (status === 500) console.error("Failed to generate balance sheet", error);
//     return res.status(status).json({
//       success: false,
//       message:
//         status === 500 ? "Failed to generate balance sheet" : error.message,
//     });
//   }
// };

import { getBalanceSheet } from "./service.js";

export const balanceSheet = async (req, res) => {
  try {
    const data = await getBalanceSheet({
      from: req.query.from,
      to: req.query.to,
    });
    return res.json({ success: true, data });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error("Failed to generate balance sheet", error);
    return res.status(status).json({
      success: false,
      message:
        status === 500 ? "Failed to generate balance sheet" : error.message,
    });
  }
};