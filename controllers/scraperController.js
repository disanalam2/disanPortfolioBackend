const axios = require('axios');
const fs = require('fs');
const { getDb } = require('../config/emailDbWrapper');
const { findContactDetailsOnWebsite, deepAuditWebsite } = require('../utils/scraperHelpers');
const { generateColdEmail } = require('../worker/aiDrafter');
const { generateAuditPDF } = require('../utils/pdfGenerator');
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
        
        const processedLeads = [];
        const db = await getDb();
        
        await Promise.all(rawLeads.map(async (lead) => {
            // Check if we already have this business to avoid duplicates
            const existing = await db.get('SELECT id FROM email_leads WHERE business_name = ? LIMIT 1', [lead.business_name]);
            if (existing) return;

            let finalEmail = '';
            let auditReport = null;
            let leadType = 'no_website';

            if (lead.website) {
                // We have a website!
                leadType = 'bad_website'; // Assume bad until proven good
                
                console.log(`Auditing and scraping email for: ${lead.website}`);
                // 1. Try to find email and phone
                const contactData = await findContactDetailsOnWebsite(lead.website);
                finalEmail = contactData.emails;
                if (!lead.phone && contactData.phones) {
                    lead.phone = contactData.phones;
                }
                
                // 2. Audit Website
                const { auditData } = await deepAuditWebsite(lead.website);
                auditReport = auditData;
            }

            // 3. Generate AI Draft
            const drafts = await generateColdEmail(
                lead.business_name, 
                niche, 
                leadType, 
                auditReport ? JSON.stringify(auditReport) : null,
                'A',
                '',
                '',
                lead.rating || null
            );

            // Save to Database
            const insertResult = await db.run(
                `INSERT INTO email_leads (uuid, business_name, address, phone, website, email, source, lead_type, website_issues, email_draft, follow_up_1_draft, follow_up_2_draft, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    require('crypto').randomUUID(),
                    lead.business_name,
                    lead.address,
                    lead.phone,
                    lead.website,
                    finalEmail,
                    lead.source,
                    leadType,
                    auditReport ? JSON.stringify(auditReport) : null,
                    drafts.main,
                    drafts.follow_up_1,
                    drafts.follow_up_2,
                    'draft_ready'
                ]
            );

            processedLeads.push({
                ...lead,
                id: insertResult.lastID,
                email: finalEmail,
                lead_type: leadType,
                audit_report: auditReport
            });
        }));

        res.json({
            message: `Successfully scraped ${processedLeads.length} new leads!`,
            leads: processedLeads
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
        
        const lead = await db.get('SELECT business_name, website_issues FROM email_leads WHERE id = ?', [leadId]);
        if (!lead) {
            return res.status(404).send('Lead not found');
        }
        
        if (!lead.website_issues) {
            return res.status(400).send('No website issues / audit found for this lead.');
        }

        const pdfData = await generateAuditPDF(lead.business_name, lead.website_issues);
        
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
