const BlogService = require('../services/blogService');

/**
 * Renders HTML for SEO bots with dynamic Open Graph meta tags.
 */
exports.renderBlogSEO = async (req, res, next) => {
    try {
        const slug = req.params.slug;
        const blog = await BlogService.getBlogBySlug(slug);

        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        // Escape double quotes and newlines to prevent HTML attribute breakage
        const escapeAttr = (str) => {
            if (!str) return '';
            return str
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/\n/g, ' ')
                .replace(/\r/g, '');
        };

        const safeTitle = escapeAttr(blog.title);
        const safeSummary = escapeAttr(blog.summary);

        // Create the raw HTML for the bot
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${safeTitle} - Disan Alam</title>
                <meta name="description" content="${safeSummary}">
                
                <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
                <meta property="og:type" content="article">
                <meta property="og:title" content="${safeTitle} - Disan Alam">
                <meta property="og:description" content="${safeSummary}">
                <meta property="og:image" content="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}">
                <meta property="og:url" content="https://disanalam.me/blogs/${blog.slug}">
                
                <!-- Twitter Card -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="${safeTitle} - Disan Alam">
                <meta name="twitter:description" content="${safeSummary}">
                <meta name="twitter:image" content="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}">
            </head>
            <body>
                <h1>${safeTitle}</h1>
                <p>${safeSummary}</p>
                <img src="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}" alt="${safeTitle}">
            </body>
            </html>
        `;

        res.set('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error("SEO Route Error:", error);
        res.status(500).send('Internal Server Error');
    }
};
