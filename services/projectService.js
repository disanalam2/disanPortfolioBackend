const db = require('../config/db');

/**
 * Service for handling Project-related database operations.
 */
class ProjectService {
    /**
     * Retrieves all projects from the database.
     * @returns {Promise<Array>} Array of formatted project objects.
     */
    static async getAllProjects() {
        const [rows] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
        return rows.map(proj => ({
            ...proj,
            techStack: proj.techStack ? JSON.parse(proj.techStack) : [],
            media: proj.media ? JSON.parse(proj.media) : []
        }));
    }

    /**
     * Inserts a new project into the database.
     * @param {Object} projectData - The data of the project to insert.
     * @returns {Promise<number>} The ID of the inserted project.
     */
    static async createProject(projectData) {
        const { title, description, problemFaced, techStack, githubLink, githubLinkBackend, liveLink, media } = projectData;
        const techStackStr = JSON.stringify(techStack || []);
        const mediaStr = JSON.stringify(media || []);

        const sql = `INSERT INTO projects (title, description, problemFaced, techStack, githubLink, githubLinkBackend, liveLink, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [title || "", description || "", problemFaced || "", techStackStr, githubLink || "", githubLinkBackend || "", liveLink || "", mediaStr]);
        return result.insertId;
    }

    /**
     * Updates an existing project in the database.
     * @param {number} projectId - The ID of the project to update.
     * @param {Object} projectData - The updated project data.
     */
    static async updateProject(projectId, projectData) {
        const { title, description, problemFaced, techStack, githubLink, githubLinkBackend, liveLink, media } = projectData;
        const techStackStr = JSON.stringify(techStack || []);
        const mediaStr = JSON.stringify(media || []);

        const sql = `UPDATE projects SET title=?, description=?, problemFaced=?, techStack=?, githubLink=?, githubLinkBackend=?, liveLink=?, media=? WHERE id=?`;
        await db.execute(sql, [title || "", description || "", problemFaced || "", techStackStr, githubLink || "", githubLinkBackend || "", liveLink || "", mediaStr, projectId]);
    }

    /**
     * Deletes a project from the database.
     * @param {number} projectId - The ID of the project to delete.
     */
    static async deleteProject(projectId) {
        await db.execute(`DELETE FROM projects WHERE id=?`, [projectId]);
    }
}

module.exports = ProjectService;
