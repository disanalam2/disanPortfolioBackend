const ProjectService = require('../services/projectService');
const { body, validationResult } = require('express-validator');
const { pingIndexNow } = require('../utils/indexNow');

/**
 * Validation rules for project endpoints.
 */
exports.validateProject = [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('description').notEmpty().withMessage('Description is required'),
    body('problemFaced').optional().isString().withMessage('problemFaced must be a string'),
    body('techStack').optional().isArray().withMessage('techStack must be an array'),
    body('media').optional().isArray().withMessage('media must be an array')
];

/**
 * Retrieves all projects.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.getProjects = async (req, res, next) => {
    try {
        const formattedProjects = await ProjectService.getAllProjects();
        res.status(200).json(formattedProjects);
    } catch (error) {
        next(error);
    }
};

/**
 * Adds a new project.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.addProject = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const insertId = await ProjectService.createProject(req.body);
        pingIndexNow('/projects');
        res.status(201).json({ success: true, message: "Project added successfully!", insertId });
    } catch (error) {
        next(error);
    }
};

/**
 * Updates an existing project.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.updateProject = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        await ProjectService.updateProject(req.params.id, req.body);
        pingIndexNow('/projects');
        res.status(200).json({ success: true, message: "Project updated successfully!" });
    } catch (error) {
        next(error);
    }
};

/**
 * Deletes a project.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.deleteProject = async (req, res, next) => {
    try {
        await ProjectService.deleteProject(req.params.id);
        pingIndexNow('/projects');
        res.status(200).json({ success: true, message: "Project deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
