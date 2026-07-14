const axios = require('axios');

const INDEXNOW_KEY = 'f63b2a8c7e9145d2b3c4f5e6a7b8c9d0';
const HOST = 'disanalam.me';

const pingIndexNow = async (urlPath) => {
    try {
        // Construct the full absolute URL
        const url = `https://${HOST}${urlPath.startsWith('/') ? urlPath : '/' + urlPath}`;
        
        const payload = {
            host: HOST,
            key: INDEXNOW_KEY,
            keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
            urlList: [url]
        };

        // Submit to IndexNow API (which syndicates to Bing, Yandex, etc.)
        const response = await axios.post('https://api.indexnow.org/indexnow', payload, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });

        console.log(`✅ IndexNow Pinged successfully for ${url} (Status: ${response.status})`);
    } catch (error) {
        console.error(`❌ IndexNow Ping Failed for ${urlPath}:`, error.message);
    }
};

module.exports = { pingIndexNow };
