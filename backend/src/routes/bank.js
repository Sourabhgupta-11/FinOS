const express = require("express");
const multer = require("multer");
const router = express.Router();
const ctrl = require("../controllers/bankController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Accounts
router.get("/accounts", ctrl.getAccounts);
router.post("/accounts", ctrl.addAccount);
router.put("/accounts/:id", ctrl.updateAccount);
router.delete("/accounts/:id", ctrl.deleteAccount);

// Setu AA
router.post("/setu/consent", ctrl.initiateSetuConsent);
router.post("/setu/callback", ctrl.setuCallback);

// Transactions
router.get("/transactions", ctrl.getTransactions);
router.post("/transactions", ctrl.addTransaction);
router.put("/transactions/:id", ctrl.updateTransaction);
router.delete("/transactions/:id", ctrl.deleteTransaction);
router.post("/transactions/import", upload.single("file"), ctrl.importCSV);

// AI Category Suggestions
router.get("/categories/suggestions", ctrl.getCategorySuggestions);

// Analytics & budgets
router.get("/analytics", ctrl.getAnalytics);
router.get("/budgets", ctrl.getBudgets);
router.post("/budgets", ctrl.upsertBudget);
router.delete("/budgets/:id", ctrl.deleteBudget);
router.get("/categories", ctrl.getCategories);

module.exports = router;
