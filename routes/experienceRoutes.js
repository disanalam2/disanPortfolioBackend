const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const experienceController = require('../controllers/experienceController');

// Route 1: Saare Experience GET karna
router.get('/', experienceController.getExperiences);

// Route 2: Naya Experience ADD karna (verifyToken added)
router.post('/add', verifyToken, experienceController.validateExperience, experienceController.addExperience);

// Route 3: Experience UPDATE karna (verifyToken added)
router.put('/update/:id', verifyToken, experienceController.validateExperience, experienceController.updateExperience);

// Route 4: Experience DELETE karna (verifyToken added)
router.delete('/delete/:id', verifyToken, experienceController.deleteExperience);

module.exports = router;