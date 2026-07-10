import "dotenv/config";
import express from "express";
import cors from "cors";

import receiptRoutes from "./modules/receipt/routes.js";
import paymentRoutes from "./modules/payment/routes.js";
import commonRoutes from "./modules/common/routes.js";
import cashAllUnpostedRoutes from "./modules/cash_all_unposted/routes.js";
import cashFlowAddRoutes from "./modules/CashFlowAdd/routes.js";
import caseFlowAccountCodeRoutes from "./modules/case_flow_account_code/routes.js";
import calenderApiRoutes from "./modules/calender_api/routes.js";
import bwalUpdateGlRoutes from "./modules/bwal_update_gl/routes.js";
import bwalInsertGlRoutes from "./modules/bwal_insert_gl/routes.js";
import bwalConnRoutes from "./modules/bwal_conn/routes.js";
import autocompleteRoutes from "./modules/autocomplete/routes.js";
import adminUserRoutes from "./modules/admin_user/routes.js";
import addReceiveRoutes from "./modules/addReceive/routes.js";
import activeVoucherRoutes from "./modules/active_voucher/routes.js";
import accountCodeRoutes from "./modules/account_code/routes.js";



import dashboardCashRoutes       from "./modules/dashboard_cash/dashboard_cash.route.js";
import dashboardExpenseRoutes    from "./modules/dashboard_expense/dashboard_expense.route.js";
import dashboardIncomeRoutes     from "./modules/dashboard_income/dashboard_income.route.js";
import glAccountCodeRoutes       from "./modules/gl_account_code/gl_account_code.route.js";
import glAddRoutes               from "./modules/gl_add/gl_add.route.js";
import glAllUnpostedRoutes       from "./modules/gl_all_unposted/gl_all_unposted.route.js";
import glEditRoutes              from "./modules/gl_edit/gl_edit.route.js";
import glViewRoutes              from "./modules/gl_view/gl_view.route.js";
import infoListRoutes            from "./modules/info_list/info_list.route.js";
import payAllUnpostedRoutes      from "./modules/pay_all_unposted/pay_all_unposted.route.js";
import recAccountCodeRoutes      from "./modules/rec_account_code/rec_account_code.route.js";
import receiveAllUnpostedRoutes  from "./modules/receive_all_unposted/receive_all_unposted.route.js";
import receiveCodeRoutes         from "./modules/receive_code/receive_code.route.js";
import receiveViewRoutes         from "./modules/receive_view/receive_view.route.js";

import customerRoutes from "./modules/customer-type/customer.route.js";
import supplierRoutes from "./modules/supplier-type/supplier.route.js";
import voucherDownloadRoute from "./modules/payment-report/route.js";
import receiptDownloadRoute from "./modules/receive-report/route.js";

import journalDownloadRoute from "./modules/gl-report/route.js";
import cashDownloadRoute from "./modules/cash-report/route.js";

// inventory route

import inventoriesRoutes     from './modules/inventory/inventory.route.js';
import itemRoutes     from './modules/item/item.route.js';
import itemStockRoutes     from './modules/item-stock/item-stock.route.js';
import storeRoutes     from './modules/store/store.route.js';
import uomRoutes from "./modules/inv_uom/inv-uom.route.js";
import invTypeRouter from './modules/inv-type/route.js';
import requisitionRoutes from "./modules/requisition-master/requisition-master.routes.js";


import chartOfAccountRoutes from "./modules/chart-account/route.js";

import authV2Route from "./modules/auth-v2/auth-v2.routes.js";
import userManagementRoutes from "./modules/user-management/user-management.routes.js";
import empImageRoutes from "./modules/employee-image/employee-image.routes.js";

import customerInfoRoutes from "./modules/customer/route.js";
import supplierInfoRoutes from "./modules/supplier/route.js";

import gldocRouter from "./modules/gl-doc/route.js";
import saleExpenseReportRoute from "./modules/sale-expense-report/route.js";



import eggProductionRoutes from "./modules/egg-production/route.js";
import salInvoiceRouter from "./modules/sale-invoice/route.js";

import purchaserRoutes from "./modules/purchaser-recognition/route.js"


import chickenProjectRoutes from './modules/chicken-project/route.js';
import cowProjectRoutes     from './modules/cow-project/route.js';
import fishProjectRoutes    from './modules/fish-project/route.js';
import farmDashboardRoutes from './modules/dashboard-farm/route.js';










const app = express();

app.use(express.json());

