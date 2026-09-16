const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', brandController.getBrands);
router.post('/', brandController.createBrand);

module.exports = router;
