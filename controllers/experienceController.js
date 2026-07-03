const db = require('../config/db');
const { body, validationResult } = require('express-validator');

exports.validateExperience = [
    body('role').notEmpty().withMessage('Role is required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('period').notEmpty().withMessage('Period is required'),
    body('details').optional().isArray().withMessage('Details must be an array')
];

exports.getExperiences = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM experience ORDER BY id DESC');
        
        const formattedExperience = rows.map(exp => ({
            ...exp,
            details: exp.details ? JSON.parse(exp.details) : []
        }));

        res.status(200).json(formattedExperience);
    } catch (error) {
        next(error);
    }
};

exports.addExperience = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { role, company, period, details } = req.body;
        const detailsStr = JSON.stringify(details || []);

        const sql = `INSERT INTO experience (role, company, period, details) VALUES (?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [role || "", company || "", period || "", detailsStr]);

        res.status(201).json({ success: true, message: "Experience added successfully!", insertId: result.insertId });
    } catch (error) {
        next(error);
    }
};

exports.updateExperience = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const expId = req.params.id;
        const { role, company, period, details } = req.body;
        const detailsStr = JSON.stringify(details || []);

        const sql = `UPDATE experience SET role=?, company=?, period=?, details=? WHERE id=?`;
        await db.execute(sql, [role || "", company || "", period || "", detailsStr, expId]);

        res.status(200).json({ success: true, message: "Experience updated successfully!" });
    } catch (error) {
        next(error);
    }
};

exports.deleteExperience = async (req, res, next) => {
    try {
        const expId = req.params.id;
        await db.execute(`DELETE FROM experience WHERE id=?`, [expId]);
        res.status(200).json({ success: true, message: "Experience deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
