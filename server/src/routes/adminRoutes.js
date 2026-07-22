const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac'); 

// User MUST be logged in AND must have the 'ADMIN' role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN')); 

// --- STATS ---
router.get('/stats', adminController.getDashboardStats);

// --- PRODUCTS ---
router.post('/products', adminController.createProduct);
router.patch('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// --- INVENTORY ---
router.get('/inventory', adminController.getAllInventory);
router.patch('/inventory/:id', adminController.updateInventory);
router.post('/inventory/bulk', adminController.bulkUpdateInventory);

// --- ORDERS ---
router.get('/orders', adminController.getAllOrders);
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