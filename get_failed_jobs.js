const db = require('./config/db');

async function checkFailedJobs() {
    try {
        const [rows] = await db.query("SELECT id, type, error, created_at, retries FROM email_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkFailedJobs();
