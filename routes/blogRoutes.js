const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const verifyToken = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Blogs
 *   description: API endpoints for managing blog articles
 */

/**
 * @swagger
 * /api/blogs:
 *   get:
 *     summary: Retrieve all published blogs
 *     tags: [Blogs]
 *     responses:
 *       200:
 *         description: A list of blogs.
 */
router.get('/', blogController.getBlogs);

/**
 * @swagger
 * /api/blogs/admin:
 *   get:
 *     summary: Retrieve all blogs (including scheduled) for admin
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of blogs.
 *       401:
 *         description: Unauthorized
 */
router.get('/admin', verifyToken, blogController.getAdminBlogs);

/**
 * @swagger
 * /api/blogs/{slug}:
 *   get:
 *     summary: Retrieve a single blog by its slug URL
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The blog slug
 *     responses:
 *       200:
 *         description: Blog object
 *       404:
 *         description: Blog not found
 */
router.get('/:slug', blogController.getBlogBySlug);

/**
 * @swagger
 * /api/blogs/{slug}/view:
 *   post:
 *     summary: Increment view count of a blog
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: View counted
 */
router.post('/:slug/view', blogController.incrementBlogView);

/**
 * @swagger
 * /api/blogs/add:
 *   post:
 *     summary: Add a new blog
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               summary:
 *                 type: string
 *               content:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *     responses:
 *       201:
 *         description: Blog added successfully
 *       400:
 *         description: Validation error or Duplicate slug
 *       401:
 *         description: Unauthorized
 */
router.post('/add', verifyToken, blogController.validateBlog, blogController.addBlog);

/**
 * @swagger
 * /api/blogs/update/{id}:
 *   put:
 *     summary: Update an existing blog
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               summary:
 *                 type: string
 *               content:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Blog updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/update/:id', verifyToken, blogController.validateBlog, blogController.updateBlog);

/**
 * @swagger
 * /api/blogs/delete/{id}:
 *   delete:
 *     summary: Delete a blog permanently
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Blog deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/delete/:id', verifyToken, blogController.deleteBlog);

module.exports = router;

