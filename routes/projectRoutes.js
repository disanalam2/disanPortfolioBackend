const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Route 1: Saare Projects GET karna (Frontend par dikhane ke liye)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
        
        // Frontend ko arrays chahiye, isliye JSON string ko wapas array me convert kar rahe hain
        const formattedProjects = rows.map(proj => ({
            ...proj,
            techStack: proj.techStack ? JSON.parse(proj.techStack) : [],
            media: proj.media ? JSON.parse(proj.media) : []
        }));

        res.status(200).json(formattedProjects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 2: Naya Project ADD karna
router.post('/add',verifyToken, async (req, res) => {
    try {
        const { title, description, techStack, githubLink, liveLink, media } = req.body;

        // Arrays ko stringify karke DB me daalenge
        const techStackStr = JSON.stringify(techStack || []);
        const mediaStr = JSON.stringify(media || []);

        const sql = `INSERT INTO projects (title, description, techStack, githubLink, liveLink, media) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [title || "", description || "", techStackStr, githubLink || "", liveLink || "", mediaStr]);

        res.status(201).json({ success: true, message: "Project added successfully!", insertId: result.insertId });
    } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 3: Kisi Project ko UPDATE karna
router.put('/update/:id',verifyToken, async (req, res) => {
    try {
        const projectId = req.params.id;
        const { title, description, techStack, githubLink, liveLink, media } = req.body;

        const techStackStr = JSON.stringify(techStack || []);
        const mediaStr = JSON.stringify(media || []);

        const sql = `UPDATE projects SET title=?, description=?, techStack=?, githubLink=?, liveLink=?, media=? WHERE id=?`;
        await db.execute(sql, [title || "", description || "", techStackStr, githubLink || "", liveLink || "", mediaStr, projectId]);

        res.status(200).json({ success: true, message: "Project updated successfully!" });
    } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 4: Project ko DELETE karna
router.delete('/delete/:id',verifyToken, async (req, res) => {
    try {
        const projectId = req.params.id;
        await db.execute(`DELETE FROM projects WHERE id=?`, [projectId]);
        res.status(200).json({ success: true, message: "Project deleted successfully!" });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

module.exports = router;