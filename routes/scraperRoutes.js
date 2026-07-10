const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to trigger the automated scraper and website auditor
router.post('/start', authMiddleware, scraperController.startScraper);

// Route to view the PDF audit report inline
router.get('/audit-pdf/:leadId', authMiddleware, scraperController.viewAuditPDF);

module.exports = router;
