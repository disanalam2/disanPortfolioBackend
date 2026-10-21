const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_ISSUER = process.env.JWT_ISSUER || 'disan-portfolio-backend';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'portfolio-admin';

const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "Access Denied! Invalid Authorization header." });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
        return res.status(401).json({ success: false, message: "Access Denied! No token provided." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        });

        if (!verified || verified.type !== 'admin-token' || verified.role !== 'admin') {
            return res.status(401).json({ success: false, message: "Invalid token payload." });
        }

        req.user = verified;
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or Expired Token!" });
    }
};

module.exports = verifyToken;