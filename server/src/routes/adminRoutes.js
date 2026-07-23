const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac'); 
const { validate } = require('../middleware/validate');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { productCreateSchema, productUpdateSchema, uploadDeleteSchema } = require('../validators/adminValidators');

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
router.get('/analytics/sales', analyticsController.getSalesAnalytics);
router.get('/analytics/revenue', analyticsController.getRevenueAnalytics);
router.get('/analytics/customers', analyticsController.getCustomerAnalytics);

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
router.get('/returns', adminController.getAllReturns);
router.patch('/returns/:id', adminController.updateReturnRequest);

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