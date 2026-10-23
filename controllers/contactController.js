const db = require('../config/db');
const { body, validationResult } = require('express-validator');

exports.validateMessage = [
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('message').trim().notEmpty().withMessage('Message cannot be empty').escape(),
    body('subject').optional().trim().escape(),
    body('preference').optional().trim().escape(),
    body('contactHandle').optional().trim().escape(),
    body('websiteUrl').custom((value, { req }) => {
        const servicesRequiringUrl = [
            'Free Technical Performance & SEO Audit',
            'Free System Architecture & Automation Audit',
            'Free Sales Funnel, UX & Tracking Audit',
            'Website Rebuild & Tech Stack Modernization'
        ];
        if (servicesRequiringUrl.includes(req.body.subject) && !value) {
            throw new Error('Website URL is required for this service.');
        }
        if (value) {
            try {
                const url = new URL(value);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    throw new Error('Website URL must use http or https.');
                }
            } catch (error) {
                throw new Error('Website URL is invalid.');
            }
        }
        return true;
    }).optional({ checkFalsy: true }).trim()
];

const nodemailer = require('nodemailer');

const getDynamicReply = (subject) => {
    switch(subject) {
        case 'Frontend & Landing Page Engineering':
            return "Thank you for reaching out! We have received your response regarding frontend and landing page engineering. I will review your project details and goals, and I will try my best to contact you within 24 hours.";
        case 'Full-Stack Web App & API Integration':
            return "Thank you for reaching out! We have received your response regarding your full-stack web application. I am excited to learn more about your vision, and I will try my best to contact you within 24 hours to schedule a discovery discussion.";
        case 'Custom Enterprise Build & Managed Retainer':
            return "Thank you for reaching out! We have received your response regarding a custom enterprise build and managed website retainer. I will review your requirements and will try my best to contact you within 24 hours.";
        case 'Free Technical Performance & SEO Audit':
            return "Thank you for reaching out! We have received your response, and I am analyzing your request. I will review your website's architecture, load times, Core Web Vitals, and search visibility, and I will try my best to contact you within 24 hours.";
        case 'Free System Architecture & Automation Audit':
            return "Thank you for reaching out! We have received your response. I will review your current infrastructure and workflows to identify bottlenecks and automation opportunities, and I will try my best to contact you within 24 hours.";
        case 'Free Sales Funnel, UX & Tracking Audit':
            return "Thank you for reaching out! We have received your response. I will analyze your user journey, conversion funnel, and tracking setups, and I will try my best to contact you within 24 hours.";
        case 'Website Rebuild & Tech Stack Modernization':
            return "Thank you for reaching out! We have received your response regarding modernizing your tech stack and rebuilding your platform. I will review your requirements and will try my best to contact you within 24 hours to discuss your project.";
        case 'Enterprise Custom Web App (New Build)':
            return "Thank you for reaching out! We have received your response regarding your new web application. I am excited to learn more about your vision and will try my best to contact you within 24 hours to schedule a discovery discussion.";
        case 'Complete Digital Infrastructure Overhaul (Full Transformation)':
            return "Thank you for reaching out! We have received your response regarding a digital infrastructure overhaul. I will review your project details and will try my best to contact you within 24 hours to discuss the strategy.";
        default:
            return "Thank you for reaching out! We have received your response and will try our best to contact you within 24 hours.";
    }
};
exports.sendMessage = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, contactHandle, preference, subject, websiteUrl, message } = req.body;

        // Extract real client IP (AWS EC2 / Nginx / Load Balancer) for Section 10A IT Act 2000 Clickwrap Audit Trail
        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.socket?.remoteAddress || 'unknown');

        // 1. Save to Database with real client IP for Legal Audit Trail
        const sql = `INSERT INTO messages (name, email, phone, preference, subject, websiteUrl, message, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [name, email, contactHandle || "", preference || "", subject || null, websiteUrl || null, message, clientIp]);

        // Real-time update using Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.emit('newContact', { 
                id: result.insertId,
                name, 
                email, 
                phone: contactHandle || "", 
                preference: preference || "", 
                subject: subject || null, 
                websiteUrl: websiteUrl || null, 
                message,
                created_at: new Date()
            });
        }

        // 2. Send Response immediately (Don't make user wait for email to send)
        res.status(201).json({ success: true, message: "Message successfully sent to database!" });

        // 3. Send Email Notification asynchronously
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                // Smart SMTP Configuration (Auto-detects Gmail vs Zoho vs Custom SMTP)
                const isGmail = (process.env.EMAIL_SERVICE && process.env.EMAIL_SERVICE.toLowerCase() === 'gmail') ||
                                (process.env.EMAIL_HOST && process.env.EMAIL_HOST.toLowerCase().includes('gmail')) ||
                                (process.env.EMAIL_USER && process.env.EMAIL_USER.toLowerCase().includes('@gmail.com'));

                const emailPass = process.env.EMAIL_PASS 
                    ? process.env.EMAIL_PASS.replace(/\s+/g, '') 
                    : '';

                let transportConfig;
                if (isGmail) {
                    transportConfig = {
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL_USER.trim(),
                            pass: emailPass
                        }
                    };
                } else if (process.env.EMAIL_HOST) {
                    transportConfig = {
                        host: process.env.EMAIL_HOST.trim(),
                        port: parseInt(process.env.EMAIL_PORT, 10) || 465,
                        secure: process.env.EMAIL_SECURE !== 'false',
                        auth: {
                            user: process.env.EMAIL_USER.trim(),
                            pass: emailPass
                        }
                    };
                } else {
                    transportConfig = {
                        host: 'smtp.zoho.in',
                        port: 465,
                        secure: true,
                        auth: {
                            user: process.env.EMAIL_USER.trim(),
                            pass: emailPass
                        }
                    };
                }

                const transporter = nodemailer.createTransport(transportConfig);

                let contactLinkHTML = contactHandle || 'N/A';
                if (preference === 'whatsapp' && contactHandle) {
                    const cleanPhone = contactHandle.replace(/\D/g, '');
                    contactLinkHTML = `<a href="https://wa.me/${cleanPhone}" target="_blank" style="color: #25d366; font-weight: bold; text-decoration: none;">💬 Chat on WhatsApp (${contactHandle})</a>`;
                } else if (preference === 'telegram' && contactHandle) {
                    const tLink = contactHandle.startsWith('http') ? contactHandle : (contactHandle.includes('t.me') ? `https://${contactHandle}` : `https://t.me/${contactHandle.replace('@', '')}`);
                    contactLinkHTML = `<a href="${tLink}" target="_blank" style="color: #0088cc; font-weight: bold; text-decoration: none;">✈️ Chat on Telegram (${contactHandle})</a>`;
                }

                const adminReceiver = process.env.ADMIN_RECEIVER_EMAIL || 'admin@disanalam.me';

                const adminMailOptions = {
                    from: `"Portfolio System" <${process.env.EMAIL_USER.trim()}>`,
                    to: adminReceiver,
                    replyTo: email || adminReceiver,
                    subject: `🔥 New Lead: ${subject || 'Inquiry'} from ${name}`,
                    text: `New Lead Received!\nName: ${name}\nEmail: ${email || 'N/A'}\nPreference: ${preference}\nContact: ${contactHandle}\nSubject: ${subject}\nWebsite: ${websiteUrl}\nMessage: ${message}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9fafb;">
                            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">New Portfolio Lead Received!</h2>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 35%; color: #333;">Name</td>
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff; color: #111;">${name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">Email</td>
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff;"><a href="mailto:${email || ''}" style="color: #2563eb;">${email || 'N/A'}</a></td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">Contact Preference</td>
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff; text-transform: capitalize; color: #111;">${preference || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">Phone / Contact Link</td>
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff; color: #111;">${contactLinkHTML}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">Service Requested</td>
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff; color: #111;">${subject || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">Website URL</td>
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff;">${websiteUrl ? `<a href="${websiteUrl}" target="_blank" style="color: #2563eb;">${websiteUrl}</a>` : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">Client IP (Audit Trail)</td>
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff; color: #111; font-family: monospace;">${clientIp}</td>
                                </tr>
                            </table>

                            <h3 style="color: #333; margin-top: 30px; font-size: 16px;">Project Details / Message:</h3>
                            <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #ddd; white-space: pre-wrap; color: #444; line-height: 1.6; font-size: 14px;">
                                ${message}
                            </div>
                        </div>
                    `
                };

                const nextStepsHTML = `
                    <div style="background-color: #f0fdf4; padding: 18px 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #bbf7d0;">
                        <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 15px; font-weight: 700;">What Happens Next?</h3>
                        <p style="color: #15803d; font-size: 14px; margin: 6px 0; line-height: 1.6;">
                            ✓ <strong>Response Received:</strong> Your message and details have been successfully received.<br/>
                            ✓ <strong>24-Hour Contact:</strong> I will thoroughly review your request and try my best to contact you within 24 hours.<br/>
                            ✓ <strong>Personalized Consultation:</strong> We will connect via your preferred channel to discuss your vision, requirements, and next steps in detail.
                        </p>
                    </div>
                `;

                const plainTextBody = `Hi ${name},\n\n` + 
                                      getDynamicReply(subject).replace(/<[^>]*>?/gm, '') + `\n\n` +
                                      `What Happens Next?\n` +
                                      `- Response Received: Your message and details have been successfully received.\n` +
                                      `- 24-Hour Contact: I will review your request and try my best to contact you within 24 hours.\n` +
                                      `- Personalized Consultation: We will connect to discuss your vision and next steps in detail.\n\n` +
                                      `Your Message Summary:\nSubject: ${subject || 'N/A'}\nDetails: ${message}\n\n` +
                                      `Best regards,\nDisan Alam\nFull-Stack Developer`;

                const userMailOptions = {
                    from: `"Disan Alam" <${process.env.EMAIL_USER.trim()}>`,
                    replyTo: adminReceiver,
                    to: email,
                    subject: `We have received your response - Disan Alam`,
                    text: plainTextBody,
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px;">
                            <h2 style="color: #111827; margin-bottom: 20px;">Hi ${name},</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                ${getDynamicReply(subject)}
                            </p>
                            
                            ${nextStepsHTML}

                            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #f3f4f6;">
                                <h3 style="color: #374151; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Message Summary</h3>
                                <p style="color: #6b7280; font-size: 14px; margin: 8px 0 4px 0;"><strong>Subject:</strong> ${subject || 'N/A'}</p>
                                <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;"><strong>Details:</strong><br/><br/><span style="color: #374151; white-space: pre-wrap;">${message}</span></p>
                            </div>
                            <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
                                If you have any immediate questions, feel free to reply directly to this email or reach out on WhatsApp.
                            </p>
                            <br/>
                            <p style="color: #111827; font-size: 16px; font-weight: bold; margin-bottom: 5px;">Best regards,</p>
                            <p style="color: #4b5563; font-size: 15px; margin-top: 0;">Disan Alam<br/><span style="color: #9ca3af; font-size: 13px;">Full-Stack Developer</span></p>
                        </div>
                    `
                };

                // 1. Dispatch Admin Notification to admin@disanalam.me
                try {
                    await transporter.sendMail(adminMailOptions);
                    console.log(`✅ Admin lead email notification sent to ${adminReceiver}`);
                } catch (adminErr) {
                    console.error(`❌ Failed to send admin lead email to ${adminReceiver}:`, adminErr.message || adminErr);
                }

                // 2. Dispatch User Auto-reply if user provided email
                if (email && email.trim()) {
                    try {
                        await transporter.sendMail(userMailOptions);
                        console.log(`✅ User confirmation email sent to ${email}`);
                    } catch (userErr) {
                        console.error(`❌ Failed to send user confirmation email to ${email}:`, userErr.message || userErr);
                    }
                }
            } catch (emailError) {
                console.error("Failed to setup email transporter:", emailError);
            }
        } else {
            console.warn("⚠️ EMAIL_USER or EMAIL_PASS not configured in .env. Skipping email dispatch.");
        }
    } catch (error) {
        next(error);
    }
};

exports.getMessages = async (req, res, next) => {
    try {
        const [rows] = await db.query(`SELECT * FROM messages ORDER BY created_at DESC`);
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

exports.deleteMessage = async (req, res, next) => {
    try {
        const messageId = req.params.id;

        const sql = `DELETE FROM messages WHERE id = ?`;
        const [result] = await db.execute(sql, [messageId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('deleteContact', messageId);
        }

        res.status(200).json({ success: true, message: "Message deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
