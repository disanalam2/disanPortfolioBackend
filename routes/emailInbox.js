const express = require('express');
const router = express.Router();
const { getDb } = require('../config/emailDbWrapper');
const authMiddleware = require('../middleware/authMiddleware');

// Get all inbox messages
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const messages = await db.all('SELECT * FROM email_inbox ORDER BY received_at DESC');
        res.json(messages);
    } catch (error) {
        console.error('Error fetching unified inbox:', error);
        res.status(500).json({ error: 'Failed to fetch inbox messages' });
    }
});

// Mark message as read
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        await db.run('UPDATE email_inbox SET is_read = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Message marked as read' });
    } catch (error) {
        console.error('Error updating inbox message:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

// Delete message
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        await db.run('DELETE FROM email_inbox WHERE id = ?', [req.params.id]);
        res.json({ message: 'Message deleted' });
    } catch (error) {
        console.error('Error deleting inbox message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
