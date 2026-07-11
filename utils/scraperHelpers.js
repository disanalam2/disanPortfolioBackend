const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns');
const { promisify } = require('util');
const resolveDns = promisify(dns.resolve);

// Scrape Website for Maximum Contact Details (Emails & Phones)
const findContactDetailsOnWebsite = async (url) => {
    if (!url) return { emails: '', phones: '' };
    
    let allValidEmails = new Set();
    let allCleanPhones = new Set();
    
    const fullUrl = url.startsWith('http') ? url : `http://${url}`;
    // Base URL without trailing slash for appending paths
    const baseUrl = fullUrl.replace(/\/$/, '');
    
    const pathsToCheck = ['', '/contact', '/contact-us', '/about', '/about-us'];
    
    for (const path of pathsToCheck) {
        try {
            const targetUrl = `${baseUrl}${path}`;
            console.log(`Scraping for contacts on: ${targetUrl}`);
            const response = await axios.get(targetUrl, { timeout: 10000 });
            const html = response.data;
            
            // Extract Emails
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
            const foundEmails = html.match(emailRegex) || [];
            foundEmails.forEach(e => {
                if (!e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('sentry') && !e.includes('wix') && !e.includes('sentry.io')) {
                    allValidEmails.add(e.toLowerCase());
                }
            });
            
            // Extract Phones (Indian + International formats commonly used in contact pages)
            const phoneRegex = /(?:(?:\+|00)91\s*[-\s]?)?(?:\d{10}|\d{5}\s*\d{5}|\d{3}\s*\d{3}\s*\d{4}|\d{4}\s*\d{4}\s*\d{2}|\d{3}-\d{4}-\d{3})/g;
            const foundPhones = html.match(phoneRegex) || [];
            foundPhones.forEach(p => {
                const clean = p.replace(/[^\d+]/g, '');
                if (clean.length >= 10 && clean.length <= 15) {
                    allCleanPhones.add(clean);
                }
            });
            
            // If we found both email and phone, we can stop early to save time
            if (allValidEmails.size > 0 && allCleanPhones.size > 0) {
                break;
            }
        } catch (error) {
            console.log(`Could not scrape contact details from ${baseUrl}${path}:`, error.message);
        }
    }

    return {
        emails: Array.from(allValidEmails).join(', '),
        phones: Array.from(allCleanPhones).join(', ')
    };
};

