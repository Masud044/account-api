// import {
//   getExpenseReport,
//   getIncomeReport,
// } from './service.js';

// export const fetchExpenseReport = async (req, res) => {
//   try {
//     const { fromDate, toDate } = req.query;

//     if (!fromDate || !toDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'fromDate এবং toDate দুটোই দিতে হবে (YYYY-MM-DD)',
//       });
//     }

//     const data = await getExpenseReport(fromDate, toDate);

//     return res.status(200).json({
//       success: true,
//       data,
//     });
//   } catch (error) {
//     console.error('Error fetching expense report:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Expense report আনতে সমস্যা হয়েছে',
//       error: error.message,
//     });
//   }
// };

// export const fetchIncomeReport = async (req, res) => {
//   try {
//     const { fromDate, toDate } = req.query;

//     if (!fromDate || !toDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'fromDate এবং toDate দুটোই দিতে হবে (YYYY-MM-DD)',
//       });
//     }

//     const data = await getIncomeReport(fromDate, toDate);

//     return res.status(200).json({
//       success: true,
//       data,
//     });
//   } catch (error) {
//     console.error('Error fetching income report:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Income report আনতে সমস্যা হয়েছে',
//       error: error.message,
//     });
//   }
// };


import {
  getExpenseReport,
  getIncomeReport,
} from './service.js';

export const fetchExpenseReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const data = await getExpenseReport(fromDate, toDate);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching expense report:', error);
    return res.status(500).json({
      success: false,
      message: 'Expense report ',
      error: error.message,
    });
  }
};

export const fetchIncomeReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const data = await getIncomeReport(fromDate, toDate);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching income report:', error);
    return res.status(500).json({
      success: false,
      message: 'Income report আনতে সমস্যা হয়েছে',
      error: error.message,
    });
  }
};