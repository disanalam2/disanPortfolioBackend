const axios = require('axios');
const { getDb } = require('../config/emailDbWrapper');
const { generateColdEmail, findBusinessDetails } = require('./aiDrafter');
const { findContactDetailsOnWebsite, deepAuditWebsite, checkDomainAvailability } = require('../utils/scraperHelpers');
const { enqueue } = require('./queue');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { getSearchState, saveSearchState } = require('../config/emailDbWrapper');
const { canUseApi, incrementApiUsage } = require('../utils/apiQuota');
const { fetchFreeSocialAndEcomLeads } = require('../utils/freeSocialScraper');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// The geographical progression sequence
const LOCATIONS = ['Ranchi', 'Jharkhand', 'India', 'Asia', 'World'];

async function fetchLeadsFromOSM(location, phase) {
    console.log(`Fetching leads from OpenStreetMap for ${location} (Phase ${phase})...`);
    
    // Determine the area query
    let areaQuery = '';
    if (location !== 'World') {
        areaQuery = `area[name="${location}"]->.searchArea;`;
    }

    // Phase 1: No website. Phase 2: Has website.
    const websiteFilter = phase === 1 ? '["website"!~"."]' : '["website"]';
    
    // Lifecycle Targets: startups, high-ticket services, wholesalers, big restaurants/hotels
    // B2B Partners: CA, marketing agencies, advertising agencies, designers
    const targetNiches = "dentist|hospital|clinic|lawyer|architect|real_estate|wholesale|distributor|dealer|manufacturer|startup|company|restaurant|hotel|resort|accountant|financial_advice|marketing|advertising_agency|design|seo";

    // For World we don't restrict by area, but we limit heavily to avoid overwhelming Overpass
    const nodeQuery = location === 'World' 
        ? `node["amenity"~"${targetNiches}"]${websiteFilter}(0,-180,90,180);` 
        : `node["amenity"~"${targetNiches}"]${websiteFilter}(area.searchArea);`;

    const query = `
        [out:json][timeout:25];
        ${areaQuery}
        (
          ${nodeQuery}
        );
        out body 10; 
    `;

    try {
        const axiosConfig = {
            headers: { 'User-Agent': 'AutoLeadGenApp/1.0 (contact: admin@example.com)' }
        };
        
        if (process.env.SCRAPER_PROXY_URL) {
            axiosConfig.httpsAgent = new HttpsProxyAgent(process.env.SCRAPER_PROXY_URL);
            console.log('Using Proxy for OSM Scraper');
        }

        const response = await axios.get(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, axiosConfig);
        
        return response.data.elements.map(el => ({
            name: el.tags.name,
            amenity: el.tags.amenity,
            phone: el.tags.phone || null,
            email: el.tags.email || null,
            website: el.tags.website || null,
            address: `${el.tags['addr:housenumber'] || ''} ${el.tags['addr:street'] || ''} ${el.tags['addr:city'] || ''}`.trim(),
        })).filter(lead => lead.name);

    } catch (error) {
        console.error(`Error fetching from Overpass API for ${location}:`, error.message);
        return [];
    }
}

async function advanceSearchState(db, currentState) {
    let { current_location_index, current_phase } = currentState;
    
    if (current_phase === 1) {
        // Move to phase 2 in the same location
        current_phase = 2;
    } else {
        // Move to phase 1 in the NEXT location
        current_phase = 1;
        current_location_index++;
    }

    // If we finished the world, loop back to the start (or stop)
    if (current_location_index >= LOCATIONS.length) {
        current_location_index = 0;
    }

    await db.run(
        'UPDATE email_search_state SET current_location_index = ?, current_phase = ? WHERE id = 1',
        [current_location_index, current_phase]
    );
    console.log(`State advanced to: Location ${LOCATIONS[current_location_index]}, Phase ${current_phase}`);
}

