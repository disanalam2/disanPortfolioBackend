const { getDb } = require('../config/emailDbWrapper');

// Max retries for a job
const MAX_RETRIES = 3;

/**
 * Enqueue a new job
 * @param {string} type - The job type (e.g., 'audit_and_draft', 'send_email')
 * @param {object} payload - Job data
 */
async function enqueue(type, payload) {
    const db = await getDb();
    const payloadStr = JSON.stringify(payload);
    await db.run(
        'INSERT INTO email_jobs (type, payload, status) VALUES (?, ?, ?)',
        [type, payloadStr, 'pending']
    );
    console.log(`Enqueued job: ${type}`);
}

/**
 * Fetch and lock the next available job
 */
async function getNextJob() {
    const db = await getDb();
    
    // Find pending jobs or jobs that have been locked for too long (e.g., worker crashed)
    // Locked for > 5 minutes is considered dead
    const job = await db.get(`
        SELECT * FROM email_jobs 
        WHERE status = 'pending' 
           OR (status = 'processing' AND locked_until < NOW())
        ORDER BY created_at ASC 
        LIMIT 1
    `);

    if (!job) return null;

    // Lock the job for 5 minutes
    await db.run(`
        UPDATE email_jobs 
        SET status = 'processing', locked_until = DATE_ADD(NOW(), INTERVAL 5 MINUTE)
        WHERE id = ?
    `, [job.id]);

    return {
        ...job,
        payload: JSON.parse(job.payload)
    };
}

/**
 * Mark a job as completed
 */
async function completeJob(id) {
    const db = await getDb();
    await db.run("UPDATE email_jobs SET status = 'completed', locked_until = NULL WHERE id = ?", [id]);
    console.log(`Job ${id} completed successfully.`);
}

/**
 * Mark a job as failed and handle retries
 */
async function failJob(id, retries, errorMessage) {
    const db = await getDb();
    const newRetries = retries + 1;
    
    if (newRetries >= MAX_RETRIES) {
        await db.run(
            "UPDATE email_jobs SET status = 'failed', locked_until = NULL, retries = ?, error = ? WHERE id = ?", 
            [newRetries, String(errorMessage), id]
        );
        console.error(`Job ${id} permanently failed after ${MAX_RETRIES} retries. Error: ${errorMessage}`);
    } else {
        // Retry it later (e.g., in 5 minutes) by resetting it to pending but increasing retries
        await db.run(
            "UPDATE email_jobs SET status = 'pending', locked_until = NULL, retries = ?, error = ? WHERE id = ?", 
            [newRetries, String(errorMessage), id]
        );
        console.warn(`Job ${id} failed. Retrying (${newRetries}/${MAX_RETRIES})... Error: ${errorMessage}`);
    }
}

// Map job types to handler functions
const handlers = {};

function registerHandler(type, handlerFn) {
    handlers[type] = handlerFn;
}

// Improved loop
async function processJobsLoop() {
    console.log('--- SQLite Background Job Worker Started ---');
    
    while (true) {
        let currentJobId = null;
        let currentRetries = 0;
        
        try {
            const job = await getNextJob();
            if (job) {
                currentJobId = job.id;
                currentRetries = job.retries;
                
                console.log(`Processing job ${job.id} of type ${job.type}...`);
                
                const handler = handlers[job.type];
                if (!handler) {
                    throw new Error(`No handler registered for job type: ${job.type}`);
                }

                // Execute the handler
                await handler(job.payload);
                
                // Mark completed
                await completeJob(job.id);

                console.log(`Job ${job.id} done. Waiting 15 seconds before next job to respect API limits...`);
                await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds sleep
            } else {
                // Sleep for 3 seconds if no jobs found
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Job processing error:', error);
            if (currentJobId) {
                await failJob(currentJobId, currentRetries, error.message);
            }
            // Brief sleep after failure
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

module.exports = {
    enqueue,
    registerHandler,
    processJobsLoop
};
