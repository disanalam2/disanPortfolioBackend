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

        // Create the raw HTML for the bot
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${blog.title} - Disan Alam</title>
                <meta name="description" content="${blog.summary}">
                
                <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
                <meta property="og:type" content="article">
                <meta property="og:title" content="${blog.title} - Disan Alam">
                <meta property="og:description" content="${blog.summary}">
                <meta property="og:image" content="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}">
                <meta property="og:url" content="https://disanalam.me/blogs/${blog.slug}">
                
                <!-- Twitter Card -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="${blog.title} - Disan Alam">
                <meta name="twitter:description" content="${blog.summary}">
                <meta name="twitter:image" content="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}">
            </head>
            <body>
                <h1>${blog.title}</h1>
                <p>${blog.summary}</p>
                <img src="${blog.thumbnail || 'https://disanalam.me/banner.jpeg'}" alt="${blog.title}">
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
