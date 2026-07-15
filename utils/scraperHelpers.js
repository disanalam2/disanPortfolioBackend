const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns');
const https = require('https');
const { promisify } = require('util');
const resolveDns = promisify(dns.resolve);

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};// Scrape Website for Maximum Contact Details (Emails & Phones)
const findContactDetailsOnWebsite = async (url) => {
    if (!url) return { emails: '', phones: '' };
    
    let allValidEmails = new Set();
    let allCleanPhones = new Set();
    
    let fullUrl = url;
    if (fullUrl.startsWith('http://')) {
        fullUrl = fullUrl.replace('http://', 'https://');
    } else if (!fullUrl.startsWith('https://')) {
        fullUrl = `https://${fullUrl}`;
    }
    // Base URL without trailing slash for appending paths
    const baseUrl = fullUrl.replace(/\/$/, '');
    
    const pathsToCheck = ['', '/contact', '/contact-us', '/about', '/about-us'];
    
    for (const path of pathsToCheck) {
        try {
            let targetUrl = `${baseUrl}${path}`;
            console.log(`Scraping for contacts on: ${targetUrl}`);
            let response;
            try {
                response = await axios.get(targetUrl, { timeout: 15000, httpsAgent, headers: browserHeaders });
            } catch (err) {
                if (targetUrl.startsWith('https://')) {
                    console.log(`HTTPS failed for ${targetUrl}, trying HTTP fallback...`);
                    targetUrl = targetUrl.replace('https://', 'http://');
                    response = await axios.get(targetUrl, { timeout: 15000, httpsAgent, headers: browserHeaders });
                } else {
                    throw err;
                }
            }
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
        mobile_speed_score: null,
        desktop_speed_score: null,
        mobile_lcp: null,
        desktop_lcp: null,
        mobile_inp: null,
        desktop_inp: null,
        mobile_fcp: null,
        desktop_fcp: null,
        mobile_cls: null,
        desktop_cls: null,
        mobile_tbt: null,
        desktop_tbt: null,
        missing_seo: false,
        missing_local_seo: false,
        ssl_issue: false,
        mobile_responsive: true,
        no_tracking: false,
        is_expired: false,
        is_wp_vulnerable: false
    };

    let fullUrl = url;
    if (fullUrl.startsWith('http://')) {
        fullUrl = fullUrl.replace('http://', 'https://');
    } else if (!fullUrl.startsWith('https://')) {
        fullUrl = `https://${fullUrl}`;
    }

    // A. Google PageSpeed API (Isolated to prevent timeout failing the rest)
    try {
        let apiKeyParam = '';
        if (process.env.GOOGLE_PLACES_API_KEY) {
            const cleanKey = process.env.GOOGLE_PLACES_API_KEY.replace(/['"]/g, '');
            apiKeyParam = `&key=${cleanKey}`;
        }
        
        const mobileUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(fullUrl)}&strategy=mobile${apiKeyParam}`;
        const desktopUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(fullUrl)}&strategy=desktop${apiKeyParam}`;
        
        // Fetch both concurrently to save time
        const [mobileRes, desktopRes] = await Promise.allSettled([
            axios.get(mobileUrl, { timeout: 30000 }),
            axios.get(desktopUrl, { timeout: 30000 })
        ]);

        if (mobileRes.status === 'fulfilled' && mobileRes.value.data.lighthouseResult) {
            const data = mobileRes.value.data;
            const lighthouse = data.lighthouseResult;
            
            if (lighthouse.categories && lighthouse.categories.performance) {
                auditData.mobile_speed_score = Math.round(lighthouse.categories.performance.score * 100);
            }
            const audits = lighthouse.audits || {};
            auditData.mobile_lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
            auditData.mobile_fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
            auditData.mobile_cls = audits['cumulative-layout-shift']?.displayValue || 'N/A';
            auditData.mobile_tbt = audits['total-blocking-time']?.displayValue || 'N/A';
            
            if (data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT_LATENCY) {
                const cruxInp = data.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT_LATENCY;
                auditData.mobile_inp = `${cruxInp.percentile}ms (${cruxInp.category})`;
            } else {
                auditData.mobile_inp = auditData.mobile_tbt !== 'N/A' ? `${auditData.mobile_tbt} (Est. via TBT)` : 'N/A';
            }
        }

        if (desktopRes.status === 'fulfilled' && desktopRes.value.data.lighthouseResult) {
            const data = desktopRes.value.data;
            const lighthouse = data.lighthouseResult;
            
            if (lighthouse.categories && lighthouse.categories.performance) {
                auditData.desktop_speed_score = Math.round(lighthouse.categories.performance.score * 100);
            }
            const audits = lighthouse.audits || {};
            auditData.desktop_lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
            auditData.desktop_fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
            auditData.desktop_cls = audits['cumulative-layout-shift']?.displayValue || 'N/A';
            auditData.desktop_tbt = audits['total-blocking-time']?.displayValue || 'N/A';
            
            if (data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT_LATENCY) {
                const cruxInp = data.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT_LATENCY;
                auditData.desktop_inp = `${cruxInp.percentile}ms (${cruxInp.category})`;
            } else {
                auditData.desktop_inp = auditData.desktop_tbt !== 'N/A' ? `${auditData.desktop_tbt} (Est. via TBT)` : 'N/A';
            }
        }
        
        // If BOTH failed, throw error to trigger fallback
        if (mobileRes.status === 'rejected' && desktopRes.status === 'rejected') {
            throw new Error('Both Mobile and Desktop PageSpeed API calls failed');
        }

    } catch (psError) {
        console.error(`PageSpeed API failed for ${fullUrl}:`, psError.message);
        
        // Fallback: Custom Speed Test (Response Time / TTFB)
        try {
            console.log(`Running fallback speed test for ${fullUrl}...`);
            const startTime = Date.now();
            try {
                await axios.get(fullUrl, { timeout: 15000, httpsAgent, headers: browserHeaders });
            } catch (err) {
                if (fullUrl.startsWith('https://')) {
                    await axios.get(fullUrl.replace('https://', 'http://'), { timeout: 15000, httpsAgent, headers: browserHeaders });
                } else {
                    throw err;
                }
            }
            const duration = Date.now() - startTime;
            
            // Convert duration to a rough 1-100 score
            // 500ms = 95, 3000ms = 55, 6000ms = 10
            let estimatedScore = 100 - Math.floor((duration / 1000) * 15);
            if (estimatedScore < 10) estimatedScore = 10;
            if (estimatedScore > 99) estimatedScore = 99;
            
            auditData.mobile_speed_score = estimatedScore;
            auditData.desktop_speed_score = estimatedScore; // Use same for fallback
            
            const seconds = duration / 1000;
            auditData.mobile_lcp = `~${seconds.toFixed(1)}s (Est.)`;
            auditData.desktop_lcp = `~${seconds.toFixed(1)}s (Est.)`;
            
            auditData.mobile_inp = 'N/A';
            auditData.desktop_inp = 'N/A';
            auditData.mobile_fcp = 'N/A';
            auditData.desktop_fcp = 'N/A';
            auditData.mobile_cls = 'N/A';
            auditData.desktop_cls = 'N/A';
            
        } catch (fallbackError) {
            auditData.mobile_speed_score = null;
            auditData.desktop_speed_score = null;
            auditData.mobile_lcp = null;
            auditData.desktop_lcp = null;
            auditData.mobile_inp = null;
            auditData.desktop_inp = null;
            auditData.mobile_fcp = null;
            auditData.desktop_fcp = null;
            auditData.mobile_cls = null;
            auditData.desktop_cls = null;
        }
    }

    try {
        // B. Basic SEO, Mobile & Tracking Check via Cheerio
        let webResponse;
        try {
            webResponse = await axios.get(fullUrl, { timeout: 15000, httpsAgent, headers: browserHeaders });
        } catch (err) {
            if (fullUrl.startsWith('https://')) {
                const httpUrl = fullUrl.replace('https://', 'http://');
                webResponse = await axios.get(httpUrl, { timeout: 15000, httpsAgent, headers: browserHeaders });
            } else {
                throw err;
            }
        }
        const htmlData = webResponse.data;
        const $ = cheerio.load(htmlData);
        
        const title = $('title').text().trim();
        const description = $('meta[name="description"]').attr('content')?.trim();
        const h1 = $('h1').length > 0;
        
        // A site is missing basic SEO if title/description are missing or too short, or if it lacks an H1 tag.
        if (!title || title.length < 5 || !description || description.length < 10 || !h1) {
            auditData.missing_seo = true;
        }

        // Local SEO Check (Looking for phone links or Google Maps)
        const hasPhoneLink = $('a[href^="tel:"]').length > 0;
        const hasGoogleMaps = $('iframe[src*="google.com/maps"]').length > 0 || $('a[href*="maps.google.com"]').length > 0;
        
        if (!hasPhoneLink && !hasGoogleMaps) {
            auditData.missing_local_seo = true;
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
    // If mobile or desktop speed score is below 60, missing SEO, SSL issue, broken mobile, no tracking, or WP vulnerable, it's bad
    const isBad = (auditData.mobile_speed_score !== null && auditData.mobile_speed_score < 60) || 
                  (auditData.desktop_speed_score !== null && auditData.desktop_speed_score < 60) ||
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
