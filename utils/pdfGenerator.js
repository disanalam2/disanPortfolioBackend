const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateAuditPDF(businessName, websiteIssues, videoLink = null) {
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
               .text('We ran a performance and conversion scan on your current website and found several critical issues that are currently causing you to lose valuable traffic and high-ticket buyers to your competitors.');
            doc.moveDown();
            
            // The Issues Box
            const boxY = doc.y;
            doc.rect(50, boxY, 500, 220).fillAndStroke('#fee2e2', '#ef4444');
            doc.fillColor('#991b1b').text(' IDENTIFIED ISSUES:', 60, boxY + 15, { bold: true });
            doc.moveDown(1);
            
            let issuesText = [];
            try {
                const audit = JSON.parse(websiteIssues);
                
                const addMetric = (label, value, isBad) => {
                    if (value !== null && value !== undefined && value !== 'N/A') {
                        issuesText.push(`${isBad ? '[FAIL]' : '[PASS]'} ${label}: ${value}`);
                    }
                };

                addMetric('Mobile Speed', audit.mobile_speed_score ? `${audit.mobile_speed_score}/100` : null, audit.mobile_speed_score < 60);
                addMetric('Desktop Speed', audit.desktop_speed_score ? `${audit.desktop_speed_score}/100` : null, audit.desktop_speed_score < 60);
                
                addMetric('Mobile LCP (Load Time)', audit.mobile_lcp, audit.mobile_lcp && audit.mobile_lcp.includes('>'));
                addMetric('Desktop LCP (Load Time)', audit.desktop_lcp, false);
                
                addMetric('Mobile INP (Interactivity)', audit.mobile_inp, false);
                addMetric('Desktop INP (Interactivity)', audit.desktop_inp, false);
                
                addMetric('Mobile CLS (Visual Stability)', audit.mobile_cls, false);
                addMetric('Desktop CLS (Visual Stability)', audit.desktop_cls, false);

                if (audit.mobile_responsive === false) issuesText.push(`[FAIL] Mobile Responsiveness: Not Optimized`);
                if (audit.ssl_issue === true) issuesText.push(`[FAIL] Security: Missing SSL Certificate`);
                if (audit.missing_seo === true) issuesText.push(`[FAIL] SEO: Missing basic Meta tags`);
                if (audit.is_expired === true) issuesText.push(`[FAIL] Domain: EXPIRED/DEAD`);
                
                if (issuesText.length === 0) issuesText.push('[FAIL] General performance and conversion issues found.');
            } catch (e) {
                issuesText = ["[FAIL] Slow mobile loading speed, poor SEO structure, and lack of clear Call-To-Action buttons."];
            }

            doc.fillColor('#7f1d1d').text(issuesText.join('\n'), {
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
            
            if (videoLink) {
                doc.moveDown(1);
                doc.fillColor('#059669')
                   .fontSize(12)
                   .text(`Watch your custom video audit here: ${videoLink}`, { align: 'center', underline: true, link: videoLink });
            }
            
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
