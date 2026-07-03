const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const educationController = require('../controllers/educationController');

// Route 1: Get all Educations
router.get('/', educationController.getEducations);

// Route 2: Add Education
router.post('/add', verifyToken, educationController.validateEducation, educationController.addEducation);

// Route 3: Update Education
router.put('/update/:id', verifyToken, educationController.validateEducation, educationController.updateEducation);

// Route 4: Delete Education
router.delete('/delete/:id', verifyToken, educationController.deleteEducation);

module.exports = router;
