const nodemailer = require('nodemailer');
const { getDb } = require('../config/emailDbWrapper');
const { decrypt } = require('./encryption');
const { generateAuditPDF } = require('./pdfGenerator');
const fs = require('fs');

async function sendMailToLead(leadId, customDraft = null, subject = null, isFollowUp = false) {
    const db = await getDb();
    const lead = await db.get('SELECT * FROM email_leads WHERE id = ?', [leadId]);

    if (!lead || !lead.email) {
        throw new Error('Lead not found or missing email address');
    }

    if (lead.is_unsubscribed) {
        throw new Error('Cannot send email: Lead has unsubscribed.');
    }

    const email_draft = customDraft || lead.email_draft;

    // SPAM DETECTION FILTER
    const spamWords = ["100% free", "earn money", "no catch", "make money fast", "urgent", "cash bonus", "nigerian prince", "lottery"];
    const lowercaseDraft = email_draft.toLowerCase();
    for (const word of spamWords) {
        if (lowercaseDraft.includes(word)) {
            throw new Error(`Spam filter triggered by word: "${word}". Email dispatch blocked to protect domain reputation.`);
        }
    }

    let htmlBody = email_draft.replace(/\n/g, '<br>');

    // If it's a mockup/screenshot (and NOT a follow up), embed it
    if (lead.screenshot_url && !isFollowUp) {
        htmlBody += `
            <br><br>
            <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-width: 600px;">
                <div style="background-color: #f1f5f9; padding: 10px; font-weight: bold; font-family: sans-serif; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                    Website Preview / Audit Snapshot
                </div>
                <img src="${lead.screenshot_url}" alt="Website Snapshot" style="width: 100%; height: auto; display: block;" />
            </div>
        `;
    }

    const backendUrl = process.env.API_URL || 'http://localhost:5000';
    
    htmlBody += `
        <br><br>
        <div style="margin-top: 20px;">
            <a href="${backendUrl}/api/track/click/${lead.uuid}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Click Here to View My Portfolio & Contact Me</a>
        </div>
        
        <br><br><br>
        <div style="font-size: 11px; color: #6b7280; margin-top: 40px;">
            You are receiving this email because we identified your business might benefit from our services.<br>
            <a href="${process.env.API_URL || 'http://localhost:5000'}/api/track/unsubscribe/${lead.uuid}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> from future communications.
        </div>
        <img src="${process.env.API_URL || 'http://localhost:5000'}/api/track/open/${lead.uuid}" alt="" style="width: 1px; height: 1px; border: 0; outline: none;" />
    `;

    const finalSubject = subject || (isFollowUp ? `Following up: ${lead.business_name}` : `Grow your business online, ${lead.business_name}`);

    // INTELLIGENT SMTP FALLBACK & ROTATION SYSTEM
    const accounts = await db.all(`
        SELECT * FROM email_accounts 
        WHERE is_active = 1 AND deleted = 0 AND daily_sent_count < 40 
        ORDER BY last_used ASC 
    `);
    
    const hasEnvFallback = (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your_business_email@gmail.com');

    if (accounts.length === 0 && !hasEnvFallback) {
        throw new Error('No email accounts available or daily limit reached for all accounts.');
    }

    let mailSent = false;
    let usedFromEmail = null;
    let lastError = null;
    let usedAccountId = null;

    let attachments = [];
    let pdfData = null;

    if (lead.lead_type === 'bad_website' && lead.website_issues && !isFollowUp) {
        try {
            pdfData = await generateAuditPDF(lead.business_name, lead.website_issues);
            attachments.push({
                filename: pdfData.fileName,
                path: pdfData.filePath
            });
        } catch (err) {
            console.error("Failed to generate PDF audit:", err);
        }
    }

    for (const account of accounts) {
        try {
            const transporter = nodemailer.createTransport({
                host: account.host,
                port: account.port,
                secure: account.port === 465,
                auth: { user: account.email, pass: decrypt(account.password) }
            });
            
            await transporter.sendMail({
                from: account.email,
                to: lead.email,
                subject: finalSubject,
                html: htmlBody,
                text: email_draft,
                attachments: attachments.length > 0 ? attachments : undefined
            });
            
            mailSent = true;
            usedFromEmail = account.email;
            usedAccountId = account.id;
            break; // Success! exit loop
        } catch (err) {
            console.error(`Failed to send via ${account.email}. Falling back... Error:`, err.message);
            lastError = err;
        }
    }

    if (!mailSent && hasEnvFallback) {
        try {
             const transporter = nodemailer.createTransport({
                service: 'gmail', 
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
             });
             
             await transporter.sendMail({
                 from: process.env.EMAIL_USER,
                 to: lead.email,
                 subject: finalSubject,
                 html: htmlBody,
                 text: email_draft,
                 attachments: attachments.length > 0 ? attachments : undefined
             });
             
             mailSent = true;
             usedFromEmail = process.env.EMAIL_USER;
        } catch (err) {
             console.error(`Failed to send via ENV Fallback. Error:`, err.message);
             lastError = err;
        }
    }

    if (!mailSent) {
        // Cleanup PDF if failed
        if (pdfData && fs.existsSync(pdfData.filePath)) {
            fs.unlinkSync(pdfData.filePath);
        }
        throw new Error(`All SMTP accounts failed. Last error: ${lastError?.message}`);
    }

    // Cleanup PDF on success
    if (pdfData && fs.existsSync(pdfData.filePath)) {
        fs.unlinkSync(pdfData.filePath);
    }

    if (usedAccountId) {
        await db.run(
            "UPDATE email_accounts SET daily_sent_count = daily_sent_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?",
            [usedAccountId]
        );
    }
    
    return usedFromEmail;
}

module.exports = { sendMailToLead };
