const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Route 1: Naya message send karna (Frontend ke "Contact Me" form ke liye)
// POST /api/contact/send
router.post('/send', async (req, res) => {
    try {
        const { name, email, phone, preference, message } = req.body;

        // SQL Query: Data ko 'messages' table me insert karne ke liye
        const sql = `INSERT INTO messages (name, email, phone, preference, message) VALUES (?, ?, ?, ?, ?)`;
        
        await db.execute(sql, [name, email, phone, preference, message]);

        res.status(201).json({ success: true, message: "Message successfully sent to database!" });
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 2: Saare messages dekhna (Admin Panel ke Inbox ke liye)
// GET /api/contact/inbox
router.get('/inbox',verifyToken, async (req, res) => {
    try {
        // SQL Query: Sabse naye messages pehle dikhane ke liye (DESC)
        const [rows] = await db.query(`SELECT * FROM messages ORDER BY created_at DESC`);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

module.exports = router;