const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if credentials match the .env file
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        
        // Credentials sahi hain, toh JWT Token generate karo (jo 1 din tak valid rahega)
        const token = jwt.sign(
            { role: 'admin', username: username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({ success: true, token, message: "Login successful!" });
    } else {
        res.status(401).json({ success: false, message: "Invalid username or password!" });
    }
});

module.exports = router;