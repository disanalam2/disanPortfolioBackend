const db = require('../config/db');
const { body, validationResult } = require('express-validator');

exports.validateMessage = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').notEmpty().withMessage('Message cannot be empty')
];

const nodemailer = require('nodemailer');

exports.sendMessage = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, phone, preference, message } = req.body;

        // 1. Save to Database
        const sql = `INSERT INTO messages (name, email, phone, preference, message) VALUES (?, ?, ?, ?, ?)`;
        await db.execute(sql, [name, email, phone || "", preference || "", message]);

        // 2. Send Response immediately (Don't make user wait for email to send)
        res.status(201).json({ success: true, message: "Message successfully sent to database!" });

        // 3. Send Email Notification asynchronously
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: process.env.EMAIL_USER, // Bhejenge khud ko hi notification ke liye
                    subject: `New Portfolio Message from ${name}`,
                    html: `
                        <h2>New Message on Disan Portfolio</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Contact Preference:</strong> ${preference || 'Not provided'}</p>
                        <hr />
                        <p><strong>Message:</strong></p>
                        <p>${message}</p>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log(`Email notification sent for message from ${name}`);
            } catch (emailError) {
                console.error("Failed to send email notification:", emailError);
            }
        }
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
