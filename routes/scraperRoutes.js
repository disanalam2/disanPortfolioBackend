const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to trigger the automated scraper and website auditor synchronously
router.post('/start', authMiddleware, scraperController.startScraper);

// Route to manually trigger the background LeadGeneration job
router.post('/trigger-background', authMiddleware, scraperController.triggerBackgroundScraper);

// Route to get current AI Queue status
router.get('/queue-status', authMiddleware, scraperController.getQueueStatus);

// Route to view the PDF audit report inline
router.get('/audit-pdf/:leadId', authMiddleware, scraperController.viewAuditPDF);

module.exports = router;
