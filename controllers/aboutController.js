const db = require('../config/db');
const { body, validationResult } = require('express-validator');

exports.validateAbout = [
    body('title').notEmpty().withMessage('Title is required'),
    body('shortDesc').notEmpty().withMessage('Short description is required'),
    body('whoIAm').notEmpty().withMessage('Who I am section is required'),
    body('whatIDo').notEmpty().withMessage('What I do section is required'),
    body('howIWork').notEmpty().withMessage('How I work section is required')
];

exports.getAbout = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM about WHERE id = 1');
        
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: "About data not found" });
        }
    } catch (error) {
        next(error);
    }
};

exports.updateAbout = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { photo, title, shortDesc, whoIAm, whatIDo, howIWork, resume_link } = req.body;

        const [checkRows] = await db.query('SELECT * FROM about WHERE id = 1');

        if (checkRows.length > 0) {
            const sql = `UPDATE about SET photo=?, title=?, shortDesc=?, whoIAm=?, whatIDo=?, howIWork=?, resume_link=? WHERE id=1`;
            await db.execute(sql, [photo || "", title, shortDesc, whoIAm, whatIDo, howIWork, resume_link || ""]);
        } else {
            const sql = `INSERT INTO about (id, photo, title, shortDesc, whoIAm, whatIDo, howIWork, resume_link) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`;
            await db.execute(sql, [photo || "", title, shortDesc, whoIAm, whatIDo, howIWork, resume_link || ""]);
        }

        res.status(200).json({ success: true, message: "About details updated successfully!" });
    } catch (error) {
        next(error);
    }
};
