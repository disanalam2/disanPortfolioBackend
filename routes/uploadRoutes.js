const express = require('express');
const router = express.Router();
const { uploadFile, uploadMiddleware } = require('../controllers/uploadController');
const verifyToken = require('../middleware/authMiddleware');

// Sirf admin hi upload kar sakta hai
router.post('/', verifyToken, uploadMiddleware, uploadFile);

module.exports = router;
