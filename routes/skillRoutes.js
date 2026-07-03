const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');

// Route 1: Saari Skills GET karna
router.get('/', skillController.getSkills);

// Route 2: Skills ko Bulk Sync (Save All) karna
router.post('/sync', verifyToken, skillController.validateSkills, skillController.syncSkills);

module.exports = router;