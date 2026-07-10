const express = require('express');
const router = express.Router();
const { getDb } = require('../config/emailDbWrapper');
const authMiddleware = require('../middleware/authMiddleware');
const { encrypt } = require('../utils/encryption');

// Get all email accounts
router.get('/emails', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const emails = await db.all('SELECT id, email, host, port, daily_sent_count, last_used, is_active FROM email_accounts WHERE deleted = 0 ORDER BY id ASC');
        res.json(emails);
    } catch (error) {
        console.error('Error fetching email accounts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a new email account
router.post('/emails', authMiddleware, async (req, res) => {
    try {
        const { email, password, host, port } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = await getDb();
        const encryptedPassword = encrypt(password);
        await db.run(
            'INSERT INTO email_accounts (email, password, host, port) VALUES (?, ?, ?, ?)',
            [email, encryptedPassword, host || 'smtp.zoho.in', port || 465]
        );
        res.status(201).json({ message: 'Email account added successfully' });
    } catch (error) {
        console.error('Error adding email account:', error);
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'This email is already added' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete an email account (Soft Delete)
router.delete('/emails/:id', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        await db.run('UPDATE email_accounts SET deleted = 1, is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Email account securely archived' });
    } catch (error) {
        console.error('Error deleting email account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
