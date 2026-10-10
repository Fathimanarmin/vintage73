const express = require('express');
const router = express.Router();
const {
  getDayCloseStatus,
  confirmDayClose,
  checkUnclosed,
  getDayCloseHistory
} = require('../controllers/dayCloseController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/status', getDayCloseStatus);
router.get('/summary', getDayCloseStatus); // Alias for backwards compatibility
router.post('/confirm', confirmDayClose);
router.get('/check-unclosed', checkUnclosed);
router.get('/history', getDayCloseHistory);

module.exports = router;
