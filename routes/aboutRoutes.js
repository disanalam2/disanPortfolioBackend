const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const aboutController = require('../controllers/aboutController');

// Route 1: About details GET karna
router.get('/', aboutController.getAbout);

// Route 2: About details Update/Insert karna
router.put('/update', verifyToken, aboutController.validateAbout, aboutController.updateAbout);

module.exports = router;