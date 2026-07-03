const db = require('../config/db');
const { body, validationResult } = require('express-validator');

exports.validateProject = [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('description').notEmpty().withMessage('Description is required'),
    body('problemFaced').optional().isString().withMessage('problemFaced must be a string'),
    body('techStack').optional().isArray().withMessage('techStack must be an array'),
    body('media').optional().isArray().withMessage('media must be an array')
];

exports.getProjects = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
        const formattedProjects = rows.map(proj => ({
            ...proj,
            techStack: proj.techStack ? JSON.parse(proj.techStack) : [],
            media: proj.media ? JSON.parse(proj.media) : []
        }));
        res.status(200).json(formattedProjects);
    } catch (error) {
        next(error);
    }
};

exports.addProject = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { title, description, problemFaced, techStack, githubLink, liveLink, media } = req.body;
        const techStackStr = JSON.stringify(techStack || []);
        const mediaStr = JSON.stringify(media || []);

        const sql = `INSERT INTO projects (title, description, problemFaced, techStack, githubLink, liveLink, media) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [title || "", description || "", problemFaced || "", techStackStr, githubLink || "", liveLink || "", mediaStr]);

        res.status(201).json({ success: true, message: "Project added successfully!", insertId: result.insertId });
    } catch (error) {
        next(error);
    }
};

exports.updateProject = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const projectId = req.params.id;
        const { title, description, problemFaced, techStack, githubLink, liveLink, media } = req.body;

        const techStackStr = JSON.stringify(techStack || []);
        const mediaStr = JSON.stringify(media || []);

        const sql = `UPDATE projects SET title=?, description=?, problemFaced=?, techStack=?, githubLink=?, liveLink=?, media=? WHERE id=?`;
        await db.execute(sql, [title || "", description || "", problemFaced || "", techStackStr, githubLink || "", liveLink || "", mediaStr, projectId]);

        res.status(200).json({ success: true, message: "Project updated successfully!" });
    } catch (error) {
        next(error);
    }
};

exports.deleteProject = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        await db.execute(`DELETE FROM projects WHERE id=?`, [projectId]);
        res.status(200).json({ success: true, message: "Project deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