async function fetchLeadsFromGooglePlaces(location, phase) {
    console.log(`Fetching leads from Google Places API for ${location} (Phase ${phase})...`);
    try {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        const targetQueries = ["dentists in", "lawyers in", "architects in", "real estate agents in", "wholesalers in", "restaurants in", "startups in"];
        // Pick a random query to keep things varied
        const query = targetQueries[Math.floor(Math.random() * targetQueries.length)] + " " + location;
        
        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json`, {
            params: {
                query: query,
                key: apiKey
            }
        });

        incrementApiUsage('GOOGLE');

        const results = response.data.results || [];
        
        const mappedLeads = results.map(el => ({
            name: el.name,
            amenity: el.types ? el.types[0] : 'business',
            phone: null, // textsearch doesn't always return phone/website without Place Details API
            email: null,
            website: null,
            address: el.formatted_address,
            place_id: el.place_id,
            rating: el.rating
        }));

        // We can't filter by "has_website" natively in textsearch without details API. 
        // We'll let aiDrafter.js do the deep verification.
        return mappedLeads;
    } catch (error) {
        console.error(`Error fetching from Google Places API for ${location}:`, error.message);
        return [];
    }
}

async function fetchLeadsFromDomains(location) {
    console.log(`Fetching leads from Newly Registered Domains (WhoisXML API) for ${location}...`);
    try {
        const apiKey = process.env.WHOIS_API_KEY;
        // Mocking the architecture for the API call
        // const response = await axios.get(`https://newly-registered-domains.whoisxmlapi.com/api/v1?apiKey=${apiKey}&outputFormat=JSON`);
        // We simulate returning placeholder data that aiDrafter will process
        console.log("WHOIS API called. Returning domain leads...");
        incrementApiUsage('DOMAINS');
        return [
            {
                name: "New Local Business (Domain Just Registered)",
                amenity: 'startup',
                phone: null,
                email: null,
                website: "www.recently-bought-domain-placeholder.com",
                address: location,
                place_id: "domain_lead",
                rating: null,
                lead_source_type: "new_domain"
            }
        ];
    } catch (error) {
        console.error("Error fetching domains:", error.message);
        return [];
    }
}

async function fetchLeadsFromFBAds(location) {
    console.log(`Fetching leads from Facebook Ads Library (Apify) for ${location}...`);
    try {
        const apiKey = process.env.APIFY_API_KEY;
        // Mocking the architecture for Apify Meta Ads Scraper
        console.log("Apify FB Ads Scraper called. Returning FB Ads leads...");
        incrementApiUsage('APIFY');
        return [
            {
                name: "FB Advertiser (No Website Destination)",
                amenity: 'business',
                phone: null,
                email: null,
                website: "https://wa.me/placeholder_number", // They are sending traffic to WhatsApp
                address: location,
                place_id: "fb_ad_lead",
                rating: null,
                lead_source_type: "fb_ad"
            }
        ];
    } catch (error) {
        console.error("Error fetching FB Ads:", error.message);
        return [];
    }
}

async function fetchLeadsFromFunding(location) {
    console.log(`Fetching recently funded startups via Free Google News RSS for ${location}...`);
    try {
        const query = encodeURIComponent(`"seed funding" OR "raised" startup ${location !== 'World' ? location : ''}`);
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
        
        const response = await axios.get(rssUrl);
        const xml = response.data;
        
        // Very basic regex to extract titles (since we want 0 dependencies like xml2js if possible)
        const titles = [];
        const titleMatches = xml.matchAll(/<title>(.*?)<\/title>/g);
        for (const match of titleMatches) {
            let title = match[1];
            if (!title.includes('Google News') && title.toLowerCase().includes('funding') || title.toLowerCase().includes('raised')) {
                // Try to extract the company name. Usually it's "StartupName raises $X million..."
                let companyName = title.split(' raises ')[0].split(' secures ')[0].split(' gets ')[0].trim();
                // Clean up source name from title (e.g., "- TechCrunch")
                companyName = companyName.split(' - ')[0].trim();
                if (companyName.length > 2 && companyName.length < 30 && !companyName.includes('http')) {
                    titles.push(companyName);
                }
            }
        }
        
        // Deduplicate
        const uniqueCompanies = [...new Set(titles)].slice(0, 5); // Take top 5 recent funded startups
        
        return uniqueCompanies.map((name, index) => ({
            name: name,
            amenity: 'startup',
            phone: null,
            email: null,
            website: null,
            address: location,
            place_id: `funded_startup_${Date.now()}_${index}`,
            rating: null,
            lead_source_type: "funded_startup"
        }));
    } catch (error) {
        console.error("Error fetching Funded Startups via RSS:", error.message);
        return [];
    }
}

