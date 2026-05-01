const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Route 1: Saare Experience GET karna
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM experience ORDER BY id DESC');
        
        // JSON string ko wapas array me convert karna
        const formattedExperience = rows.map(exp => ({
            ...exp,
            details: exp.details ? JSON.parse(exp.details) : []
        }));

        res.status(200).json(formattedExperience);
    } catch (error) {
        console.error("Error fetching experience:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 2: Naya Experience ADD karna
router.post('/add', async (req, res) => {
    try {
        const { role, company, period, details } = req.body;
        const detailsStr = JSON.stringify(details || []);

        const sql = `INSERT INTO experience (role, company, period, details) VALUES (?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [role || "", company || "", period || "", detailsStr]);

        res.status(201).json({ success: true, message: "Experience added successfully!", insertId: result.insertId });
    } catch (error) {
        console.error("Error adding experience:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 3: Experience UPDATE karna
router.put('/update/:id', async (req, res) => {
    try {
        const expId = req.params.id;
        const { role, company, period, details } = req.body;
        const detailsStr = JSON.stringify(details || []);

        const sql = `UPDATE experience SET role=?, company=?, period=?, details=? WHERE id=?`;
        await db.execute(sql, [role || "", company || "", period || "", detailsStr, expId]);

        res.status(200).json({ success: true, message: "Experience updated successfully!" });
    } catch (error) {
        console.error("Error updating experience:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 4: Experience DELETE karna
router.delete('/delete/:id', async (req, res) => {
    try {
        const expId = req.params.id;
        await db.execute(`DELETE FROM experience WHERE id=?`, [expId]);
        res.status(200).json({ success: true, message: "Experience deleted successfully!" });
    } catch (error) {
        console.error("Error deleting experience:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

module.exports = router;