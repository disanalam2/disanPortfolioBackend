const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/analytics/track
// @desc    Track a page view (Public)
router.post('/track', async (req, res) => {
    try {
        const { page_path, referrer, session_id, device_type } = req.body;
        const user_agent = req.headers['user-agent'] || '';
        // Note: Express behind proxy might need req.headers['x-forwarded-for']
        const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        
        await db.execute(
            'INSERT INTO page_views (page_path, referrer, user_agent, ip_address, session_id, device_type) VALUES (?, ?, ?, ?, ?, ?)',
            [page_path || '/', referrer || '', user_agent, ip_address, session_id || 'unknown', device_type || 'desktop']
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Analytics Tracking Error:', error);
        res.status(500).json({ error: 'Failed to track' });
    }
});

// @route   GET /api/analytics/stats
// @desc    Get aggregated stats for dashboard (Admin Only)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [totalViewsResult] = await db.execute('SELECT COUNT(*) as total FROM page_views');
        const [uniqueVisitorsResult] = await db.execute('SELECT COUNT(DISTINCT session_id) as unique_visitors FROM page_views');
        
        // Top 5 pages
        const [topPagesResult] = await db.execute(`
            SELECT page_path, COUNT(*) as views 
            FROM page_views 
            GROUP BY page_path 
            ORDER BY views DESC 
            LIMIT 5
        `);
        
        // Daily views (last 7 days)
        const [dailyViewsResult] = await db.execute(`
            SELECT DATE(created_at) as date, COUNT(*) as views 
            FROM page_views 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        `);

        res.json({
            total_views: totalViewsResult[0].total,
            unique_visitors: uniqueVisitorsResult[0].unique_visitors,
            top_pages: topPagesResult,
            daily_views: dailyViewsResult
        });
    } catch (error) {
        console.error('Analytics Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
