const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes (600 seconds)

const cacheMiddleware = (req, res, next) => {
    // We only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`⚡ Serving from cache: ${key}`);
        return res.json(cachedResponse);
    } else {
        // Override res.json to store the response in cache before sending
        const originalJson = res.json;
        res.json = (body) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, body);
            }
            originalJson.call(res, body);
        };
        next();
    }
};

const clearCache = (req, res, next) => {
    console.log('🧹 Clearing API cache due to data update...');
    cache.flushAll();
    next();
};

module.exports = { cacheMiddleware, clearCache };
