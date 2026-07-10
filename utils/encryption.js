const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
// Ensure the key is exactly 32 bytes (64 hex characters)
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000', 'hex');

function encrypt(text) {
    if (!text) return text;
    // 12 bytes nonce/IV for GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Store in format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    
    // If it doesn't look like our format, return it as-is (for backward compatibility during migration)
    if (!encryptedText.includes(':')) return encryptedText;
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    
    try {
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (e) {
        console.error('Decryption failed:', e.message);
        return null;
    }
}

module.exports = { encrypt, decrypt };
