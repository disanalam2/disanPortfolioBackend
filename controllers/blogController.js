const BlogService = require('../services/blogService');
const { body, validationResult } = require('express-validator');

/**
 * Validation rules for blog endpoints.
 */
exports.validateBlog = [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('slug').notEmpty().withMessage('Slug is required').trim(),
    body('content').notEmpty().withMessage('Content is required'),
    body('summary').optional().isString(),
    body('thumbnail').optional().isString()
];

/**
 * Retrieves all published blogs.
 */
exports.getBlogs = async (req, res, next) => {
    try {
        const blogs = await BlogService.getAllBlogs(false);
        res.status(200).json(blogs);
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieves all blogs (including scheduled ones) for admin.
 */
exports.getAdminBlogs = async (req, res, next) => {
    try {
        const blogs = await BlogService.getAllBlogs(true);
        res.status(200).json(blogs);
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieves a single blog by slug.
 */
exports.getBlogBySlug = async (req, res, next) => {
    try {
        const blog = await BlogService.getBlogBySlug(req.params.slug);
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        res.status(200).json(blog);
    } catch (error) {
        next(error);
    }
};

/**
 * Increments the view count for a single blog by slug.
 */
exports.incrementBlogView = async (req, res, next) => {
    try {
        await BlogService.incrementViewCount(req.params.slug);
        res.status(200).json({ success: true, message: "View counted" });
    } catch (error) {
        next(error);
    }
};

/**
 * Adds a new blog.
 */
exports.addBlog = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const insertId = await BlogService.createBlog(req.body);
        res.status(201).json({ success: true, message: "Blog added successfully!", insertId });
    } catch (error) {
        // Handle duplicate slug
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Slug must be unique." });
        }
        next(error);
    }
};

/**
 * Updates an existing blog.
 */
exports.updateBlog = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        await BlogService.updateBlog(req.params.id, req.body);
        res.status(200).json({ success: true, message: "Blog updated successfully!" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Slug must be unique." });
        }
        next(error);
    }
};

/**
 * Deletes a blog.
 */
exports.deleteBlog = async (req, res, next) => {
    try {
        await BlogService.deleteBlog(req.params.id);
        res.status(200).json({ success: true, message: "Blog deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
