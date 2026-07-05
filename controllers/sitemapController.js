const db = require('../config/db');

exports.generateSitemap = async (req, res, next) => {
    try {
        const baseUrl = 'https://disanalam.me';

        // Fetch dynamic routes (blogs)
        const [blogs] = await db.query('SELECT slug, updated_at FROM blogs ORDER BY created_at DESC');

        // Fetch latest dates for static sections
        const [projectsLatest] = await db.query('SELECT MAX(created_at) as last_date FROM projects');
        const [skillsLatest] = await db.query('SELECT MAX(id) as last_date FROM skills'); // skills don't have created_at in schema, using id as proxy or just today if changed often. Wait, I will use a default recent date or the query result. Let's just use projects and certificates.
        const [certLatest] = await db.query('SELECT MAX(created_at) as last_date FROM certificates');

        const projDate = projectsLatest[0]?.last_date ? new Date(projectsLatest[0].last_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const certDate = certLatest[0]?.last_date ? new Date(certLatest[0].last_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const todayDate = new Date().toISOString().split('T')[0];

        // Static routes with their dynamic lastmod
        const staticRoutes = [
            { route: '/', lastmod: todayDate, priority: '1.0' },
            { route: '/projects', lastmod: projDate, priority: '0.9' },
            { route: '/skills', lastmod: todayDate, priority: '0.8' },
            { route: '/experience', lastmod: todayDate, priority: '0.8' },
            { route: '/education', lastmod: todayDate, priority: '0.8' },
            { route: '/certificate', lastmod: certDate, priority: '0.8' },
            { route: '/contact', lastmod: todayDate, priority: '0.8' },
            { route: '/blogs', lastmod: blogs.length > 0 ? new Date(blogs[0].updated_at || new Date()).toISOString().split('T')[0] : todayDate, priority: '0.9' }
        ];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Add static routes
        staticRoutes.forEach(item => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}${item.route}</loc>\n`;
            xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>${item.priority}</priority>\n`;
            xml += `  </url>\n`;
        });

        // Add blog routes
        blogs.forEach(blog => {
            const date = new Date(blog.updated_at || new Date()).toISOString().split('T')[0];
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/blogs/${blog.slug}</loc>\n`;
            xml += `    <lastmod>${date}</lastmod>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.7</priority>\n`;
            xml += `  </url>\n`;
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.status(200).send(xml);
    } catch (error) {
        next(error);
    }
};
