const axios = require('axios');
const fs = require('fs');
const { getDb } = require('../config/emailDbWrapper');
const { findContactDetailsOnWebsite, deepAuditWebsite } = require('../utils/scraperHelpers');
const { generateColdEmail } = require('../worker/aiDrafter');
const { runLeadGenerationJob } = require('../worker/leadGenerator');
const { generateAuditPDF } = require('../utils/pdfGenerator');
const { generateManualAuditReport } = require('../worker/aiDrafter');
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// 1. Scrape Google Places for Local Businesses
const scrapeGooglePlaces = async (query) => {
    if (!GOOGLE_PLACES_API_KEY) {
        throw new Error("Google Places API Key is missing in .env");
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
        const response = await axios.get(url);
        
        if (response.data.status !== 'OK') {
            console.error("Google Places API Error:", response.data);
            return [];
        }

        const results = response.data.results.slice(0, 5); // Limit to 5 for now to avoid long timeouts
        const leads = [];

        // Fetch details for each place to get website and phone number
        for (const place of results) {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,website,formatted_phone_number,formatted_address&key=${GOOGLE_PLACES_API_KEY}`;
            const detailsResponse = await axios.get(detailsUrl);
            
            if (detailsResponse.data.status === 'OK') {
                const details = detailsResponse.data.result;
                leads.push({
                    business_name: details.name,
                    address: details.formatted_address,
                    phone: details.formatted_phone_number || '',
                    website: details.website || '',
                    source: 'Google Places Auto Scraper'
                });
            }
        }

        return leads;
    } catch (error) {
        console.error("Error scraping Google Places:", error.message);
        return [];
    }
};

// Main Controller Function
exports.startScraper = async (req, res) => {
    const { niche, location } = req.body;
    
    if (!niche || !location) {
        return res.status(400).json({ error: "Niche and Location are required." });
    }

    const query = `${niche} in ${location}`;
    
    try {
        console.log(`Starting automated scrape for: ${query}`);
        const rawLeads = await scrapeGooglePlaces(query);
        
        const db = await getDb();
        const { enqueue } = require('../worker/queue');
        
        let enqueuedCount = 0;
        
        for (const lead of rawLeads) {
            // Check if we already have this business to avoid duplicates
            const existing = await db.get('SELECT id FROM email_leads WHERE business_name = ? LIMIT 1', [lead.business_name]);
            if (existing) continue;

            const formattedLead = {
                name: lead.business_name,
                amenity: niche,
                phone: lead.phone,
                email: null,
                website: lead.website,
                address: lead.address,
                place_id: `google_places_auto_${Date.now()}`,
                rating: lead.rating || null,
                lead_source_type: 'google_places_auto'
            };
            
            const phase = formattedLead.website ? 2 : 1;
            
            await enqueue('process_lead', { lead: formattedLead, phase, location });
            enqueuedCount++;
        }

        res.json({
            message: `Successfully found and queued ${enqueuedCount} new leads for processing! Check AI Queue Status to monitor progress.`,
            leads: [] // Processed asynchronously
        });

    } catch (error) {
        console.error("Scraper Controller Error:", error);
        res.status(500).json({ error: "Failed to run scraper. " + error.message });
    }
};

// 4. View PDF Audit Report Inline
exports.viewAuditPDF = async (req, res) => {
    try {
        const { leadId } = req.params;
        const db = await getDb();
        
        const lead = await db.get('SELECT uuid, business_name, website_issues FROM email_leads WHERE id = ?', [leadId]);
        if (!lead) {
            return res.status(404).send('Lead not found');
        }
        
        if (!lead.website_issues) {
            return res.status(400).send('No website issues / audit found for this lead.');
        }

        const videoLink = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/pitch/${lead.uuid}` : `https://disanalam.me/pitch/${lead.uuid}`;
        const pdfData = await generateAuditPDF(lead.business_name, lead.website_issues, videoLink);
        
        // Serve the PDF inline in the browser
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${pdfData.fileName}"`);
        
        const stream = fs.createReadStream(pdfData.filePath);
        stream.pipe(res);
        
        stream.on('end', () => {
            // Delete temp file after serving
            fs.unlink(pdfData.filePath, (err) => {
                if (err) console.error("Failed to delete temp PDF:", err);
            });
        });
        
    } catch (error) {
        console.error("View PDF Error:", error);
        res.status(500).send("Failed to generate PDF. " + error.message);
    }
};

// 5. Trigger Background Lead Generation Job Manually
exports.triggerBackgroundScraper = async (req, res) => {
    try {
        console.log('Manually triggering background lead generation job...');
        runLeadGenerationJob().catch(console.error); // Run async, don't await
        res.json({ message: 'Background scraper started! Check queue status to monitor progress.' });
    } catch (error) {
        console.error("Trigger Error:", error);
        res.status(500).json({ error: "Failed to trigger background job." });
    }
};

// 6. Get AI Queue Status
exports.getQueueStatus = async (req, res) => {
    try {
        const db = await getDb();
        const pending = await db.get("SELECT COUNT(*) as count FROM email_jobs WHERE status = 'pending'");
        const processing = await db.get("SELECT COUNT(*) as count FROM email_jobs WHERE status = 'processing'");
        const failed = await db.get("SELECT COUNT(*) as count FROM email_jobs WHERE status = 'failed'");
        
        res.json({
            pending: pending ? pending.count : 0,
            processing: processing ? processing.count : 0,
            failed: failed ? failed.count : 0
        });
    } catch (error) {
        console.error("Queue Status Error:", error);
        res.status(500).json({ error: "Failed to get queue status." });
    }
};

// 7. Get Auto Scraper Status
exports.getAutoScraperStatus = async (req, res) => {
    try {
        const db = await getDb();
        const state = await db.get('SELECT is_active FROM email_search_state WHERE id = 1');
        res.json({ is_active: state ? state.is_active === 1 : true });
    } catch (error) {
        console.error("Get Status Error:", error);
        res.status(500).json({ error: "Failed to get auto scraper status." });
    }
};

// 8. Toggle Auto Scraper Status
exports.toggleAutoScraperStatus = async (req, res) => {
    try {
        const db = await getDb();
        const state = await db.get('SELECT is_active FROM email_search_state WHERE id = 1');
        const newStatus = state && state.is_active === 1 ? 0 : 1;
        await db.run('UPDATE email_search_state SET is_active = ? WHERE id = 1', [newStatus]);
        res.json({ is_active: newStatus === 1, message: newStatus === 1 ? "Auto Scraper Started" : "Auto Scraper Stopped" });
    } catch (error) {
        console.error("Toggle Status Error:", error);
        res.status(500).json({ error: "Failed to toggle auto scraper status." });
    }
};

// 9. Manual Website Audit
exports.manualAudit = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "Website URL is required." });
        }
        
        console.log(`Manual Audit requested for: ${url}`);
        
        // Audit Website
        const { auditData } = await deepAuditWebsite(url);
        
        if (!auditData) {
            return res.status(400).json({ error: "Could not analyze this website. It might be down or blocking bots." });
        }
        
        // Generate AI Report for the client
        const report = await generateManualAuditReport(url, auditData);
        
        res.json({
            success: true,
            auditData,
            report
        });
        
    } catch (error) {
        console.error("Manual Audit Error:", error);
        res.status(500).json({ error: "Failed to audit website. " + error.message });
    }
};
