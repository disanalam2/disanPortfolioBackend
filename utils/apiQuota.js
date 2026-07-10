const fs = require('fs');
const path = require('path');

const QUOTA_FILE = path.join(__dirname, '../data/api_quota.json');

// Default limits to stay securely inside free tiers
const LIMITS = {
    GOOGLE: 100, // Safe under 10k/month
    APIFY: 3,    // Safe under $5/month
    DOMAINS: 10  // Safe under free test limit
};

function initQuotaFile() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    if (!fs.existsSync(QUOTA_FILE)) {
        fs.writeFileSync(QUOTA_FILE, JSON.stringify({}));
    }
}

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function canUseApi(apiName) {
    initQuotaFile();
    let data = {};
    try {
        data = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'));
    } catch (e) {
        data = {};
    }

    const today = getTodayStr();
    if (!data[today]) {
        data[today] = { GOOGLE: 0, APIFY: 0, DOMAINS: 0 };
    }

    const currentCount = data[today][apiName] || 0;
    const limit = LIMITS[apiName] || 0;

    return currentCount < limit;
}

function incrementApiUsage(apiName) {
    initQuotaFile();
    let data = {};
    try {
        data = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'));
    } catch (e) {
        data = {};
    }

    const today = getTodayStr();
    if (!data[today]) {
        data[today] = { GOOGLE: 0, APIFY: 0, DOMAINS: 0 };
    }

    data[today][apiName] = (data[today][apiName] || 0) + 1;
    fs.writeFileSync(QUOTA_FILE, JSON.stringify(data, null, 2));
}

module.exports = { canUseApi, incrementApiUsage };
