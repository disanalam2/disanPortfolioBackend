const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Route 1: About details GET karna (Frontend par dikhane ke liye)
// GET /api/about
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM about WHERE id = 1');
        
        if (rows.length > 0) {
            res.status(200).json(rows[0]); // Sirf pehla record bhejenge
        } else {
            res.status(404).json({ message: "About data not found" });
        }
    } catch (error) {
        console.error("Error fetching about data:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 2: About details Update/Insert karna (Admin Panel ke liye)
// PUT /api/about/update
router.put('/update',verifyToken, async (req, res) => {
    try {
        const { photo, title, shortDesc, whoIAm, whatIDo, howIWork } = req.body;

        // Pehle check karte hain ki ID=1 exist karta hai ya nahi
        const [checkRows] = await db.query('SELECT * FROM about WHERE id = 1');

        if (checkRows.length > 0) {
            // Agar pehle se hai, toh UPDATE karenge
            const sql = `UPDATE about SET photo=?, title=?, shortDesc=?, whoIAm=?, whatIDo=?, howIWork=? WHERE id=1`;
            await db.execute(sql, [photo, title, shortDesc, whoIAm, whatIDo, howIWork]);
        } else {
            // Agar table khali hai, toh pehli baar INSERT karenge (id = 1 ke sath)
            const sql = `INSERT INTO about (id, photo, title, shortDesc, whoIAm, whatIDo, howIWork) VALUES (1, ?, ?, ?, ?, ?, ?)`;
            await db.execute(sql, [photo, title, shortDesc, whoIAm, whatIDo, howIWork]);
        }

        res.status(200).json({ success: true, message: "About details updated successfully!" });
    } catch (error) {
        console.error("Error updating about data:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

module.exports = router;