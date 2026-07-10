const express = require('express');
const router = express.Router();
const { getDb } = require('../config/emailDbWrapper');

router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        
        // 1. Total KPI Stats
        const totalLeads = await db.get('SELECT COUNT(*) as count FROM email_leads');
        const totalSent = await db.get("SELECT COUNT(*) as count FROM email_leads WHERE status = 'emailed'");
        const totalOpened = await db.get("SELECT COUNT(*) as count FROM email_leads WHERE opened = 1");

        // 2. A/B Testing Stats
        const versionA = await db.get("SELECT COUNT(*) as count, SUM(CASE WHEN opened = 1 THEN 1 ELSE 0 END) as opened FROM email_leads WHERE status = 'emailed' AND ab_version = 'A'");
        const versionB = await db.get("SELECT COUNT(*) as count, SUM(CASE WHEN opened = 1 THEN 1 ELSE 0 END) as opened FROM email_leads WHERE status = 'emailed' AND ab_version = 'B'");

        // 3. Lead Type Breakdown (Pie Chart Data)
        const typeNoWebsite = await db.get("SELECT COUNT(*) as count FROM email_leads WHERE lead_type = 'no_website'");
        const typeBadWebsite = await db.get("SELECT COUNT(*) as count FROM email_leads WHERE lead_type = 'bad_website'");

        res.json({
            kpi: {
                total_leads: totalLeads.count,
                total_sent: totalSent.count,
                total_opened: totalOpened.count,
            },
            ab_testing: {
                version_a: {
                    sent: versionA.count || 0,
                    opened: versionA.opened || 0,
                    rate: versionA.count ? ((versionA.opened / versionA.count) * 100).toFixed(1) : 0
                },
                version_b: {
                    sent: versionB.count || 0,
                    opened: versionB.opened || 0,
                    rate: versionB.count ? ((versionB.opened / versionB.count) * 100).toFixed(1) : 0
                }
            },
            lead_types: [
                { name: 'No Website', value: typeNoWebsite.count || 0 },
                { name: 'Bad Website', value: typeBadWebsite.count || 0 }
            ]
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

module.exports = router;
