const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const { pingIndexNow } = require('../utils/indexNow');

exports.validateEducation = [
    body('degree').notEmpty().withMessage('Degree is required'),
    body('institution').notEmpty().withMessage('Institution is required'),
    body('period').notEmpty().withMessage('Period is required'),
    body('details').optional().isArray().withMessage('Details must be an array')
];

exports.getEducations = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM education ORDER BY id DESC');
        
        const formattedEducation = rows.map(edu => ({
            ...edu,
            details: edu.details ? JSON.parse(edu.details) : []
        }));

        res.status(200).json(formattedEducation);
    } catch (error) {
        next(error);
    }
};

exports.addEducation = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { degree, institution, period, details } = req.body;
        const detailsStr = JSON.stringify(details || []);

        const sql = `INSERT INTO education (degree, institution, period, details) VALUES (?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [degree || "", institution || "", period || "", detailsStr]);
        pingIndexNow('/education');
        res.status(201).json({ success: true, message: "Education added successfully!", insertId: result.insertId });
    } catch (error) {
        next(error);
    }
};

exports.updateEducation = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const eduId = req.params.id;
        const { degree, institution, period, details } = req.body;
        const detailsStr = JSON.stringify(details || []);

        const sql = `UPDATE education SET degree=?, institution=?, period=?, details=? WHERE id=?`;
        await db.execute(sql, [degree || "", institution || "", period || "", detailsStr, eduId]);
        pingIndexNow('/education');
        res.status(200).json({ success: true, message: "Education updated successfully!" });
    } catch (error) {
        next(error);
    }
};

exports.deleteEducation = async (req, res, next) => {
    try {
        const eduId = req.params.id;
        await db.execute(`DELETE FROM education WHERE id=?`, [eduId]);
        pingIndexNow('/education');
        res.status(200).json({ success: true, message: "Education deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
