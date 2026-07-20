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

        const frontendUrl = process.env.FRONTEND_URL || 'https://disanalam.me';
        const blogUrl = `${frontendUrl}/blogs/${blog.slug}`;

        // Check if the request is from a social media bot
        const userAgent = req.get('user-agent') || '';
        const isBot = /bot|facebook|whatsapp|linkedin|twitter|slack|telegram|discord|skype|viber/i.test(userAgent);

        if (!isBot) {
            // If it's a real user, instantly redirect them to the Firebase frontend
            return res.redirect(302, blogUrl);
        }

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
                <meta property="og:url" content="${blogUrl}">
                
                <!-- Twitter Card -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="${safeTitle} - Disan Alam">
                <meta name="twitter:description" content="${safeSummary}">
                <meta name="twitter:image" content="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}">

                <!-- Fallback Redirect just in case a browser doesn't follow 302 or is a weird bot -->
                <script>window.location.href = "${blogUrl}";</script>
            </head>
            <body>
                <h1>${safeTitle}</h1>
                <p>${safeSummary}</p>
                <img src="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}" alt="${safeTitle}">
                <p>If you are not redirected automatically, follow this <a href="${blogUrl}">link to the blog</a>.</p>
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
