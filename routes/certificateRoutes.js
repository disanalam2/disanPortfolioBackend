const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Route 1: Saare Certificates GET karna
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM certificates ORDER BY id DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching certificates:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 2: Naya Certificate ADD karna
router.post('/add',verifyToken, async (req, res) => {
    try {
        const { title, issuer, issue_date, description, href, image } = req.body;

        const sql = `INSERT INTO certificates (title, issuer, issue_date, description, href, image) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [title || "", issuer || "", issue_date || "", description || "", href || "", image || ""]);

        res.status(201).json({ success: true, message: "Certificate added successfully!", insertId: result.insertId });
    } catch (error) {
        console.error("Error adding certificate:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 3: Certificate UPDATE karna
router.put('/update/:id',verifyToken, async (req, res) => {
    try {
        const certId = req.params.id;
        const { title, issuer, issue_date, description, href, image } = req.body;

        const sql = `UPDATE certificates SET title=?, issuer=?, issue_date=?, description=?, href=?, image=? WHERE id=?`;
        await db.execute(sql, [title || "", issuer || "", issue_date || "", description || "", href || "", image || "", certId]);

        res.status(200).json({ success: true, message: "Certificate updated successfully!" });
    } catch (error) {
        console.error("Error updating certificate:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 4: Certificate DELETE karna
router.delete('/delete/:id',verifyToken, async (req, res) => {
    try {
        const certId = req.params.id;
        await db.execute(`DELETE FROM certificates WHERE id=?`, [certId]);
        res.status(200).json({ success: true, message: "Certificate deleted successfully!" });
    } catch (error) {
        console.error("Error deleting certificate:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

module.exports = router;