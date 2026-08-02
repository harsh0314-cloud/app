const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const emailTemplateController = require('../controllers/emailTemplateController');
const uploadController = require('../controllers/uploadController');
const returnController = require('../controllers/returnController');
const newsletterController = require('../controllers/newsletterController');
const newsletterCampaignController = require('../controllers/newsletterCampaignController');
const contactController = require('../controllers/contactController');
const careersController = require('../controllers/careersController');
const auditLogController = require('../controllers/auditLogController');
const userMgmtController = require('../controllers/userManagementController');
const importExportController = require('../controllers/importExportController');
const adminLoyaltyController = require('../controllers/adminLoyaltyController');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { authorize, requireStaff, requirePermission } = require('../middleware/rbac');
const { PERMISSIONS: P } = require('../utils/permissions');
const { validate } = require('../middleware/validate');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { productCreateSchema, productUpdateSchema, uploadDeleteSchema, emailTemplateUpdateSchema, emailTemplateTestSchema } = require('../validators/adminValidators');

// In-memory multer for CSV/XLSX imports (small files, no need for disk)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Sensitive endpoint limiter (test emails can hit the provider)
const testEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many test emails — please try again later.' },
});

// User MUST be logged in AND have any staff role. Fine-grained permission
// checks are applied per-route below (backward-compat with legacy `authorize`).
router.use(authenticate);
router.use(requireStaff);

// --- STATS ---
router.get('/stats', adminController.getDashboardStats);

// --- IMAGE UPLOAD (Cloudinary) ---
router.post('/upload', handleUploadErrors(upload.array('images', 8)), uploadController.uploadImages);
router.delete('/upload', validate(uploadDeleteSchema), uploadController.deleteImage);

// --- PRODUCTS ---
router.post('/products', requirePermission(P.PRODUCT_CREATE), validate(productCreateSchema), adminController.createProduct);
router.patch('/products/:id', requirePermission(P.PRODUCT_UPDATE), validate(productUpdateSchema), adminController.updateProduct);
router.delete('/products/:id', requirePermission(P.PRODUCT_DELETE), adminController.deleteProduct);

// --- IMPORT / EXPORT ---
router.get('/export/products',             requirePermission(P.EXPORT), importExportController.exportProducts);
router.get('/import/products/template',    requirePermission(P.IMPORT), importExportController.getProductTemplate);
router.get('/import/products/errors',      requirePermission(P.IMPORT), importExportController.downloadErrorReport);
router.post('/import/products/preview',    requirePermission(P.IMPORT), importUpload.single('file'), importExportController.previewProductImport);
router.post('/import/products',            requirePermission(P.IMPORT), importUpload.single('file'), importExportController.importProducts);

// --- ANALYTICS ---
router.get('/analytics/dashboard', analyticsController.getDashboardAnalytics);
router.get('/analytics/sales', analyticsController.getSalesAnalytics);
router.get('/analytics/revenue', analyticsController.getRevenueAnalytics);
router.get('/analytics/customers', analyticsController.getCustomerAnalytics);

// --- EMAIL TEMPLATES ---
router.get('/email-templates', emailTemplateController.listTemplates);
router.get('/email-templates/:key', emailTemplateController.getTemplate);
router.put('/email-templates/:key', validate(emailTemplateUpdateSchema), emailTemplateController.updateTemplate);
router.post('/email-templates/:key/publish', emailTemplateController.publishTemplate);
router.post('/email-templates/:key/reset', emailTemplateController.resetTemplate);
router.get('/email-templates/:key/versions', emailTemplateController.listVersions);
router.post('/email-templates/:key/versions/:versionId/restore', emailTemplateController.restoreVersion);
router.post('/email-templates/:key/test', testEmailLimiter, validate(emailTemplateTestSchema), emailTemplateController.sendTestEmail);

// --- INVENTORY ---
router.get('/inventory', adminController.getAllInventory);
router.get('/inventory/low-stock', analyticsController.getLowStockAlerts);
router.patch('/inventory/:id', adminController.updateInventory);
router.post('/inventory/bulk', adminController.bulkUpdateInventory);

// --- ORDERS ---
router.get('/orders', adminController.getAllOrders);
router.get('/orders/export', analyticsController.exportOrdersCsv);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// --- RETURNS / EXCHANGES ---
router.get('/returns/stats', returnController.adminStats);
router.get('/returns', returnController.adminListReturns);
router.get('/returns/:id', returnController.adminGetReturn);
router.patch('/returns/:id', returnController.adminUpdateReturn);

