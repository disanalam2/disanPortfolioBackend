const axios = require('axios');

async function auditWebsite(url) {
    if (!url) return null;
    
    // Ensure URL has http/https
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    try {
        console.log(`Auditing website: ${url}`);
        
        let seoIssues = [];
        let performanceIssues = [];
        let performanceScore = 1.0;
        let isBad = false;

        // 1. Basic SEO Audit (Fetch HTML)
        try {
            const htmlResponse = await axios.get(url, { timeout: 10000 });
            const html = htmlResponse.data.toLowerCase();
            
            if (!html.includes('<h1')) {
                seoIssues.push('Missing H1 heading (bad for SEO)');
            }
            if (!html.includes('<title>') || html.includes('<title></title>')) {
                seoIssues.push('Missing or empty Title tag');
            }
            if (!html.includes('name="description"')) {
                seoIssues.push('Missing Meta Description');
            }
            if (!html.includes('name="viewport"')) {
                seoIssues.push('Not optimized for mobile devices');
            }
            
            if (seoIssues.length >= 2) {
                isBad = true;
            }
        } catch (e) {
            console.log(`Could not fetch HTML for ${url}: ${e.message}`);
        }

        // 2. PageSpeed Audit (Performance)
        try {
            const psiResponse = await axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`);
            const lighthouse = psiResponse.data.lighthouseResult;
            
            if (lighthouse) {
                performanceScore = lighthouse.categories.performance.score;
                if (performanceScore < 0.60) {
                    isBad = true;
                    const audits = lighthouse.audits;
                    performanceIssues = Object.values(audits)
                        .filter(a => a.score !== null && a.score < 0.5 && a.details && a.details.type === 'opportunity')
                        .map(a => a.title)
                        .slice(0, 2);
                }
            }
        } catch (e) {
            console.log(`PageSpeed check failed for ${url}: ${e.message}`);
        }

        const allIssues = [...seoIssues, ...performanceIssues];
        
        if (isBad || allIssues.length > 0) {
            return {
                isBad: true,
                score: Math.round(performanceScore * 100),
                issues: allIssues.length > 0 ? allIssues.join(', ') : 'Slow loading speeds and poor mobile optimization'
            };
        }

        return { isBad: false, score: Math.round(performanceScore * 100) };

    } catch (error) {
        console.error(`Failed to audit ${url}:`, error.message);
        return {
            isBad: true,
            score: 0,
            issues: 'Website is currently down, unresponsive, or returning errors.'
        };
    }
}

module.exports = { auditWebsite };
