const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// Route 1: Saare Projects GET karna
router.get('/', projectController.getProjects);

// Route 2: Naya Project ADD karna
router.post('/add', verifyToken, projectController.validateProject, projectController.addProject);

// Route 3: Kisi Project ko UPDATE karna
router.put('/update/:id', verifyToken, projectController.validateProject, projectController.updateProject);

// Route 4: Project ko DELETE karna
router.delete('/delete/:id', verifyToken, projectController.deleteProject);

module.exports = router;