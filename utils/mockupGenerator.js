const sharp = require('sharp');

/**
 * Generates a premium website mockup image dynamically with the business name.
 * Uses completely free, open-source SVG rendering inside sharp.
 * @param {string} businessName 
 * @returns {Promise<Buffer>} The PNG image buffer
 */
const generateMockupImage = async (businessName) => {
    // Basic sanitization to prevent SVG breaking
    const safeName = (businessName || "Your Business").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const svgTemplate = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="1200" height="630" fill="#0f172a" />
        
        <!-- Browser Window Shadow -->
        <rect x="95" y="45" width="1010" height="540" rx="16" fill="#000000" opacity="0.5" filter="url(#shadow)" />

        <!-- Browser Window Frame -->
        <rect x="100" y="50" width="1000" height="530" rx="12" fill="#1e293b" />
        <!-- Browser Top Bar -->
        <rect x="100" y="50" width="1000" height="40" rx="12" fill="#0f172a" />
        <!-- Browser Dots -->
        <circle cx="130" cy="70" r="6" fill="#ef4444" />
        <circle cx="150" cy="70" r="6" fill="#f59e0b" />
        <circle cx="170" cy="70" r="6" fill="#10b981" />
        
        <!-- Mock Nav Bar -->
        <rect x="130" y="110" width="80" height="15" rx="4" fill="#334155" />
        <rect x="800" y="110" width="40" height="15" rx="4" fill="#334155" />
        <rect x="860" y="110" width="40" height="15" rx="4" fill="#334155" />
        <rect x="920" y="110" width="40" height="15" rx="4" fill="#334155" />
        <rect x="980" y="105" width="90" height="25" rx="6" fill="#3b82f6" />

        <!-- Hero Section Gradient Background -->
        <rect x="150" y="160" width="900" height="380" rx="20" fill="url(#gradient)" opacity="0.15" />
        
        <!-- Dynamic Business Name / Logo Text -->
        <text x="600" y="300" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
            ${safeName}
        </text>
        
        <text x="600" y="370" font-family="system-ui, -apple-system, sans-serif" font-weight="normal" font-size="28" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">
            The Ultimate Digital Experience
        </text>
        
        <!-- Call to Action Button -->
        <rect x="475" y="440" width="250" height="60" rx="30" fill="#3b82f6" />
        <text x="600" y="470" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="22" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
            Book Appointment
        </text>

        <!-- Defs for Gradient & Shadow -->
        <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#8b5cf6" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="10" stdDeviation="15" flood-opacity="0.3"/>
            </filter>
        </defs>
    </svg>
    `;

    // Convert SVG to PNG buffer
    const buffer = await sharp(Buffer.from(svgTemplate))
        .png()
        .toBuffer();
        
    return buffer;
};

module.exports = {
    generateMockupImage
};
