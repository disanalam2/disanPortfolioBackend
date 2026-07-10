const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to trigger the automated scraper and website auditor
router.post('/start', authMiddleware, scraperController.startScraper);

module.exports = router;
