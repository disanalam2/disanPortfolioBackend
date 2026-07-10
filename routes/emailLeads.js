const express = require('express');
const router = express.Router();
const { getDb } = require('../config/emailDbWrapper');
const { sendMailToLead } = require('../utils/mailer');
const authMiddleware = require('../middleware/authMiddleware');
const { generateAuditPDF } = require('../utils/pdfGenerator');
const fs = require('fs');

// Get all leads
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM email_leads ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// Update a lead (e.g. modify email draft)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { email_draft, status } = req.body;
        
        const db = await getDb();
        await db.run('UPDATE email_leads SET email_draft = ?, status = ? WHERE id = ?', [email_draft, status, id]);
        res.json({ message: 'Lead updated successfully' });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

// Approve & Schedule main email
router.post('/:id/schedule', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { email_draft } = req.body;
        
        const db = await getDb();
        await db.run(
            "UPDATE email_leads SET email_draft = ?, status = 'approved_scheduled' WHERE id = ?",
            [email_draft, id]
        );
        
        res.json({ message: 'Email scheduled for optimal local time delivery!' });
    } catch (error) {
        console.error('Error scheduling email:', error);
        res.status(500).json({ error: 'Failed to schedule email.' });
    }
});

// Approve & Schedule follow-up
router.post('/:id/followup', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { follow_up_draft, step } = req.body;
        
        const db = await getDb();
        const draftColumn = step === 1 ? 'follow_up_1_draft' : 'follow_up_2_draft';
        
        await db.run(
            `UPDATE email_leads SET ${draftColumn} = ?, status = 'follow_up_scheduled', follow_up_step = ? WHERE id = ?`,
            [follow_up_draft, step, id]
        );
        
        res.json({ message: `Follow-up ${step} scheduled!` });
    } catch (error) {
        console.error('Error scheduling follow-up:', error);
        res.status(500).json({ error: 'Failed to schedule follow-up.' });
    }
});

// Immediate Send email to a lead (if they don't want to schedule)
router.post('/:id/send', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { email_draft, subject } = req.body; 
        
        const db = await getDb();
        
        // Update the draft just in case they edited it
        if (email_draft) {
             await db.run('UPDATE email_leads SET email_draft = ? WHERE id = ?', [email_draft, id]);
        }
        
        const fromEmail = await sendMailToLead(id, email_draft, subject, false);
        
        await db.run("UPDATE email_leads SET status = 'emailed', last_contacted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
        
        res.json({ message: `Email sent successfully from ${fromEmail}!` });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: error.message || 'Failed to send email. Check your SMTP settings.' });
    }
});

// Delete a lead
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('DELETE FROM email_leads WHERE id = ?', [id]);
        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

// Make PR Award Public
router.post('/:id/publish-award', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run('UPDATE email_leads SET is_award_public = 1 WHERE id = ?', [id]);
        res.json({ message: 'Award page is now public!' });
    } catch (error) {
        console.error('Error publishing award:', error);
        res.status(500).json({ error: 'Failed to publish award' });
    }
});

// Public route for Dynamic React Pitch View
router.get('/pitch/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const db = await getDb();
        const lead = await db.get('SELECT business_name, website, screenshot_url, website_issues, lead_type, niche, address, is_award_public FROM email_leads WHERE uuid = ?', [uuid]);
        
        if (!lead) {
            return res.status(404).json({ error: 'Pitch not found or has expired.' });
        }
        
        res.json(lead);
    } catch (error) {
        console.error('Error fetching pitch data:', error);
        res.status(500).json({ error: 'Failed to fetch pitch data' });
    }
});

// Generate and serve PDF
router.get('/:id/pdf', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();
        const lead = await db.get('SELECT business_name, website_issues FROM email_leads WHERE id = ?', [id]);
        
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found.' });
        }
        
        const { filePath, fileName } = await generateAuditPDF(lead.business_name, lead.website_issues);
        
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("Error sending PDF:", err);
            }
            // clean up file after sending
            try { fs.unlinkSync(filePath); } catch (e) {}
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

module.exports = router;
