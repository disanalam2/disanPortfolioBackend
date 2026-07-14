const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const { pingIndexNow } = require('../utils/indexNow');

exports.validateCertificate = [
    body('title').notEmpty().withMessage('Title is required'),
    body('issuer').notEmpty().withMessage('Issuer is required'),
    body('issue_date').notEmpty().withMessage('Issue date is required')
];

exports.getCertificates = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM certificates ORDER BY id DESC');
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

exports.addCertificate = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { title, issuer, issue_date, description, href, image } = req.body;

        const sql = `INSERT INTO certificates (title, issuer, issue_date, description, href, image) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [title || "", issuer || "", issue_date || "", description || "", href || "", image || ""]);
        pingIndexNow('/certificate');
        res.status(201).json({ success: true, message: "Certificate added successfully!", insertId: result.insertId });
    } catch (error) {
        next(error);
    }
};

exports.updateCertificate = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const certId = req.params.id;
        const { title, issuer, issue_date, description, href, image } = req.body;

        const sql = `UPDATE certificates SET title=?, issuer=?, issue_date=?, description=?, href=?, image=? WHERE id=?`;
        await db.execute(sql, [title || "", issuer || "", issue_date || "", description || "", href || "", image || "", certId]);
        pingIndexNow('/certificate');
        res.status(200).json({ success: true, message: "Certificate updated successfully!" });
    } catch (error) {
        next(error);
    }
};

exports.deleteCertificate = async (req, res, next) => {
    try {
        const certId = req.params.id;
        await db.execute(`DELETE FROM certificates WHERE id=?`, [certId]);
        pingIndexNow('/certificate');
        res.status(200).json({ success: true, message: "Certificate deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
