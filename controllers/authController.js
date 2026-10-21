const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const JWT_ISSUER = process.env.JWT_ISSUER || 'disan-portfolio-backend';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'portfolio-admin';
const JWT_TTL = process.env.JWT_TTL || '1h';

// Validation rules
exports.validateLogin = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { username, password } = req.body;
        const storedHash = process.env.ADMIN_PASSWORD_HASH;
        const plainPassword = process.env.ADMIN_PASSWORD;

        // Security check: Never allow login if credentials are not configured on server
        if (!storedHash && !plainPassword) {
            console.error('CRITICAL: Admin credentials (ADMIN_PASSWORD_HASH or ADMIN_PASSWORD) not configured in .env');
            return res.status(500).json({ success: false, message: "Authentication service misconfigured on server." });
        }

        if (!process.env.ADMIN_USERNAME || username !== process.env.ADMIN_USERNAME) {
            return res.status(401).json({ success: false, message: "Invalid username or password!" });
        }

        let passwordMatches = false;
        if (storedHash) {
            passwordMatches = await bcrypt.compare(password, storedHash);
        } else if (plainPassword) {
            passwordMatches = (password === plainPassword);
        }

        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: "Invalid username or password!" });
        }

        const token = jwt.sign(
            {
                role: 'admin',
                username,
                type: 'admin-token'
            },
            process.env.JWT_SECRET,
            {
                expiresIn: JWT_TTL,
                issuer: JWT_ISSUER,
                audience: JWT_AUDIENCE,
                algorithm: 'HS256'
            }
        );

        return res.status(200).json({ success: true, token, message: "Login successful!" });
    } catch (error) {
        next(error);
    }
};
