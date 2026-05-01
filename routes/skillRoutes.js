const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Route 1: Saari Skills GET karna (Frontend ke liye)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM skills ORDER BY id ASC');
        
        const formattedSkills = rows.map(row => {
            let parsedSkills = [];
            
            try {
                // CHECK: Agar pehle se string hai, tabhi parse karo. 
                // Agar mysql2 ne automatically array bana diya hai, toh direct use karo.
                if (typeof row.skills_list === 'string') {
                    parsedSkills = JSON.parse(row.skills_list);
                } else if (Array.isArray(row.skills_list)) {
                    parsedSkills = row.skills_list; 
                }
            } catch (e) {
                console.error(`Error parsing skills for category ID ${row.id}:`, e);
                parsedSkills = []; 
            }

            return {
                id: row.id,
                category: row.category,
                skills: parsedSkills
            };
        });

        res.status(200).json(formattedSkills);
    } catch (error) {
        console.error("Error fetching skills:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// Route 2: Skills ko Bulk Sync (Save All) karna
router.post('/sync',verifyToken, async (req, res) => {
    try {
        const skillsData = req.body; // Ye ek array hoga jisme saari categories hongi

        // 1. Purani saari skills ko clear karna (taaki drag & drop ka naya order set ho sake)
        await db.query('TRUNCATE TABLE skills');

        // 2. Naya data loop chala kar insert karna
        if (skillsData && skillsData.length > 0) {
            for (let item of skillsData) {
                const categoryName = item.category || "New Category";
                const skillsStr = JSON.stringify(item.skills || []);
                
                await db.query(
                    'INSERT INTO skills (category, skills_list) VALUES (?, ?)', 
                    [categoryName, skillsStr]
                );
            }
        }

        res.status(200).json({ success: true, message: "Skills updated and synced successfully!" });
    } catch (error) {
        console.error("Error syncing skills:", error);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

module.exports = router;