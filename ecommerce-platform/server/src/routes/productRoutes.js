const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getProducts);
router.get('/suggestions', productController.getSearchSuggestions);
router.get('/:slug/related', productController.getRelatedProducts);
router.get('/:slug/frequently-bought-together', productController.getFrequentlyBoughtTogether);
router.get('/:slug', productController.getProductBySlug);

module.exports = router;
