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

// Route to get Auto Scraper status (is_active)
router.get('/status', authMiddleware, scraperController.getAutoScraperStatus);

// Route to toggle Auto Scraper status
router.post('/toggle', authMiddleware, scraperController.toggleAutoScraperStatus);

// Route to view the PDF audit report inline
router.get('/audit-pdf/:leadId', authMiddleware, scraperController.viewAuditPDF);

// Route for manual website audit (client side report)
router.post('/manual-audit', authMiddleware, scraperController.manualAudit);

module.exports = router;
