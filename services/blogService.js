const db = require('../config/db');

/**
 * Service for handling Blog database operations.
 */
class BlogService {
    /**
     * Retrieves blogs.
     * @param {boolean} admin - If true, retrieves all blogs including scheduled ones. If false, only retrieves published blogs.
     * @returns {Promise<Array>} Array of blogs.
     */
    static async getAllBlogs(admin = false) {
        let query = 'SELECT * FROM blogs';
        if (!admin) {
            query += ' WHERE scheduledFor IS NULL OR scheduledFor <= NOW()';
        }
        query += ' ORDER BY created_at DESC';
        const [rows] = await db.query(query);
        return rows;
    }

    /**
     * Retrieves a single blog by its slug.
     * @param {string} slug 
     * @returns {Promise<Object|null>} Blog object or null.
     */
    static async getBlogBySlug(slug) {
        const [rows] = await db.query('SELECT * FROM blogs WHERE slug = ?', [slug]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Increments the view count of a blog.
     * @param {string} slug 
     */
    static async incrementViewCount(slug) {
        await db.execute('UPDATE blogs SET views = views + 1 WHERE slug = ?', [slug]);
    }

    /**
     * Calculates estimated read time (words / 200).
     */
    static calculateReadTime(content) {
        if (!content) return 1;
        const words = content.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / 200);
        return minutes > 0 ? minutes : 1;
    }

    /**
     * Sanitizes a string into a URL-friendly slug.
     */
    static sanitizeSlug(slug) {
        if (!slug) return '';
        return slug.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphen
            .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens
    }

    /**
     * Inserts a new blog.
     * @param {Object} blogData 
     * @returns {Promise<number>} Inserted blog ID.
     */
    static async createBlog(blogData) {
        let { title, slug, summary, content, thumbnail, scheduledFor } = blogData;
        slug = this.sanitizeSlug(slug) || this.sanitizeSlug(title);
        const readTime = this.calculateReadTime(content);
        
        // Convert ISO string to Date object for mysql2 to handle timezones correctly
        const scheduledTime = scheduledFor ? new Date(scheduledFor) : null;
        
        const sql = `INSERT INTO blogs (title, slug, summary, content, thumbnail, read_time, scheduledFor) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [title, slug, summary || "", content, thumbnail || "", readTime, scheduledTime]);
        return result.insertId;
    }

    /**
     * Updates a blog by ID.
     * @param {number} id 
     * @param {Object} blogData 
     */
    static async updateBlog(id, blogData) {
        let { title, slug, summary, content, thumbnail, scheduledFor } = blogData;
        slug = this.sanitizeSlug(slug) || this.sanitizeSlug(title);
        const readTime = this.calculateReadTime(content);

        // Convert ISO string to Date object for mysql2 to handle timezones correctly
        const scheduledTime = scheduledFor ? new Date(scheduledFor) : null;

        const sql = `UPDATE blogs SET title=?, slug=?, summary=?, content=?, thumbnail=?, read_time=?, scheduledFor=? WHERE id=?`;
        await db.execute(sql, [title, slug, summary || "", content, thumbnail || "", readTime, scheduledTime, id]);
    }

    /**
     * Deletes a blog by ID.
     * @param {number} id 
     */
    static async deleteBlog(id) {
        await db.execute('DELETE FROM blogs WHERE id=?', [id]);
    }
}

module.exports = BlogService;
