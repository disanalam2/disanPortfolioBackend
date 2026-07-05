const db = require('../config/db');
const { body, validationResult } = require('express-validator');

exports.validateMessage = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
    body('message').notEmpty().withMessage('Message cannot be empty'),
    body('websiteUrl').custom((value, { req }) => {
        if (req.body.subject !== 'Full-Stack Web Development (New Build)' && !value) {
            throw new Error('Website URL is required for this service.');
        }
        return true;
    })
];

const nodemailer = require('nodemailer');

const getDynamicReply = (subject) => {
    switch(subject) {
        case 'Free 2026 Performance Check (Audit Report)':
            return "Thank you for requesting a Free 2026 Performance Check! I will analyze your website's architecture, load times, and Core Web Vitals. You can expect a detailed, completely free audit report within 24-48 hours.";
        case 'Speed Optimization & Performance Fixes (One-Time Project)':
            return "Thanks for reaching out! Speed optimization is crucial for SEO and user retention. I will review your current metrics and get back to you with a strategy to make your site lightning fast. <br/><br/><em>Note: To ensure high quality, speed optimization projects typically start around $99 / ₹7,500, depending on the current state of your codebase.</em>";
        case 'Website Rebuild & Tech Stack Modernization':
            return "Modernizing your tech stack is a great step toward future-proofing your business. I'd love to learn more about your current limitations and discuss how we can rebuild your platform optimally. <br/><br/><em>Note: Full website rebuilds generally start at $299 / ₹20,000, varying based on complexity and scope.</em> Let's schedule a quick call to discuss your vision!";
        case 'Custom Feature or API Integration':
            return "Thanks for sharing your requirements! Custom integrations and feature development are my specialty. I'll review your project details and reach out shortly to discuss technical feasibility. <br/><br/><em>Note: Once I understand the full scope, I will share a tailored quote. Small custom features usually start from $49 / ₹4,000.</em>";
        case 'Full-Stack Web Development (New Build)':
            return "I'm excited to hear about your new project! Building from scratch allows us to lay down a perfect, scalable architecture. I will review your vision and contact you soon to schedule a discovery call. <br/><br/><em>Note: Complete full-stack web builds generally start at $499 / ₹35,000. An exact estimate will be provided after our initial discussion.</em>";
        default:
            return "Thank you for getting in touch! I have received your message and will get back to you as soon as possible.";
    }
};
exports.sendMessage = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, contactHandle, preference, subject, websiteUrl, message } = req.body;

        // 1. Save to Database
        // Note: phone column is used for contactHandle. syncDatabase.js automatically creates subject & websiteUrl.
        const sql = `INSERT INTO messages (name, email, phone, preference, subject, websiteUrl, message) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await db.execute(sql, [name, email, contactHandle || "", preference || "", subject || null, websiteUrl || null, message]);

        // 2. Send Response immediately (Don't make user wait for email to send)
        res.status(201).json({ success: true, message: "Message successfully sent to database!" });

        // 3. Send Email Notification asynchronously
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: 'smtp.zoho.in',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                let contactLinkHTML = contactHandle || 'N/A';
                if (preference === 'whatsapp' && contactHandle) {
                    const cleanPhone = contactHandle.replace(/\D/g, '');
                    contactLinkHTML = `<a href="https://wa.me/${cleanPhone}" target="_blank" style="color: #25d366; font-weight: bold; text-decoration: none;">💬 Chat on WhatsApp (${contactHandle})</a>`;
                } else if (preference === 'telegram' && contactHandle) {
                    const tLink = contactHandle.startsWith('http') ? contactHandle : (contactHandle.includes('t.me') ? `https://${contactHandle}` : `https://t.me/${contactHandle.replace('@', '')}`);
                    contactLinkHTML = `<a href="${tLink}" target="_blank" style="color: #0088cc; font-weight: bold; text-decoration: none;">✈️ Chat on Telegram (${contactHandle})</a>`;
                }

                const adminMailOptions = {
                    from: `"Portfolio System" <${process.env.EMAIL_USER}>`,
                    to: process.env.ADMIN_RECEIVER_EMAIL || process.env.EMAIL_USER,
                    replyTo: email,
                    subject: `🔥 New Lead: ${subject || 'Inquiry'} from ${name}`,
                    text: `New Lead Received!\nName: ${name}\nEmail: ${email}\nPreference: ${preference}\nContact: ${contactHandle}\nSubject: ${subject}\nWebsite: ${websiteUrl}\nMessage: ${message}`,
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
                                    <td style="padding: 12px; border: 1px solid #ddd; background: #fff;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
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
                            </table>

                            <h3 style="color: #333; margin-top: 30px; font-size: 16px;">Project Details / Message:</h3>
                            <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #ddd; white-space: pre-wrap; color: #444; line-height: 1.6; font-size: 14px;">
                                ${message}
                            </div>
                        </div>
                    `
                };

                const isPaidService = subject !== 'Free 2026 Performance Check (Audit Report)';
                
                const paymentTermsHTML = isPaidService ? `
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
                        <h3 style="color: #166534; margin-top: 0; font-size: 15px;">Next Steps & Payment Terms</h3>
                        <p style="color: #15803d; font-size: 14px; margin: 5px 0; line-height: 1.6;">
                            ✓ <strong>Consultation First:</strong> I will contact you shortly to discuss your requirements in detail before starting any work.<br/>
                            ✓ <strong>Pay After Completion:</strong> To ensure your complete satisfaction, payment is only required <em>after</em> the work is successfully completed.<br/>
                            ✓ <strong>Flexible Currency:</strong> You can choose to pay in <strong>USD ($)</strong> or <strong>INR (₹)</strong>, whichever is more convenient for you.
                        </p>
                    </div>
                ` : '';

                const plainTextBody = `Hi ${name},\n\n` + 
                                      getDynamicReply(subject).replace(/<[^>]*>?/gm, '') + `\n\n` +
                                      (isPaidService ? `Next Steps & Payment Terms:\n- Consultation First\n- Pay After Completion\n- Flexible Currency (USD/INR)\n\n` : '') +
                                      `Your Message Summary:\nSubject: ${subject || 'N/A'}\nDetails: ${message}\n\n` +
                                      `Best regards,\nDisan Alam`;

                const userMailOptions = {
                    from: `"Disan Alam" <${process.env.EMAIL_USER}>`,
                    replyTo: process.env.EMAIL_USER,
                    to: email,
                    subject: `Re: ${subject || 'Your Inquiry'} - Disan Alam`,
                    text: plainTextBody,
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px;">
                            <h2 style="color: #111827; margin-bottom: 20px;">Hi ${name},</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                ${getDynamicReply(subject)}
                            </p>
                            
                            ${paymentTermsHTML}

                            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #f3f4f6;">
                                <h3 style="color: #374151; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Message Summary</h3>
                                <p style="color: #6b7280; font-size: 14px; margin: 10px 0 5px 0;"><strong>Subject:</strong> ${subject || 'N/A'}</p>
                                <p style="color: #6b7280; font-size: 14px; margin: 5px 0 15px 0;"><strong>Details:</strong><br/><br/>${message}</p>
                            </div>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                                If you have any immediate questions, feel free to reply directly to this email or reach out on WhatsApp.
                            </p>
                            <br/>
                            <p style="color: #111827; font-size: 16px; font-weight: bold; margin-bottom: 5px;">Best regards,</p>
                            <p style="color: #4b5563; font-size: 16px; margin-top: 0;">Disan Alam<br/><span style="color: #9ca3af; font-size: 14px;">Full-Stack Developer</span></p>
                        </div>
                    `
                };

                // Send both emails in parallel
                await Promise.all([
                    transporter.sendMail(adminMailOptions),
                    transporter.sendMail(userMailOptions)
                ]);
                
                console.log(`Email notifications sent successfully (Admin & User: ${email})`);
            } catch (emailError) {
                console.error("Failed to send email notification:", emailError);
            }
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

        res.status(200).json({ success: true, message: "Message deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
