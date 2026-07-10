const axios = require('axios');
const cheerio = require('cheerio');

// A free, headless search engine scraper using DuckDuckGo HTML endpoint
// This helps bypass the need for costly Google Search APIs or Apify for basic queries
async function searchDuckDuckGo(query) {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const results = [];

        $('.result__body').each((i, el) => {
            const title = $(el).find('.result__title .result__a').text().trim();
            const link = $(el).find('.result__title .result__a').attr('href');
            const snippet = $(el).find('.result__snippet').text().trim();

            if (title && link) {
                // DuckDuckGo sometimes wraps links in a redirect
                let actualLink = link;
                if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
                    actualLink = decodeURIComponent(link.split('uddg=')[1].split('&')[0]);
                }
                results.push({ title, link: actualLink, snippet });
            }
        });

        return results;
    } catch (error) {
        console.error(`DuckDuckGo Scraper Error for query "${query}":`, error.message);
        return [];
    }
}

// Target E-Commerce sellers (Amazon, Flipkart) and Social Media (Instagram, FB) directly
async function fetchFreeSocialAndEcomLeads(location, phase) {
    console.log(`Searching FREE Social Media & E-com for ${location}...`);
    
    // We rotate between different target platforms to keep it natural and avoid blocks
    // Added 5 advanced Ninja strategies
    const searchStrategies = [
        { query: `site:instagram.com "store" OR "shop" OR "clinic" "${location}" -site:instagram.com/p/`, type: 'social_business', platform: 'Instagram' },
        { query: `site:facebook.com "about" "contact" "${location}" -site:facebook.com/groups`, type: 'social_business', platform: 'Facebook' },
        { query: `site:amazon.in "seller profile" "${location}"`, type: 'ecommerce_seller', platform: 'Amazon' },
        { query: `site:flipkart.com "seller" "${location}"`, type: 'ecommerce_seller', platform: 'Flipkart' },
        // The 5 Ninja Strategies
        { query: `site:instagram.com "wa.me/" "${location}"`, type: 'whatsapp_lead', platform: 'Instagram' },
        { query: `site:instagram.com "linktr.ee" "${location}"`, type: 'linktree_lead', platform: 'Instagram' },
        { query: `site:justdial.com "${location}"`, type: 'directory_lead', platform: 'JustDial' },
        { query: `site:zomato.com "${location}"`, type: 'zomato_lead', platform: 'Zomato' },
        { query: `site:facebook.com "hiring" "${location}"`, type: 'hiring_lead', platform: 'Facebook' }
    ];

    const strategyObj = searchStrategies[Math.floor(Math.random() * searchStrategies.length)];
    const strategy = strategyObj.query;
    const platform = strategyObj.platform;
    const leadSourceType = strategyObj.type;

    const results = await searchDuckDuckGo(strategy);
    
    const leads = results.map(res => {
        // Clean up title (e.g. "Rahul Electronics - Instagram" -> "Rahul Electronics")
        let cleanName = res.title.split('-')[0].trim().split('|')[0].trim();
        if (cleanName.length < 3) cleanName = "Local " + platform + " Business";

        return {
            name: cleanName,
            amenity: platform === 'Amazon' || platform === 'Flipkart' ? 'ecommerce_seller' : 'business',
            phone: null,
            email: null,
            website: null, // They rely on social/ecom, they need a website!
            address: location,
            social_link: res.link,
            lead_source_type: leadSourceType
        };
    });

    // Filter out generic pages like login/signup
    return leads.filter(l => !l.social_link.includes('login') && !l.social_link.includes('signup') && l.name.length > 2).slice(0, 5);
}

module.exports = {
    fetchFreeSocialAndEcomLeads
};