async function fetchLeads(location, phase) {
    // WATERFALL STRATEGY: Prioritize Free Sources, Fallback to Paid API
    
    // 1. Try Free Social & Ecom Scraper (Highest ROI, 0 API Cost)
    console.log(`[Waterfall Step 1] Trying Free Social/E-Com Scraper for ${location}`);
    const socialLeads = await fetchFreeSocialAndEcomLeads(location, phase);
    if (socialLeads && socialLeads.length > 0) {
        console.log(`Successfully found ${socialLeads.length} leads via Free Social Scraper!`);
        return socialLeads;
    }
    
    // 2. Try Free Google News RSS for Funded Startups
    console.log(`[Waterfall Step 2] Trying Free Google News RSS for Funded Startups in ${location}`);
    const fundedLeads = await fetchLeadsFromFunding(location);
    if (fundedLeads && fundedLeads.length > 0) {
        console.log(`Successfully found ${fundedLeads.length} leads via Free Google News RSS!`);
        return fundedLeads;
    }
    
    // 3. Try OpenStreetMap (100% Free Maps)
    console.log(`[Waterfall Step 3] Social & Funding failed/empty. Trying Free OpenStreetMap for ${location}`);
    const osmLeads = await fetchLeadsFromOSM(location, phase);
    if (osmLeads && osmLeads.length > 0) {
        console.log(`Successfully found ${osmLeads.length} leads via Free OSM!`);
        return osmLeads;
    }

    // 3. Fallback to Google Places (Uses Free $200 Tier slowly)
    if (process.env.GOOGLE_PLACES_API_KEY && canUseApi('GOOGLE')) {
        console.log(`[Waterfall Step 3] OSM failed/empty. Falling back to Google Places API for ${location}`);
        const googleLeads = await fetchLeadsFromGooglePlaces(location, phase);
        if (googleLeads && googleLeads.length > 0) {
            return googleLeads;
        }
    }
    
    console.log(`[Waterfall] All sources exhausted for ${location}. Returning empty.`);
    return [];
}

async function runLeadGenerationJob() {
    const db = await getDb();
    
    // 1. Get current search state
    const state = await db.get('SELECT * FROM email_search_state WHERE id = 1');
    const location = LOCATIONS[state.current_location_index];
    const phase = state.current_phase; // 1 = No Website, 2 = Bad Website

    console.log(`--- Fetching Leads in ${location} (Phase ${phase}) to Queue ---`);

    const leads = await fetchLeads(location, phase);
    
    if (leads.length === 0) {
        console.log(`No leads found for ${location} (Phase ${phase}). Advancing state...`);
        await advanceSearchState(db, state);
        return; // Next cron job will pick up the new state
    }

    let enqueuedCount = 0;

    for (const lead of leads) {
        // Check if lead already exists in DB to prevent duplicates
        const existing = await db.get('SELECT id FROM email_leads WHERE business_name = ?', [lead.name]);
        if (existing) {
            continue; // Skip if already in DB
        }

        // Enqueue the job for detailed processing instead of doing it inline
        await enqueue('process_lead', { lead, phase, location });
        enqueuedCount++;
    }

    if (enqueuedCount === 0) {
        console.log(`Exhausted new leads in ${location} (Phase ${phase}). Advancing state...`);
        await advanceSearchState(db, state);
    } else {
        console.log(`Enqueued ${enqueuedCount} leads for processing.`);
    }
}

/**
 * Worker Handler to process a single lead (auditing, AI data enrichment, AI drafting)
 */
