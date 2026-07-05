const db = require('../config/db');

/**
 * Service for handling Blog database operations.
 */
class BlogService {
    /**
     * Retrieves all blogs.
     * @returns {Promise<Array>} Array of blogs.
     */
    static async getAllBlogs() {
        const [rows] = await db.query('SELECT * FROM blogs ORDER BY created_at DESC');
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
        let { title, slug, summary, content, thumbnail } = blogData;
        slug = this.sanitizeSlug(slug) || this.sanitizeSlug(title);
        const readTime = this.calculateReadTime(content);
        
        const sql = `INSERT INTO blogs (title, slug, summary, content, thumbnail, read_time) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [title, slug, summary || "", content, thumbnail || "", readTime]);
        return result.insertId;
    }

    /**
     * Updates a blog by ID.
     * @param {number} id 
     * @param {Object} blogData 
     */
    static async updateBlog(id, blogData) {
        let { title, slug, summary, content, thumbnail } = blogData;
        slug = this.sanitizeSlug(slug) || this.sanitizeSlug(title);
        const readTime = this.calculateReadTime(content);

        const sql = `UPDATE blogs SET title=?, slug=?, summary=?, content=?, thumbnail=?, read_time=? WHERE id=?`;
        await db.execute(sql, [title, slug, summary || "", content, thumbnail || "", readTime, id]);
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
