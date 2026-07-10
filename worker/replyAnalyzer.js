const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { getDb } = require('../config/emailDbWrapper');
const { decrypt } = require('../utils/encryption');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkReplies() {
    console.log('🔍 [Smart Inbox] Checking for new replies...');
    const db = await getDb();
    
    // Get all active email accounts
    const accounts = await db.all("SELECT * FROM email_accounts WHERE is_active = 1 AND deleted = 0");
    if (!accounts.length) {
        console.log('No active email accounts found for IMAP sync.');
        return;
    }

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    for (const account of accounts) {
        let client;
        try {
            client = new ImapFlow({
                host: account.host.replace('smtp', 'imap'), // e.g., imap.zoho.in
                port: 993,
                secure: true,
                auth: {
                    user: account.email,
                    pass: decrypt(account.password)
                },
                logger: false
            });

            await client.connect();
            console.log(`✅ Connected to IMAP for ${account.email}`);

            const lock = await client.getMailboxLock('INBOX');
            try {
                // Fetch UNREAD messages
                for await (const msg of client.fetch({ seen: false }, { source: true, envelope: true })) {
                    try {
                        const parsed = await simpleParser(msg.source);
                        const senderEmail = parsed.from.value[0].address;
                        const subject = parsed.subject || 'No Subject';
                        const bodyText = parsed.text ? parsed.text.trim() : '';
                        
                        console.log(`📩 Unread Email from: ${senderEmail}`);
                        
                        // 1. Insert into Unified Master Inbox
                        await db.run(
                            `INSERT INTO email_inbox (account_email, sender_email, subject, body) VALUES (?, ?, ?, ?)`,
                            [account.email, senderEmail, subject, bodyText]
                        );
                        
                        // 2. Check if this sender exists in our leads
                        const lead = await db.get("SELECT * FROM email_leads WHERE email = ?", [senderEmail]);
                        
                        if (lead) {
                            // Trim quoted history from email body
                            // Matches common email history markers like "On [Date], [Name] wrote:", "From:", ">", or "-----Original Message-----"
                            let trimmedBody = bodyText;
                            const historyRegex = /(On\s+.*?\bwrote:)|(>.*)|(From:.*)|(-----Original Message-----)/i;
                            const match = trimmedBody.match(historyRegex);
                            if (match) {
                                trimmedBody = trimmedBody.substring(0, match.index).trim();
                            }
                            
                            // It's a reply from a lead! Let's analyze it with AI.
                            const prompt = `
                            You are an AI sales assistant. Read the following fresh email reply from a client.
                            Determine if the reply is POSITIVE (showing interest, asking for a meeting, asking for details) or NEGATIVE (not interested, stop emailing, unsubscribe, angry).
                            Respond with exactly one word: POSITIVE or NEGATIVE.
                            
                            Email Subject: ${subject}
                            Email Body: ${trimmedBody || bodyText}
                            `;
                            
                            const aiResponse = await model.generateContent(prompt);
                            const sentiment = aiResponse.response.text().trim().toUpperCase();
                            
                            console.log(`🤖 AI analyzed reply from ${senderEmail} as: ${sentiment}`);
                            
                            if (sentiment === 'POSITIVE' || sentiment === 'NEGATIVE') {
                                await db.run(
                                    `UPDATE email_leads SET status = 'replied', conversion_type = ?, last_reply_text = ? WHERE id = ?`,
                                    [sentiment.toLowerCase(), bodyText, lead.id]
                                );
                            }
                        }
                        
                        // Mark as read
                        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
                        
                        // Note: WebSocket emission for this would ideally happen if we had the 'io' instance passed here,
                        // but for a background worker, updating the DB is sufficient. Next time they load the dashboard it's there.
                    } catch (parseErr) {
                        console.error('Failed to parse a message:', parseErr.message);
                    }
                }
            } finally {
                lock.release();
            }
            await client.logout();
        } catch (err) {
            console.error(`❌ Failed IMAP connection for ${account.email}:`, err.message);
        }
    }
}

module.exports = { checkReplies };