async function processLeadJob(payload) {
    const { lead, phase, location } = payload;
    const db = await getDb();

    // Double check it wasn't added since enqueuing
    const existing = await db.get('SELECT id FROM email_leads WHERE business_name = ?', [lead.name]);
    if (existing) {
        console.log(`Job skipped: ${lead.name} is already in DB.`);
        return;
    }

    let leadType = 'no_website';
    let websiteIssues = null;
    let screenshotUrl = null;

    // Detect if the provided website is actually a social link (No Website)
    const isSocialWebsite = (url) => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        const socialLinks = ['facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'linktr.ee', 'wa.me'];
        return socialLinks.some(s => lowerUrl.includes(s));
    };

    // Detect if they are using a free domain (Has Website, but bad)
    const isFreeDomain = (url) => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        const freeDomains = ['.blogspot.com', '.wordpress.com', '.wixsite.com', '.business.site', '.weebly.com'];
        return freeDomains.some(d => lowerUrl.includes(d));
    };

    // Force No-Website phase if they are using a social media link instead of a real website
    if (lead.website && isSocialWebsite(lead.website)) {
        phase = 1;
        lead.lead_source_type = 'social_link_as_website';
    }

    // Assign specific tags for free domains (kept in Phase 2 for auditing)
    let isFreeDomainFlag = false;
    if (lead.website && isFreeDomain(lead.website)) {
        isFreeDomainFlag = true;
        if (lead.website.toLowerCase().includes('.business.site')) {
            lead.lead_source_type = 'google_business_site_lead';
        } else {
            lead.lead_source_type = 'free_domain_lead';
        }
    }

    // Phase 2 Logic: Automated Website Auditing
    if (phase === 2 && lead.website) {
        console.log(`Auditing website: ${lead.website}`);
        const { auditData, isBad } = await deepAuditWebsite(lead.website);
        
        // If it's a free domain, we force it to be considered a bad website even if it's fast
        if (!isBad && !isFreeDomainFlag) {
            console.log(`Job skipped: ${lead.name}, website performance is good.`);
            return; 
        }
        
        leadType = 'bad_website';
        
        if (auditData.is_expired) {
            lead.lead_source_type = 'expired_domain_lead';
            auditData.issues = "Website domain has expired or is dead";
        } else if (isFreeDomainFlag) {
            auditData.issues = "Using unprofessional free domain";
            auditData.is_free_domain = true;
        }

        websiteIssues = JSON.stringify(auditData); // Save as JSON string!
        screenshotUrl = `https://image.thum.io/get/width/600/crop/800/${lead.website}`;
    } else {
        // Phase 1: No Website -> Generate AI Mockup Snapshot
        const encodedName = encodeURIComponent(lead.name);
        // Replace with actual production domain when deployed
        screenshotUrl = `https://image.thum.io/get/width/600/crop/800/https://disanalam.me/api/mockup/${encodedName}`;
    }

    let leadEmail = lead.email;
    let leadPhone = lead.phone;
    let timezone = 'Asia/Kolkata';
    let socialMediaContext = '';
    let intentAnalysis = '';
    
    // Attempt 1: Direct Website Scrape (Fast & Free)
    if (!leadEmail && lead.website) {
        console.log(`Searching website directly for contact details...`);
        const { emails, phones } = await findContactDetailsOnWebsite(lead.website);
        leadEmail = emails || leadEmail;
        leadPhone = phones || leadPhone;
    }
    
    let decisionMakerName = null;
    
    // Attempt 2: AI Web Search (Deep dive)
    if (!leadEmail) {
        console.log(`Searching the web for exact details of ${lead.name}...`);
        const details = await findBusinessDetails(lead.name, lead.address);
        leadEmail = details.email;
        leadPhone = leadPhone || details.phone;
        timezone = details.timezone || 'Asia/Kolkata';
        socialMediaContext = details.social_media_context || '';
        intentAnalysis = details.intent_analysis || '';
        decisionMakerName = details.decision_maker_name || null;
    }

    if (!leadEmail && !leadPhone) {
        const failedUuid = crypto.randomUUID();
        await db.run(
            `INSERT INTO email_leads (
                uuid, business_name, niche, address, website, source, status, priority_score
            ) VALUES (?, ?, ?, ?, ?, ?, 'failed_no_contact', -1)`,
            [failedUuid, lead.name, lead.amenity, lead.address, lead.website, "Failed Contact Extraction"]
        );
        console.log(`Job failed gracefully. No contact found for ${lead.name}. Saved to dashboard for manual review.`);
        return;
    }

    // Check if they previously contacted via portfolio form
    if (leadEmail) {
        // We use the raw pool to query messages table (which is part of the portfolio db)
        const [contacted] = await db.pool.query('SELECT id FROM messages WHERE email = ?', [leadEmail]);
        if (contacted && contacted.length > 0) {
            console.log(`Job skipped: ${leadEmail} has already submitted a contact form.`);
            return;
        }

        // Also ensure they haven't unsubscribed in the past
        const unsubscribed = await db.get('SELECT id FROM email_leads WHERE email = ? AND is_unsubscribed = 1', [leadEmail]);
        if (unsubscribed) {
            console.log(`Job skipped: ${leadEmail} has unsubscribed.`);
            return;
        }
    }

    const niche = lead.amenity;
    const abVersion = Math.random() < 0.5 ? 'A' : 'B';

    console.log(`Drafting emails for ${lead.name}...`);
    const sourceName = lead.lead_source_type === 'new_domain' ? `WHOIS Domains API` :
                       lead.lead_source_type === 'fb_ad' ? `Meta Ads Library API` :
                       lead.lead_source_type === 'funded_startup' ? `Crunchbase Funding API` :
                       process.env.GOOGLE_PLACES_API_KEY ? `Google Places (${location})` : 
                       `Overpass API (${location})`;

    // Generate Cold Email via AI Drafter
    // The Review Multiplier Check (Premium Offline Lead)
    if (phase === 1 && lead.rating && parseFloat(lead.rating) >= 4.2 && lead.user_ratings_total && parseInt(lead.user_ratings_total) >= 100) {
        lead.lead_source_type = 'premium_offline_lead';
    }

    // We pass the lead_source_type inside socialMediaContext so AI knows the origin.
    const contextPrefix = lead.lead_source_type === 'new_domain' ? '[NEW DOMAIN LEAD] ' :
                          lead.lead_source_type === 'fb_ad' ? '[FB AD LEAD] ' : 
                          lead.lead_source_type === 'funded_startup' ? '[FUNDED STARTUP LEAD] ' : 
                          lead.lead_source_type === 'whatsapp_lead' ? '[WHATSAPP LEAD] ' :
                          lead.lead_source_type === 'linktree_lead' ? '[LINKTREE LEAD] ' :
                          lead.lead_source_type === 'directory_lead' ? '[DIRECTORY LEAD] ' :
                          lead.lead_source_type === 'zomato_lead' ? '[ZOMATO LEAD] ' :
                          lead.lead_source_type === 'hiring_lead' ? '[HIRING LEAD] ' : 
                          lead.lead_source_type === 'google_business_site_lead' ? '[GOOGLE BUSINESS SITE LEAD] ' : 
                          lead.lead_source_type === 'free_domain_lead' ? '[FREE DOMAIN LEAD] ' : 
                          lead.lead_source_type === 'social_link_as_website' ? '[SOCIAL LINK AS WEBSITE LEAD] ' : 
                          lead.lead_source_type === 'expired_domain_lead' ? '[EXPIRED DOMAIN LEAD] ' : 
                          lead.lead_source_type === 'premium_offline_lead' ? '[PREMIUM OFFLINE LEAD] ' : '';

    const leadUuid = crypto.randomUUID();
    const dynamicVideoLink = `https://disanalam.me/pitch/${leadUuid}`;
    
    // Add instruction to include dynamic links
    const videoContext = `CRITICAL: You MUST include this exact link in the email where they can watch their video audit: ${dynamicVideoLink}`;

    // Psychological Triggers (Phase 1 Only: No Website)
    let availableDomain = null;
    let competitors = [];
    
    if (phase === 1 || lead.lead_source_type === 'expired_domain_lead' || lead.lead_source_type === 'social_link_as_website') {
        // The Domain Hijack Warning
        availableDomain = await checkDomainAvailability(lead.name);
        
        // The FOMO Generator (Find 2 competitors with websites)
        if (niche) {
            try {
                const compRows = await db.pool.query(
                    "SELECT business_name FROM email_leads WHERE niche = ? AND website IS NOT NULL AND website != '' AND business_name != ? LIMIT 2", 
                    [niche, lead.name]
                );
                if (compRows && compRows[0] && compRows[0].length > 0) {
                    competitors = compRows[0].map(r => r.business_name);
                }
            } catch (e) {
                console.log("Could not fetch competitors for FOMO:", e.message);
            }
        }
    }

    const drafts = await generateColdEmail(lead.name, niche, leadType, websiteIssues, abVersion, contextPrefix + socialMediaContext + ". " + videoContext, intentAnalysis, lead.rating, screenshotUrl, availableDomain, competitors, decisionMakerName);

    // FORCE append the links to ensure Gemini didn't miss them
    const linkAppendix = `\n\n---\n📽️ Watch your custom video audit here: ${dynamicVideoLink}`;
    drafts.main = (drafts.main || '') + linkAppendix;
    if (drafts.follow_up_1) drafts.follow_up_1 += linkAppendix;
    if (drafts.follow_up_2) drafts.follow_up_2 += linkAppendix;

    let priorityScore = 0;
    const highValueNiches = ['dentist', 'lawyer', 'surgeon', 'real estate', 'saas', 'wholesaler', 'dealer', 'distributor', 'manufacturer', 'clinic', 'hospital'];
    const nicheLower = (niche || '').toLowerCase();
    const nameLower = (lead.name || '').toLowerCase();
    if (highValueNiches.some(n => nicheLower.includes(n) || nameLower.includes(n))) {
        priorityScore += 30;
    }
    if (lead.lead_source_type === 'new_domain' || lead.lead_source_type === 'fb_ad' || lead.lead_source_type === 'funded_startup') {
        priorityScore += 25;
    }
    
    // MASSIVE priority boosts for God-Tier logic
    if (lead.lead_source_type === 'expired_domain_lead') {
        priorityScore += 200;
    }
    if (lead.lead_source_type === 'premium_offline_lead') {
        priorityScore += 150;
    }
    const socialAndEcomTags = ['whatsapp_lead', 'linktree_lead', 'directory_lead', 'zomato_lead', 'hiring_lead', 'social_link_as_website', 'ecommerce_seller', 'google_business_site_lead', 'free_domain_lead'];
    if (socialAndEcomTags.includes(lead.lead_source_type)) {
        priorityScore += 150;
    }

    if (leadType === 'no_website' || leadType === 'bad_website') {
        priorityScore += 20;
    }
    // General rating boost
    if (lead.rating && parseFloat(lead.rating) < 4.0 && lead.lead_source_type !== 'premium_offline_lead') {
        priorityScore += 15;
    }

    // Save to DB
    await db.run(
        `INSERT INTO email_leads (
            uuid, business_name, niche, address, email, phone, website, source, 
            email_draft, follow_up_1_draft, follow_up_2_draft, 
            lead_type, website_issues, screenshot_url, ab_version, 
            timezone, social_media_context, intent_analysis, priority_score
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            leadUuid, lead.name, niche, lead.address, leadEmail, leadPhone, lead.website, sourceName, 
            drafts.main, drafts.follow_up_1, drafts.follow_up_2, 
            leadType, websiteIssues, screenshotUrl, abVersion, 
            timezone, socialMediaContext, intentAnalysis, priorityScore
        ]
    );
    console.log(`Successfully processed and saved lead: ${lead.name} (UUID: ${leadUuid})`);
}

module.exports = {
    runLeadGenerationJob,
    processLeadJob
};
