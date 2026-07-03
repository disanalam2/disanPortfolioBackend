const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Route 1: Naya message send karna (Frontend ke "Contact Me" form ke liye)
router.post('/send', contactController.validateMessage, contactController.sendMessage);

// Route 2: Saare messages dekhna (Admin Panel ke Inbox ke liye)
router.get('/inbox', verifyToken, contactController.getMessages);

// Route 3: Message delete karna (Admin Panel se)
router.delete('/delete/:id', verifyToken, contactController.deleteMessage);

module.exports = router;