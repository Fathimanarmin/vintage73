const express = require('express');
const router = express.Router();
const barcodeTemplateController = require('../controllers/barcodeTemplateController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', barcodeTemplateController.getAllTemplates);
router.get('/:id', barcodeTemplateController.getTemplateById);
router.post('/', barcodeTemplateController.createTemplate);
router.post('/print-zpl', barcodeTemplateController.printZpl);
router.post('/render-preview', barcodeTemplateController.renderPreview);
router.put('/:id', barcodeTemplateController.updateTemplate);
router.delete('/:id', barcodeTemplateController.deleteTemplate);

module.exports = router;
