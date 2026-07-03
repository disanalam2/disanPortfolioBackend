const db = require('../config/db');
const { body, validationResult } = require('express-validator');

exports.validateMessage = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').notEmpty().withMessage('Message cannot be empty')
];

exports.sendMessage = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, phone, preference, message } = req.body;

        const sql = `INSERT INTO messages (name, email, phone, preference, message) VALUES (?, ?, ?, ?, ?)`;
        await db.execute(sql, [name, email, phone || "", preference || "", message]);

        res.status(201).json({ success: true, message: "Message successfully sent to database!" });
    } catch (error) {
        next(error);
    }
};

exports.getMessages = async (req, res, next) => {
    try {
        const [rows] = await db.query(`SELECT * FROM messages ORDER BY created_at DESC`);
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

exports.deleteMessage = async (req, res, next) => {
    try {
        const messageId = req.params.id;

        const sql = `DELETE FROM messages WHERE id = ?`;
        const [result] = await db.execute(sql, [messageId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        res.status(200).json({ success: true, message: "Message deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
