const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Validation rules
exports.validateLogin = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

exports.login = (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { username, password } = req.body;

        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(
                { role: 'admin', username: username }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1d' }
            );
            return res.status(200).json({ success: true, token, message: "Login successful!" });
        } else {
            return res.status(401).json({ success: false, message: "Invalid username or password!" });
        }
    } catch (error) {
        next(error);
    }
};
