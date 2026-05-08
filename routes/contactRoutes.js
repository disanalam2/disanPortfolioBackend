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

// Route 3: Message delete karna (Admin Panel se)
// DELETE /api/contact/delete/:id
router.delete('/delete/:id', verifyToken, async (req, res) => {
    try {
        const messageId = req.params.id;

        // SQL Query: Message ko delete karne ke liye
        const sql = `DELETE FROM messages WHERE id = ?`;
        const [result] = await db.execute(sql, [messageId]);

        // Check karo ki message mila aur delete hua ya nahi
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        res.status(200).json({ success: true, message: "Message deleted successfully!" });
    } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

module.exports = router;