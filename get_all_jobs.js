const db = require('./config/db');

async function checkFailedJobs() {
    try {
        const [rows] = await db.query("SELECT * FROM email_jobs");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkFailedJobs();
