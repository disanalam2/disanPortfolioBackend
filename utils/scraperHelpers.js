const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns');
const { promisify } = require('util');
const resolveDns = promisify(dns.resolve);

// Scrape Website for Maximum Contact Details (Emails & Phones)
const findContactDetailsOnWebsite = async (url) => {
    if (!url) return { emails: '', phones: '' };
    try {
        const fullUrl = url.startsWith('http') ? url : `http://${url}`;
        const response = await axios.get(fullUrl, { timeout: 8000 });
        const html = response.data;
        
        // Extract Emails
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
        const foundEmails = html.match(emailRegex) || [];
        const validEmails = [...new Set(foundEmails.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('sentry') && !e.includes('wix') && !e.includes('sentry.io')))];
        
        // Extract Phones (Indian + International formats commonly used in contact pages)
        const phoneRegex = /(?:(?:\+|00)91\s*[-\s]?)?(?:\d{10}|\d{5}\s*\d{5}|\d{3}\s*\d{3}\s*\d{4}|\d{4}\s*\d{4}\s*\d{2}|\d{3}-\d{4}-\d{3})/g;
        const foundPhones = html.match(phoneRegex) || [];
        // Clean up and filter valid length numbers
        const cleanPhones = [...new Set(foundPhones.map(p => p.replace(/[^\d+]/g, '')).filter(p => p.length >= 10))];

        return {
            emails: validEmails.join(', '),
            phones: cleanPhones.join(', ')
        };
    } catch (error) {
        console.log(`Could not scrape contact details from ${url}:`, error.message);
        return { emails: '', phones: '' };
    }
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

    try {
        const fullUrl = url.startsWith('http') ? url : `http://${url}`;
        
        // A. Google PageSpeed API
        const pagespeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(fullUrl)}&strategy=mobile`;
        const psResponse = await axios.get(pagespeedUrl, { timeout: 15000 });
        
        const lighthouse = psResponse.data.lighthouseResult;
        if (lighthouse) {
            auditData.speed_score = lighthouse.categories.performance.score * 100;
            const lcpMetric = lighthouse.audits['largest-contentful-paint'];
            auditData.lcp = lcpMetric ? lcpMetric.displayValue : 'N/A';
        }

        // B. Basic SEO, Mobile & Tracking Check via Cheerio
        const webResponse = await axios.get(fullUrl, { timeout: 8000 });
        const htmlData = webResponse.data;
        const $ = cheerio.load(htmlData);
        
        const title = $('title').text();
        const description = $('meta[name="description"]').attr('content');
        
        if (!title || !description) {
            auditData.missing_seo = true;
        }

        // Mobile Responsiveness Check (Viewport tag)
        const viewport = $('meta[name="viewport"]').attr('content');
        if (!viewport || !viewport.includes('width=device-width')) {
            auditData.mobile_responsive = false;
        }

        // Blind Marketing Check (No Pixel/Analytics)
        if (!htmlData.includes('gtag(') && !htmlData.includes('GoogleAnalyticsObject') && !htmlData.includes('fbq(') && !htmlData.includes('fbevents.js')) {
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
        if (fullUrl.startsWith('https')) {
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
        
        auditData.ssl_issue = true;
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
