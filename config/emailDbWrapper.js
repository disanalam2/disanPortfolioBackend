const db = require('./db');

function normalizeParams(params) {
    if (params === undefined) return [];
    if (Array.isArray(params)) return params;
    return [params];
}

const emailDbInstance = {
    // Run is for INSERT, UPDATE, DELETE
    run: async (sql, params = []) => {
        const p = normalizeParams(params);
        const [result] = await db.execute(sql, p);
        return {
            lastID: result.insertId,
            changes: result.affectedRows
        };
    },
    // Get is for fetching a single row
    get: async (sql, params = []) => {
        const p = normalizeParams(params);
        const [rows] = await db.execute(sql, p);
        return rows.length ? rows[0] : undefined;
    },
    // All is for fetching multiple rows
    all: async (sql, params = []) => {
        const p = normalizeParams(params);
        const [rows] = await db.execute(sql, p);
        return rows;
    },
    // Exec is for raw queries without params (often used for schema setup)
    exec: async (sql) => {
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
        for (let stmt of statements) {
            await db.query(stmt);
        }
    },
    // Expose the raw pool if needed
    pool: db
};

async function getDb() {
    return emailDbInstance;
}

module.exports = { getDb };
