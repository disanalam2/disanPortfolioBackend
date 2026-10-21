const express = require('express');
const router = express.Router();
const { uploadFile, uploadMiddleware } = require('../controllers/uploadController');
const verifyToken = require('../middleware/authMiddleware');

// Specifically allow larger payloads for upload route only
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ limit: '50mb', extended: true }));

// Sirf admin hi upload kar sakta hai
router.post('/', verifyToken, uploadMiddleware, uploadFile);

module.exports = router;