// app.use(cors({
//   origin: [
//     "http://localhost:5173",
//     "http://192.168.1.137:5175"
//   ],
//   credentials: true,
// }));

app.use(cors({
  origin: "*"
}));


app.use("/api/receipt", receiptRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/common", commonRoutes);
app.use("/api/cash-all-unposted", cashAllUnpostedRoutes);
app.use("/api/cash-flow-add", cashFlowAddRoutes);
app.use("/api/case-flow-account-code", caseFlowAccountCodeRoutes);
app.use("/api/calender-api", calenderApiRoutes);
app.use("/api/bwal-update-gl", bwalUpdateGlRoutes);
app.use("/api/bwal-insert-gl", bwalInsertGlRoutes);
app.use("/api/bwal-conn", bwalConnRoutes);
app.use("/api/autocomplete", autocompleteRoutes);
app.use("/api/admin-user", adminUserRoutes);
app.use("/api/add-receive", addReceiveRoutes);
app.use("/api/active-voucher", activeVoucherRoutes);
app.use("/api/account-code", accountCodeRoutes);

app.use("/api/dashboard-cash",          dashboardCashRoutes);      // GET  /api/dashboard/cash?month=&year=
app.use("/api/dashboard-expense",       dashboardExpenseRoutes);   // GET  /api/dashboard/expense?month=&year=
app.use("/api/dashboard-income",        dashboardIncomeRoutes);    // GET  /api/dashboard/income?month=&year=
 
// GL — specific paths must come BEFORE the catch-all /api/gl routes
app.use("/api/gl-account-code",         glAccountCodeRoutes);      // GET  /api/gl/account-code
app.use("/api/gl-all-unposted",         glAllUnpostedRoutes);      // GET  /api/gl/all-unposted
app.use("/api/gl-view",                 glViewRoutes);             // GET  /api/gl/view/:id
app.use("/api/gl-edit",                 glEditRoutes);             // PUT  /api/gl/edit
app.use("/api/gl-add",                      glAddRoutes);              // POST /api/gl
 
// Info list
app.use("/api/info-list",               infoListRoutes);           // GET  /api/info-list
 
// Payment
app.use("/api/payment-all-unposted",    payAllUnpostedRoutes);     // GET  /api/payment/all-unposted
 
// Receive — specific paths must come BEFORE the catch-all /api/receive/:id route
app.use("/api/receive-account-code",    recAccountCodeRoutes);     // GET  /api/receive/account-code
app.use("/api/receive-all-unposted",    receiveAllUnpostedRoutes); // GET  /api/receive/all-unposted
app.use("/api/receive-code",            receiveCodeRoutes);        // GET  /api/receive/code
app.use("/api/receive-view",                 receiveViewRoutes);        // GET  /api/receive/:id

app.use("/api/customer-type", customerRoutes);   // GET /api/customer
app.use("/api/supplier-type", supplierRoutes);   // GET /api/supplier

// report route

app.use("/api/voucher", voucherDownloadRoute);
app.use("/api/receipt", receiptDownloadRoute);
app.use("/api/journal", journalDownloadRoute);
app.use("/api/cash-transfer", cashDownloadRoute);

// inventory route

app.use("/api/inventory",  inventoriesRoutes);
app.use("/api/item",  itemRoutes);
app.use("/api/item-stock",  itemStockRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/inv-uom", uomRoutes);
app.use('/api/inv-type', invTypeRouter);

app.use("/api/requisitions", requisitionRoutes);
app.use("/api/chart-account", chartOfAccountRoutes);

app.use("/api/emp-images", empImageRoutes);

app.use("/api/supplier", supplierInfoRoutes);
app.use("/api/customer", customerInfoRoutes);


app.use("/api/gldoc", gldocRouter);
app.use("/api/egg-production", eggProductionRoutes);

app.use('/api/sal-invoice', salInvoiceRouter);
app.use('/api/purchase-recognition', purchaserRoutes);



app.use('/api/chicken-project', chickenProjectRoutes);
app.use('/api/cow-project',     cowProjectRoutes);
app.use('/api/fish-project',    fishProjectRoutes);
app.use('/api/farm-dashboard', farmDashboardRoutes);



app.use("/api/users", userManagementRoutes);

app.use("/api/v2/auth", authV2Route);

//account report

app.use("/api/report", saleExpenseReportRoute);

app.get("/", async (_req, res) => {
  res.send("Server running");
});

app.get("/health", async (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
