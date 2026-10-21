const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

const rateLimit = require('express-rate-limit');

// Strict rate limiter for contact form to prevent email spam (5 messages per hour)
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: 'Too many messages sent from this IP, please try again after an hour.' }
});

// Route 1: Naya message send karna (Frontend ke "Contact Me" form ke liye)
router.post('/send', contactLimiter, contactController.validateMessage, contactController.sendMessage);

// Route 2: Saare messages dekhna (Admin Panel ke Inbox ke liye)
router.get('/inbox', verifyToken, contactController.getMessages);

// Route 3: Message delete karna (Admin Panel se)
router.delete('/delete/:id', verifyToken, contactController.deleteMessage);

module.exports = router;