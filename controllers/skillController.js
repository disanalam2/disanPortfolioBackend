const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const { pingIndexNow } = require('../utils/indexNow');

exports.validateSkills = [
    body().isArray().withMessage('Skills data must be an array')
];

exports.getSkills = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM skills ORDER BY id ASC');
        
        const formattedSkills = rows.map(row => {
            let parsedSkills = [];
            try {
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
        next(error);
    }
};

exports.syncSkills = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const skillsData = req.body; 

        await db.query('TRUNCATE TABLE skills');

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
        pingIndexNow('/skills');
        res.status(200).json({ success: true, message: "Skills updated and synced successfully!" });
    } catch (error) {
        next(error);
    }
};
