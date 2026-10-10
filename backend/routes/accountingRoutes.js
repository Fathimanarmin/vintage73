const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accountingController');
const postingSetupController = require('../controllers/postingSetupController');
const accountingReportsController = require('../controllers/accountingReportsController');
const authMiddleware = require('../middleware/authMiddleware');
const checkFinancialYear = require('../middleware/checkFinancialYear');

router.use(authMiddleware);

// ==================== DASHBOARD ====================
router.get('/dashboard', accountingController.getDashboardStats);

// ==================== POSTING SETUP ====================
console.log('Registering Posting Setup Routes...');
router.get('/posting-setup/metadata', postingSetupController.getSchemaMetadata);
router.get('/posting-setup', postingSetupController.getAllPostings);
router.post('/posting-setup/bulk', postingSetupController.bulkUpsertPostings);
router.post('/posting-setup', postingSetupController.upsertPosting);
router.delete('/posting-setup/:id', postingSetupController.deletePosting);

// ==================== ACCOUNT GROUPS ====================
router.get('/groups', accountingController.getAccountGroups);
router.post('/groups', accountingController.createAccountGroup);

// ==================== LEDGERS ====================
router.get('/ledgers', accountingController.getLedgers);
router.post('/ledgers', accountingController.createLedger);
router.put('/ledgers/:id', accountingController.updateLedger);
router.delete('/ledgers/:id', accountingController.deleteLedger);

// ==================== VOUCHERS ====================
router.post('/vouchers/payment', checkFinancialYear, accountingController.createPaymentVoucher);
router.post('/vouchers/receipt', checkFinancialYear, accountingController.createReceiptVoucher);
router.post('/vouchers/journal', checkFinancialYear, accountingController.createJournalEntry);
router.post('/vouchers/contra', checkFinancialYear, accountingController.createContraEntry);
router.get('/vouchers', accountingController.getVouchers);
router.get('/vouchers/:id', accountingController.getVoucher);
router.put('/vouchers/:id', checkFinancialYear, accountingController.updateVoucher);
router.delete('/vouchers/:id', checkFinancialYear, accountingController.deleteVoucher);
router.post('/vouchers/:id/cancel', checkFinancialYear, accountingController.cancelVoucher);

// ==================== REPORTS ====================
router.get('/reports/trial-balance', accountingReportsController.getTrialBalance);
router.post('/bulk-post', accountingController.bulkPostTransactions);
router.get('/reports/profit-loss', accountingReportsController.getProfitLoss);
router.get('/reports/balance-sheet', accountingReportsController.getBalanceSheet);
router.get('/reports/ledger-statement', accountingReportsController.getLedgerStatement);
router.get('/reports/cash-book', accountingReportsController.getCashBook);
router.get('/reports/day-book', accountingReportsController.getDayBook);

module.exports = router;