// Deep Website Audit (PageSpeed & SEO)
const deepAuditWebsite = async (url) => {
    if (!url) return null;
    
    let auditData = {
        speed_score: null,
        lcp: null,
        missing_seo: false,
        ssl_issue: false,
        mobile_responsive: true,
        no_tracking: false,
        is_expired: false,
        is_wp_vulnerable: false
    };

    const fullUrl = url.startsWith('http') ? url : `http://${url}`;

    // A. Google PageSpeed API (Isolated to prevent timeout failing the rest)
    try {
        // Use the existing Google API key from .env to avoid rate limits/blocks
        let apiKeyParam = '';
        if (process.env.GOOGLE_PLACES_API_KEY) {
            const cleanKey = process.env.GOOGLE_PLACES_API_KEY.replace(/['"]/g, '');
            apiKeyParam = `&key=${cleanKey}`;
        }
        
        const pagespeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(fullUrl)}&strategy=mobile${apiKeyParam}`;
        const psResponse = await axios.get(pagespeedUrl, { timeout: 30000 }); // Increased timeout
        
        const lighthouse = psResponse.data.lighthouseResult;
        if (lighthouse) {
            if (lighthouse.categories && lighthouse.categories.performance) {
                auditData.speed_score = Math.round(lighthouse.categories.performance.score * 100);
            }
            const lcpMetric = lighthouse.audits && lighthouse.audits['largest-contentful-paint'];
            auditData.lcp = (lcpMetric && lcpMetric.displayValue) ? lcpMetric.displayValue : 'N/A';
        }
    } catch (psError) {
        console.error(`PageSpeed API failed for ${fullUrl}:`, psError.message);
        
        // Fallback: Custom Speed Test (Response Time / TTFB)
        try {
            console.log(`Running fallback speed test for ${fullUrl}...`);
            const startTime = Date.now();
            await axios.get(fullUrl, { timeout: 10000 });
            const duration = Date.now() - startTime;
            
            // Convert duration to a rough 1-100 score
            // 500ms = 95, 3000ms = 55, 6000ms = 10
            let estimatedScore = 100 - Math.floor((duration / 1000) * 15);
            if (estimatedScore < 10) estimatedScore = 10;
            if (estimatedScore > 99) estimatedScore = 99;
            
            auditData.speed_score = estimatedScore;
            auditData.lcp = `~${(duration / 1000).toFixed(1)}s (Est.)`;
        } catch (fallbackError) {
            auditData.speed_score = null;
            auditData.lcp = null;
        }
    }

    try {
        // B. Basic SEO, Mobile & Tracking Check via Cheerio
        const webResponse = await axios.get(fullUrl, { timeout: 8000 });
        const htmlData = webResponse.data;
        const $ = cheerio.load(htmlData);
        
        const title = $('title').text().trim();
        const description = $('meta[name="description"]').attr('content')?.trim();
        const h1 = $('h1').length > 0;
        
        // A site is missing basic SEO if title/description are missing or too short, or if it lacks an H1 tag.
        if (!title || title.length < 5 || !description || description.length < 10 || !h1) {
            auditData.missing_seo = true;
        }

        // Mobile Responsiveness Check (Viewport tag)
        const viewport = $('meta[name="viewport"]').attr('content');
        if (!viewport || !viewport.includes('width=device-width')) {
            auditData.mobile_responsive = false;
        }

        // Blind Marketing Check (No Pixel/Analytics/GTM)
        if (!htmlData.includes('gtag(') && !htmlData.includes('GoogleAnalyticsObject') && !htmlData.includes('fbq(') && !htmlData.includes('fbevents.js') && !htmlData.includes('GTM-')) {
            auditData.no_tracking = true;
        }

        // Hack-Check (Vulnerability detection for old WordPress)
        const isWordPress = htmlData.includes('/wp-content/') || $('meta[name="generator"]').attr('content')?.toLowerCase().includes('wordpress');
        if (isWordPress) {
            // Assume vulnerable if it's WP and it leaks version (very common for unmaintained sites)
            if (htmlData.includes('ver=4.') || htmlData.includes('ver=5.') || $('meta[name="generator"]').attr('content')?.match(/WordPress (4|5)\./)) {
                auditData.is_wp_vulnerable = true;
            }
        }
        
        // C. SSL Check
        // Check if the final redirected URL is HTTPS, rather than just the initial inputted URL
        const finalUrl = webResponse.request?.res?.responseUrl || webResponse.config?.url || fullUrl;
        if (finalUrl.startsWith('https')) {
            auditData.ssl_issue = false;
        } else {
            auditData.ssl_issue = true;
        }

    } catch (error) {
        console.error(`Audit failed for ${url}:`, error.message);
        
        // The Graveyard Logic (Expired Domain Check)
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message.includes('timeout')) {
            auditData.is_expired = true;
            return { auditData, isBad: true }; // Immediately return as a bad/dead website
        }
        
        // Only set ssl_issue to true if it's an actual certificate error, 
        // or if it's not an HTTPS link.
        if (error.code && (error.code.includes('CERT') || error.code.includes('SSL') || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
            auditData.ssl_issue = true;
        } else {
            auditData.ssl_issue = !url.includes('https');
        }
    }

    // Determine if website is bad enough to pitch
    // If speed score is below 60, missing SEO, SSL issue, broken mobile, no tracking, or WP vulnerable, it's bad
    const isBad = (auditData.speed_score !== null && auditData.speed_score < 60) || 
                  auditData.missing_seo || 
                  auditData.ssl_issue || 
                  !auditData.mobile_responsive || 
                  auditData.no_tracking ||
                  auditData.is_wp_vulnerable;

    return { auditData, isBad };
};

// Custom DNS Domain Checker
const checkDomainAvailability = async (businessName) => {
    if (!businessName) return null;
    
    // Clean name: remove spaces, special chars
    const cleanName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanName.length < 3) return null;
    
    const domainsToCheck = [`${cleanName}.com`, `${cleanName}.in`];
    
    for (const domain of domainsToCheck) {
        try {
            await resolveDns(domain);
            // If it resolves, it is NOT available
        } catch (error) {
            if (error.code === 'ENOTFOUND') {
                return domain; // Returns the first available domain!
            }
        }
    }
    return null;
};

module.exports = {
    findContactDetailsOnWebsite,
    deepAuditWebsite,
    checkDomainAvailability
};
