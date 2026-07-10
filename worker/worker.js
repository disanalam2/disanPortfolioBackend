const cron = require('node-cron');
const { runLeadGenerationJob, processLeadJob } = require('./leadGenerator');
const { registerHandler, processJobsLoop } = require('./queue');
const { getDb } = require('../config/emailDbWrapper');
const { sendMailToLead } = require('../utils/mailer');
const { decrypt } = require('../utils/encryption');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkReplies } = require('./replyAnalyzer');

// Register Queue Handlers
registerHandler('process_lead', processLeadJob);

function initWorker() {
    // Start the continuous queue processor (runs in the background)
    // This will poll the SQLite jobs table and process jobs like AI drafting one by one
    processJobsLoop().catch(console.error);

// Run the fetching job every 12 hours (or modify as needed)
// This will just fetch new leads from OSM and ENQUEUE them.
cron.schedule('0 */12 * * *', async () => {
    console.log('--- Starting Scheduled Lead Fetching Job ---');
    try {
        await runLeadGenerationJob();
        console.log('--- Lead Fetching Job Completed ---');
    } catch (error) {
        console.error('--- Lead Fetching Job Failed ---', error);
    }
});

// Reset daily email counts at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const db = await getDb();
        await db.run('UPDATE email_accounts SET daily_sent_count = 0');
        console.log('--- Reset daily_sent_count for all email accounts ---');
    } catch (error) {
        console.error('--- Failed to reset daily_sent_count ---', error);
    }
});

// DISPATCH SCHEDULED EMAILS (Runs every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
    try {
        const db = await getDb();
        const leads = await db.all("SELECT * FROM email_leads WHERE status IN ('approved_scheduled', 'follow_up_scheduled') ORDER BY priority_score DESC, created_at ASC");
        
        for (const lead of leads) {
            try {
                // Determine current hour in lead's local time
                const localHourStr = new Date().toLocaleTimeString('en-US', { 
                    timeZone: lead.timezone || 'Asia/Kolkata', 
                    hour: 'numeric', 
                    hour12: false 
                });
                const localHour = parseInt(localHourStr, 10);
                
                // Target window: 9 AM to 11 AM
                if (localHour >= 9 && localHour < 12) {
                    const isFollowUp = lead.status === 'follow_up_scheduled';
                    let draftToUse = lead.email_draft;
                    
                    if (isFollowUp) {
                         draftToUse = lead.follow_up_step === 1 ? lead.follow_up_1_draft : lead.follow_up_2_draft;
                    }
                    
                    console.log(`Dispatching scheduled email to ${lead.email} (Local time: ${localHourStr}:00)`);
                    await sendMailToLead(lead.id, draftToUse, null, isFollowUp);
                    
                    await db.run("UPDATE email_leads SET status = 'emailed', last_contacted_at = CURRENT_TIMESTAMP WHERE id = ?", [lead.id]);
                }
            } catch (err) {
                console.error(`Failed to send scheduled email to ${lead.email}:`, err.message);
                // Hard failure handling: prevent infinite retry loops by marking as failed
                await db.run("UPDATE email_leads SET status = 'failed' WHERE id = ?", [lead.id]);
            }
        }
    } catch (error) {
         console.error('Scheduled dispatch job failed', error);
    }
});

// PREPARE FOLLOW-UPS (Runs every hour)
cron.schedule('0 * * * *', async () => {
    try {
        const db = await getDb();
        // Find leads emailed > 3 days ago, who haven't unsubscribed, replied, or been moved to follow_up already
        // Assuming 'opened' or 'clicked' doesn't stop follow-up unless they replied. We'll use just the time limit for now.
        const leads = await db.all(`
            SELECT * FROM email_leads 
            WHERE status = 'emailed' 
            AND is_unsubscribed = 0 
            AND follow_up_step < 2 
            AND last_contacted_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
        `);
        
        for (const lead of leads) {
            const nextStep = lead.follow_up_step + 1;
            const newStatus = nextStep === 1 ? 'follow_up_1_ready' : 'follow_up_2_ready';
            
            await db.run("UPDATE email_leads SET status = ? WHERE id = ?", [newStatus, lead.id]);
            console.log(`Lead ${lead.email} is ready for Follow Up ${nextStep}`);
        }
    } catch (error) {
        console.error('Follow-up preparation job failed', error);
    }
});

// EMAIL WARM-UP SYSTEM (Runs every 6 hours)
cron.schedule('0 */6 * * *', async () => {
    try {
        const db = await getDb();
        const accounts = await db.all("SELECT * FROM email_accounts WHERE is_active = 1 AND deleted = 0");
        
        if (accounts.length >= 2 && process.env.GEMINI_API_KEY) {
            // Pick two random accounts
            const shuffled = accounts.sort(() => 0.5 - Math.random());
            const sender = shuffled[0];
            const receiver = shuffled[1];
            
            const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `Write a highly realistic, casual email (2-4 sentences) that looks like an ongoing internal company thread. For example, discussing a fake project update, asking for a fake invoice, confirming a meeting time, or sharing a relevant industry link. Do not use any placeholders like [Name] or [Company]. Just start the text immediately. Make it sound extremely natural and human.`;
            const response = await model.generateContent(prompt);
            const body = response.response.text().trim();
            
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: sender.host,
                port: sender.port,
                secure: sender.port === 465,
                auth: { user: sender.email, pass: decrypt(sender.password) }
            });
            
            await transporter.sendMail({
                from: sender.email,
                to: receiver.email,
                subject: 'Quick question',
                text: body
            });
            
            console.log(`Warm-up email sent from ${sender.email} to ${receiver.email}`);
        }
    } catch (error) {
        console.error('Email warm-up job failed', error);
    }
});

// SMART INBOX AI ANALYZER (Runs every 30 minutes)
cron.schedule('*/30 * * * *', async () => {
    try {
        await checkReplies();
    } catch (error) {
        console.error('Smart Inbox analyzer failed', error);
    }
});

    console.log('Background worker initialized. Cron jobs and Job Queue scheduled.');
}

module.exports = {
    triggerManualJob: runLeadGenerationJob,
    initWorker
};
