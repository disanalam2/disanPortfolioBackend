const express = require('express');
const router = express.Router();
const { getDb } = require('../config/emailDbWrapper');
const path = require('path');
const fs = require('fs');

// 1x1 transparent GIF pixel
const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

// Track email open
router.get('/open/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const db = await getDb();
        
        await db.run(
            'UPDATE email_leads SET opened = 1, opened_at = CURRENT_TIMESTAMP, open_count = COALESCE(open_count, 0) + 1 WHERE uuid = ?',
            [uuid]
        );
        
        // Make it hot if opened multiple times
        await db.run(
            'UPDATE email_leads SET is_hot = 1 WHERE uuid = ? AND open_count >= 2',
            [uuid]
        );
        
        console.log(`Email opened for lead UUID: ${uuid}`);
        
        const lead = await db.get('SELECT business_name, id, is_hot FROM email_leads WHERE uuid = ?', [uuid]);
        if (lead) {
            const io = req.app.get('io');
            if (io) {
                io.emit('lead_notification', {
                    type: 'open',
                    message: lead.is_hot ? `🔥 HOT LEAD! ${lead.business_name} is reading your email multiple times!` : `👀 ${lead.business_name} opened your email!`,
                    leadId: lead.id
                });
            }
        }
    } catch (error) {
        console.error('Error tracking open for lead:', req.params.uuid, error);
    } finally {
        // Always return the 1x1 pixel image immediately to the client
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(pixel);
    }
});

// Handle unsubscribe
router.get('/unsubscribe/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const db = await getDb();
        
        await db.run(
            'UPDATE email_leads SET is_unsubscribed = 1 WHERE uuid = ?',
            [uuid]
        );
        
        console.log(`Lead UUID ${uuid} unsubscribed.`);
        
        // Redirect to the frontend unsubscribe success page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/unsubscribe-success`);
    } catch (error) {
        console.error('Error tracking unsubscribe for lead:', req.params.uuid, error);
        res.status(500).send('An error occurred.');
    }
});

// Handle bounce webhook (e.g. from SendGrid or Mailgun)
router.post('/bounce', express.json(), async (req, res) => {
    try {
        // Typically bounce webhooks send the email address that bounced
        const { email } = req.body;
        if (!email) return res.status(400).send('Email missing');

        const db = await getDb();
        await db.run(
            "UPDATE email_leads SET is_unsubscribed = 1, status = 'bounced' WHERE email = ?",
            [email]
        );
        
        console.log(`Bounce registered for ${email}`);
        res.send('OK');
    } catch (error) {
        console.error('Error processing bounce webhook', error);
        res.status(500).send('Error');
    }
});

// Track link clicks (Redirects to portfolio)
router.get('/click/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const db = await getDb();
        
        await db.run(
            'UPDATE email_leads SET clicked = 1, clicked_at = CURRENT_TIMESTAMP, is_hot = 1 WHERE uuid = ? AND clicked = 0',
            [uuid]
        );
        
        console.log(`Link clicked by lead UUID: ${uuid}`);
        
        const lead = await db.get('SELECT business_name, id FROM email_leads WHERE uuid = ?', [uuid]);
        if (lead) {
            const io = req.app.get('io');
            if (io) {
                io.emit('lead_notification', {
                    type: 'click',
                    message: `🔥 HOT LEAD: ${lead.business_name} clicked your portfolio link!`,
                    leadId: lead.id
                });
            }
        }
        
        // Redirect to VIP Proposal page
        const frontendUrl = process.env.FRONTEND_URL || 'https://disanalam.me';
        res.redirect(`${frontendUrl}/proposal/${uuid}`);
    } catch (error) {
        console.error('Error tracking click for lead:', req.params.uuid, error);
        // Fallback redirect
        const frontendUrl = process.env.FRONTEND_URL || 'https://disanalam.me';
        res.redirect(`${frontendUrl}/contact`);
    }
});

// Track conversions (Form Submissions from Portfolio)
// This should accept JSON: { "lead_id": 123, "type": "form_submission" }
router.post('/conversion', express.json(), async (req, res) => {
    try {
        const { lead_id, type } = req.body;
        
        if (!lead_id) {
            return res.status(400).json({ error: 'lead_id is required' });
        }

        const db = await getDb();
        
        await db.run(
            `UPDATE email_leads 
             SET status = 'replied', conversion_type = ? 
             WHERE uuid = ? OR id = ?`,
            [type || 'form_submission', lead_id, lead_id] // Handle both uuid and legacy integer id
        );
        
        console.log(`Conversion tracked for lead: ${lead_id} (Type: ${type})`);
        
        const lead = await db.get('SELECT business_name, id FROM email_leads WHERE uuid = ? OR id = ?', [lead_id, lead_id]);
        if (lead) {
            const io = req.app.get('io');
            if (io) {
                io.emit('lead_notification', {
                    type: 'reply',
                    message: `🎯 Hot Lead! ${lead.business_name} just replied to your email!`,
                    leadId: lead.id
                });
            }
        }

        res.json({ success: true, message: 'Conversion tracked successfully' });
    } catch (error) {
        console.error('Error tracking conversion:', error);
        res.status(500).json({ error: 'Failed to process conversion' });
    }
});

// Get basic info for VIP Proposal Page
router.get('/proposal-info/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const db = await getDb();
        const lead = await db.get('SELECT business_name, niche, website_issues FROM email_leads WHERE uuid = ?', [uuid]);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        console.error('Error fetching proposal info:', error);
        res.status(500).json({ error: 'Failed to fetch proposal info' });
    }
});

module.exports = router;