// --- NEWSLETTER SUBSCRIBERS ---
router.get('/newsletter/export', newsletterController.adminExportCSV);
router.get('/newsletter',        newsletterController.adminList);
router.delete('/newsletter/:id', newsletterController.adminDelete);

// --- NEWSLETTER CAMPAIGNS ---
router.get('/newsletter/campaigns',          newsletterCampaignController.listCampaigns);
router.post('/newsletter/campaigns',         newsletterCampaignController.createCampaign);
router.get('/newsletter/campaigns/:id',      newsletterCampaignController.getCampaign);
router.delete('/newsletter/campaigns/:id',   newsletterCampaignController.deleteCampaign);
router.post('/newsletter/campaigns/:id/test', newsletterCampaignController.sendTest);
router.post('/newsletter/campaigns/:id/send', newsletterCampaignController.sendCampaign);

// --- CONTACT MESSAGES ---
router.get('/contact',                contactController.adminList);
router.get('/contact/:id',            contactController.adminGet);
router.patch('/contact/:id',          contactController.adminUpdate);
router.post('/contact/:id/reply',     contactController.adminReply);
router.delete('/contact/:id',         contactController.adminDelete);

// --- CAREERS (Job Applications) ---
router.get('/careers',        careersController.adminList);
router.patch('/careers/:id',  careersController.adminUpdate);
router.delete('/careers/:id', careersController.adminDelete);

// --- CUSTOMERS ---
router.get('/customers', requirePermission(P.CUSTOMER_VIEW), adminController.getAllCustomers);

// --- USERS / TEAM (RBAC) ---
router.get('/users',                requirePermission(P.USER_VIEW),   userMgmtController.listUsers);
router.get('/users/roles',          requirePermission(P.USER_VIEW),   userMgmtController.getRolesMatrix);
router.post('/users',               requirePermission(P.USER_MANAGE), userMgmtController.createUser);
router.patch('/users/:id',          requirePermission(P.USER_MANAGE), userMgmtController.updateUser);
router.delete('/users/:id',         requirePermission(P.USER_MANAGE), userMgmtController.deleteUser);
router.post('/users/:id/reset-password', requirePermission(P.USER_MANAGE), userMgmtController.resetUserPassword);

// --- AUDIT LOGS ---
router.get('/audit-logs',           requirePermission(P.AUDIT_LOG_VIEW),   auditLogController.listAuditLogs);
router.get('/audit-logs/filters',   requirePermission(P.AUDIT_LOG_VIEW),   auditLogController.listAuditFilters);
router.get('/audit-logs/stats',     requirePermission(P.AUDIT_LOG_VIEW),   auditLogController.getAuditStats);
router.get('/audit-logs/export',    requirePermission(P.AUDIT_LOG_EXPORT), auditLogController.exportAuditLogs);
router.get('/audit-logs/:id',       requirePermission(P.AUDIT_LOG_VIEW),   auditLogController.getAuditLog);
router.patch('/audit-logs/:id',     requirePermission(P.AUDIT_LOG_VIEW),   auditLogController.updateAuditNotes);

// --- LOYALTY ---
router.get('/loyalty/stats',                    requirePermission(P.LOYALTY_VIEW),     adminLoyaltyController.getStats);
router.get('/loyalty/settings',                 requirePermission(P.LOYALTY_VIEW),     adminLoyaltyController.getSettings);
router.patch('/loyalty/settings',               requirePermission(P.LOYALTY_SETTINGS), adminLoyaltyController.updateSettings);
router.get('/loyalty/transactions',             requirePermission(P.LOYALTY_VIEW),     adminLoyaltyController.listTransactions);
router.get('/loyalty/wallets',                  requirePermission(P.LOYALTY_VIEW),     adminLoyaltyController.listWallets);
router.get('/loyalty/wallets/:userId',          requirePermission(P.LOYALTY_VIEW),     adminLoyaltyController.getWallet);
router.post('/loyalty/wallets/:userId/adjust',  requirePermission(P.LOYALTY_MANAGE),   adminLoyaltyController.adjustWallet);

// --- CATEGORIES & BRANDS ---
router.get('/categories', async (req, res) => {
   const data = await req.prisma.category.findMany();
   res.status(200).json({ status: 'success', data: { categories: data } });
});

router.get('/brands', async (req, res) => {
   const data = await req.prisma.brand.findMany();
   res.status(200).json({ status: 'success', data: { brands: data } });
});

module.exports = router;