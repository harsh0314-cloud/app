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
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac'); 
const { validate } = require('../middleware/validate');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { productCreateSchema, productUpdateSchema, uploadDeleteSchema, emailTemplateUpdateSchema, emailTemplateTestSchema } = require('../validators/adminValidators');

// Sensitive endpoint limiter (test emails can hit the provider)
const testEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many test emails — please try again later.' },
});

// User MUST be logged in AND must have the 'ADMIN' role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN')); 

// --- STATS ---
router.get('/stats', adminController.getDashboardStats);

// --- IMAGE UPLOAD (Cloudinary) ---
router.post('/upload', handleUploadErrors(upload.array('images', 8)), uploadController.uploadImages);
router.delete('/upload', validate(uploadDeleteSchema), uploadController.deleteImage);

// --- PRODUCTS ---
router.post('/products', validate(productCreateSchema), adminController.createProduct);
router.patch('/products/:id', validate(productUpdateSchema), adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

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
router.get('/customers', adminController.getAllCustomers);

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