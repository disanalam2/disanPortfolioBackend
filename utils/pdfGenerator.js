const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateAuditPDF(businessName, websiteIssues) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            
            // Ensure temp directory exists
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }
            
            const fileName = `${businessName.replace(/[^a-zA-Z0-9]/g, '_')}_Audit_Report.pdf`;
            const filePath = path.join(tempDir, fileName);
            const stream = fs.createWriteStream(filePath);
            
            doc.pipe(stream);
            
            // Header
            doc.fillColor('#dc2626')
               .fontSize(24)
               .text('CRITICAL WEBSITE AUDIT REPORT', { align: 'center' });
            doc.moveDown();
            
            // Business Name
            doc.fillColor('#1e293b')
               .fontSize(16)
               .text(`Business Scanned: ${businessName}`, { align: 'center' });
            doc.moveDown(2);
            
            // Introduction
            doc.fontSize(12)
               .text('We ran a performance and conversion scan on your current website and found several critical issues that are currently causing you to lose potential local customers to your competitors.');
            doc.moveDown();
            
            // The Issues Box
            const boxY = doc.y;
            doc.rect(50, boxY, 500, 220).fillAndStroke('#fee2e2', '#ef4444');
            doc.fillColor('#991b1b').text(' IDENTIFIED ISSUES:', 60, boxY + 15, { bold: true });
            doc.moveDown(1);
            
            let issuesText = [];
            try {
                const audit = JSON.parse(websiteIssues);
                if (audit.speed_score !== null && audit.speed_score !== undefined) {
                    issuesText.push(`• Mobile Speed Score: ${audit.speed_score}/100 (Google PageSpeed)`);
                }
                if (audit.lcp && audit.lcp !== 'N/A') {
                    issuesText.push(`• Largest Contentful Paint (LCP): ${audit.lcp}`);
                }
                if (audit.mobile_responsive === false) {
                    issuesText.push(`• Mobile Responsiveness: FAILED (Not optimized for mobile devices)`);
                }
                if (audit.ssl_issue === true) {
                    issuesText.push(`• Security: FAILED (Missing or invalid SSL Certificate)`);
                }
                if (audit.missing_seo === true) {
                    issuesText.push(`• Search Engine Optimization: FAILED (Missing basic Meta tags)`);
                }
                if (audit.is_expired === true) {
                    issuesText.push(`• Domain Status: EXPIRED/DEAD`);
                }
                if (issuesText.length === 0) issuesText.push('• General performance and conversion issues found.');
            } catch (e) {
                issuesText = [websiteIssues || "Slow mobile loading speed, poor SEO structure, and lack of clear Call-To-Action buttons."];
            }

            doc.fillColor('#7f1d1d').text(issuesText.join('\n\n'), {
                width: 480,
                align: 'left'
            });
            
            // Move cursor past the box
            doc.y = boxY + 240;
            
            // The Solution
            doc.fillColor('#1e293b')
               .fontSize(14)
               .text('The Solution', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12)
               .text('A modern, lightning-fast, mobile-optimized website is no longer optional. Our agency specializes in building high-conversion websites that turn casual visitors into paying clients.');
            doc.moveDown(2);
            
            // CTA
            doc.fillColor('#2563eb')
               .fontSize(14)
               .text('Click the link in the email to claim your free consultation and let us fix this for you.', { align: 'center' });
            
            doc.end();
            
            stream.on('finish', () => {
                resolve({ filePath, fileName });
            });
            
            stream.on('error', (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateAuditPDF };
